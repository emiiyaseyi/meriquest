import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { notify } from "../notices/service";
import { recordEvent } from "../game/missions";
import { dayKey } from "@/lib/game";
import { choiceOrder, drawTasks, opensAt, shiftPay, type ShiftRecord, type ShiftSettings, type ShiftTaskDef, type Verdict } from "@/lib/shift";

type Cfg = Awaited<ReturnType<typeof getConfig<"shifts">>>;

export interface ShiftTaskView {
  index: number;
  id: string;
  title: string;
  opensAt: number;
  state: "locked" | "open" | "done";
  /** Only for a situation that has appeared. */
  story?: string;
  /** The choices in the order this person sees them (no answers). */
  choices?: string[];
  result?: { verdict: Verdict; chosen: string; feedback: string };
}

export interface ShiftView {
  minutes: number;
  today: { count: number; max: number };
  active: null | {
    startedAt: number;
    endsAt: number;
    tasks: ShiftTaskView[];
    answered: number;
    /** True once the shift time is up, so it can be finished and paid. */
    canFinish: boolean;
  };
}

export type ShiftResult = { ok: true; view: ShiftView; message: string; verdict?: Verdict; feedback?: string } | { ok: false; error: string };

const byIdOf = (cfg: Cfg) => new Map<string, ShiftTaskDef>((cfg.tasks as ShiftTaskDef[]).map((t) => [t.id, t]));

function viewOf(p: PlayerRecord, cfg: Cfg, tz: string, now: number): ShiftView {
  const today = dayKey(now, tz);
  const count = p.shiftDay?.day === today ? p.shiftDay.count : 0;
  const base: ShiftView = { minutes: cfg.settings.minutes, today: { count, max: cfg.settings.shiftsPerDay }, active: null };
  const rec = p.shift;
  if (!rec) return base;
  const byId = byIdOf(cfg);
  const tasks: ShiftTaskView[] = rec.taskIds.flatMap((id, i): ShiftTaskView[] => {
    const def = byId.get(id);
    if (!def) return [];
    const at = opensAt(rec, i);
    const ans = rec.answers[id];
    const order = choiceOrder(p.staffId, id, def.choices.length);
    if (ans) {
      const picked = def.choices[order[ans.shown]];
      return [{ index: i, id, title: def.title, opensAt: at, state: "done", story: def.story, result: { verdict: ans.verdict, chosen: picked?.text ?? "", feedback: picked?.feedback ?? "" } }];
    }
    if (at > now) return [{ index: i, id, title: def.title, opensAt: at, state: "locked" }];
    return [{ index: i, id, title: def.title, opensAt: at, state: "open", story: def.story, choices: order.map((k) => def.choices[k].text) }];
  });
  return { ...base, active: { startedAt: rec.startedAt, endsAt: rec.endsAt, tasks, answered: tasks.filter((t) => t.state === "done").length, canFinish: now >= rec.endsAt } };
}

async function ctx() {
  const [cfg, work] = await Promise.all([getConfig("shifts"), getConfig("workFirst")]);
  return { cfg, tz: work.timezone };
}

export async function getShift(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<ShiftView> {
  const [{ cfg, tz }, p] = await Promise.all([ctx(), getOrCreatePlayer(user, now)]);
  return viewOf(p, cfg, tz, now);
}

type Change = (p: PlayerRecord, cfg: Cfg, tz: string) => { next: Partial<PlayerRecord>; message: string; verdict?: Verdict; feedback?: string } | string;

async function change(user: Pick<UserDTO, "staffId">, now: number, fn: Change): Promise<ShiftResult> {
  const { cfg, tz } = await ctx();
  await getOrCreatePlayer(user, now);
  let refusal: string | null = null;
  let out: { message: string; verdict?: Verdict; feedback?: string } = { message: "" };
  const saved = await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur) return cur;
    const r = fn(cur, cfg, tz);
    if (typeof r === "string") {
      refusal = r;
      return cur;
    }
    out = { message: r.message, verdict: r.verdict, feedback: r.feedback };
    return { ...cur, ...r.next, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, view: viewOf(saved as PlayerRecord, cfg, tz, now), ...out };
}

export function startShift(user: Pick<UserDTO, "staffId" | "unit">, now: number = Date.now()): Promise<ShiftResult> {
  return change(user, now, (p, cfg, tz) => {
    if (p.shift) return "You are already on a shift.";
    const today = dayKey(now, tz);
    const count = p.shiftDay?.day === today ? p.shiftDay.count : 0;
    if (count >= cfg.settings.shiftsPerDay) return `You have done ${cfg.settings.shiftsPerDay} shift${cfg.settings.shiftsPerDay === 1 ? "" : "s"} today. Come back tomorrow.`;
    const ids = drawTasks(cfg.tasks as ShiftTaskDef[], user.unit, cfg.settings.tasksPerShift, `${user.staffId}|${today}|${count}`);
    if (ids.length === 0) return "There are no situations set up for your shift yet.";
    const rec: ShiftRecord = { startedAt: now, endsAt: now + cfg.settings.minutes * 60_000, minutes: cfg.settings.minutes, taskIds: ids, answers: {} };
    return { next: { shift: rec, shiftDay: { day: today, count: count + 1 } }, message: `Your shift has started. Stay ${cfg.settings.minutes} minute${cfg.settings.minutes === 1 ? "" : "s"} to be paid.` };
  });
}

export function answerShiftTask(user: Pick<UserDTO, "staffId">, taskId: unknown, shown: unknown, now: number = Date.now()): Promise<ShiftResult> {
  return change(user, now, (p, cfg) => {
    const rec = p.shift;
    if (!rec) return "You are not on a shift.";
    if (typeof taskId !== "string") return "That situation is not part of your shift.";
    const i = rec.taskIds.indexOf(taskId);
    const def = byIdOf(cfg).get(taskId);
    if (i < 0 || !def) return "That situation is not part of your shift.";
    if (rec.answers[taskId]) return "You have already answered that one.";
    if (opensAt(rec, i) > now) return "That situation has not come up yet.";
    if (typeof shown !== "number" || !Number.isInteger(shown) || shown < 0 || shown >= def.choices.length) return "Please pick one of the choices.";
    const picked = def.choices[choiceOrder(p.staffId, taskId, def.choices.length)[shown]];
    return { next: { shift: { ...rec, answers: { ...rec.answers, [taskId]: { shown, verdict: picked.verdict, at: now } } } }, message: picked.verdict === "best" ? "Well handled." : picked.verdict === "partly" ? "Not bad, but there was a better way." : "That is not how we would handle it.", verdict: picked.verdict, feedback: picked.feedback };
  });
}

/** Finish the shift. It pays only when the shift time is up; leaving early ends it with no pay. */
export async function finishShift(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<ShiftResult> {
  const r = await change(user, now, (p, cfg) => {
    const rec = p.shift;
    if (!rec) return "You are not on a shift.";
    if (now < rec.endsAt) return `Stay ${Math.max(1, Math.ceil((rec.endsAt - now) / 60_000))} more minute${rec.endsAt - now > 60_000 ? "s" : ""} to be paid, or leave now with no pay.`;
    const pay = shiftPay(rec, cfg.settings as ShiftSettings);
    const byId = byIdOf(cfg);
    const skillXp = { ...(p.skillXp ?? {}) };
    for (const id of rec.taskIds) {
      const skill = byId.get(id)?.skill;
      if (skill && rec.answers[id]?.verdict === "best") skillXp[skill] = (skillXp[skill] ?? 0) + cfg.settings.skillXpBest;
    }
    return { next: { shift: undefined, points: p.points + pay.points, skillXp }, message: `Shift complete. You earned ${pay.points} Merit points (${pay.best} of ${rec.taskIds.length} handled the best way).` };
  });
  if (r.ok) {
    await notify(user.staffId, { icon: "💼", text: r.message, tone: "good" }, now);
    await recordEvent(user.staffId, "shift", now);
  }
  return r;
}

export function leaveShift(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<ShiftResult> {
  return change(user, now, (p) => {
    if (!p.shift) return "You are not on a shift.";
    return { next: { shift: undefined }, message: "You left the shift early. No pay this time." };
  });
}
