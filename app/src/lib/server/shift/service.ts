import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { notify, scheduleNotice } from "../notices/service";
import { MAX_CHAIN, type Consequence, type FollowUp } from "@/lib/consequence";
import { recordEvent } from "../game/missions";
import { dayKey, effectTags } from "@/lib/game";
import { withStats } from "@/lib/stats";
import { perform } from "../game/service";
import { choiceOrder, drawTasks, opensAt, shiftPay, shiftPerformance, type ShiftRecord, type ShiftSettings, type ShiftTaskDef, type Verdict } from "@/lib/shift";

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

export interface WorkStyleView {
  id: string;
  label: string;
  icon: string;
  description: string;
  payPercent: number;
  /** Short tags for what it does to the needs, for example "+Social". */
  tags: string[];
}

export interface ShiftView {
  minutes: number;
  today: { count: number; max: number };
  /** The work styles to choose from (the first is used when nobody picks). */
  styles: WorkStyleView[];
  active: null | {
    /** The work style in use, and whether it can still be changed (until the first situation is answered). */
    style: string;
    canChangeStyle: boolean;
    /** How well the situations answered so far were handled, 0 to 100. */
    performance: number;
    /** What the shift would pay right now, and the bonus for answering every situation. */
    pointsSoFar: number;
    completionBonus: number;
    startedAt: number;
    endsAt: number;
    tasks: ShiftTaskView[];
    answered: number;
    /** True once the shift time is up, so it can be finished and paid. */
    canFinish: boolean;
  };
}

export type ShiftResult = { ok: true; view: ShiftView; message: string; verdict?: Verdict; feedback?: string; /** What happens next in real life, for the choice just made. */ consequence?: Consequence; /** The title of the situation this choice leads to, when it does. */ nextTitle?: string; /** True when something will come back to the person later (in Updates). */ comesBack?: boolean } | { ok: false; error: string };

/** The work style a shift uses: the one picked if it still exists, otherwise the first in the list. */
const styleOf = (cfg: Cfg, id: string | undefined) => cfg.workStyles.find((s) => s.id === id) ?? cfg.workStyles[0];

const byIdOf = (cfg: Cfg) => new Map<string, ShiftTaskDef>((cfg.tasks as ShiftTaskDef[]).map((t) => [t.id, t]));

function viewOf(p: PlayerRecord, cfg: Cfg, tz: string, now: number): ShiftView {
  const today = dayKey(now, tz);
  const count = p.shiftDay?.day === today ? p.shiftDay.count : 0;
  const styles: WorkStyleView[] = cfg.workStyles.map((s) => ({ id: s.id, label: s.label, icon: s.icon, description: s.description, payPercent: s.payPercent, tags: effectTags(s.effects) }));
  const base: ShiftView = { minutes: cfg.settings.minutes, today: { count, max: cfg.settings.shiftsPerDay }, styles, active: null };
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
  const style = styleOf(cfg, rec.style);
  const answered = tasks.filter((t) => t.state === "done").length;
  return { ...base, active: { style: style.id, canChangeStyle: answered === 0, performance: shiftPerformance(rec), pointsSoFar: shiftPay(rec, cfg.settings as ShiftSettings, style.payPercent).points, completionBonus: Math.round((cfg.settings.completionBonus * style.payPercent) / 100), startedAt: rec.startedAt, endsAt: rec.endsAt, tasks, answered: tasks.filter((t) => t.state === "done").length, canFinish: now >= rec.endsAt } };
}

async function ctx() {
  const [cfg, work] = await Promise.all([getConfig("shifts"), getConfig("workFirst")]);
  return { cfg, tz: work.timezone };
}

export async function getShift(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<ShiftView> {
  const [{ cfg, tz }, p] = await Promise.all([ctx(), getOrCreatePlayer(user, now)]);
  return viewOf(p, cfg, tz, now);
}

type Change = (p: PlayerRecord, cfg: Cfg, tz: string) => { next: Partial<PlayerRecord>; message: string; verdict?: Verdict; feedback?: string; consequence?: Consequence; nextTitle?: string; comesBack?: boolean } | string;

async function change(user: Pick<UserDTO, "staffId">, now: number, fn: Change): Promise<ShiftResult> {
  const { cfg, tz } = await ctx();
  await getOrCreatePlayer(user, now);
  let refusal: string | null = null;
  let out: { message: string; verdict?: Verdict; feedback?: string; consequence?: Consequence; nextTitle?: string; comesBack?: boolean } = { message: "" };
  const saved = await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur) return cur;
    const r = fn(cur, cfg, tz);
    if (typeof r === "string") {
      refusal = r;
      return cur;
    }
    out = { message: r.message, verdict: r.verdict, feedback: r.feedback, consequence: r.consequence, nextTitle: r.nextTitle, comesBack: r.comesBack };
    return { ...cur, ...r.next, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, view: viewOf(saved as PlayerRecord, cfg, tz, now), ...out };
}

export function startShift(user: Pick<UserDTO, "staffId" | "unit">, now: number = Date.now(), styleId?: unknown): Promise<ShiftResult> {
  return change(user, now, (p, cfg, tz) => {
    if (p.shift) return "You are already on a shift.";
    const today = dayKey(now, tz);
    const count = p.shiftDay?.day === today ? p.shiftDay.count : 0;
    if (count >= cfg.settings.shiftsPerDay) return `You have done ${cfg.settings.shiftsPerDay} shift${cfg.settings.shiftsPerDay === 1 ? "" : "s"} today. Come back tomorrow.`;
    const ids = drawTasks(cfg.tasks as ShiftTaskDef[], user.unit, cfg.settings.tasksPerShift, `${user.staffId}|${today}|${count}`);
    if (ids.length === 0) return "There are no situations set up for your shift yet.";
    if (styleId !== undefined && (typeof styleId !== "string" || !cfg.workStyles.some((s) => s.id === styleId))) return "Choose one of the work styles.";
    const rec: ShiftRecord = { base: ids.length, style: styleOf(cfg, styleId as string | undefined).id, startedAt: now, endsAt: now + cfg.settings.minutes * 60_000, minutes: cfg.settings.minutes, taskIds: ids, answers: {} };
    return { next: { shift: rec, shiftDay: { day: today, count: count + 1 } }, message: `Your shift has started. Stay ${cfg.settings.minutes} minute${cfg.settings.minutes === 1 ? "" : "s"} to be paid.` };
  });
}

/** Change the work style, only until the first situation has been answered. */
export function setShiftStyle(user: Pick<UserDTO, "staffId">, styleId: unknown, now: number = Date.now()): Promise<ShiftResult> {
  return change(user, now, (p, cfg) => {
    const rec = p.shift;
    if (!rec) return "You are not on a shift.";
    if (typeof styleId !== "string" || !cfg.workStyles.some((s) => s.id === styleId)) return "Choose one of the work styles.";
    if (Object.keys(rec.answers).length > 0) return "You can only change your work style before you answer the first situation.";
    return { next: { shift: { ...rec, style: styleId } }, message: `Working style: ${styleOf(cfg, styleId).label}.` };
  });
}

export async function answerShiftTask(user: Pick<UserDTO, "staffId">, taskId: unknown, shown: unknown, now: number = Date.now()): Promise<ShiftResult> {
  let followUp: FollowUp | undefined;
  const r = await change(user, now, (p, cfg) => {
    const rec = p.shift;
    if (!rec) return "You are not on a shift.";
    if (typeof taskId !== "string") return "That situation is not part of your shift.";
    const i = rec.taskIds.indexOf(taskId);
    const defs = byIdOf(cfg);
    const def = defs.get(taskId);
    if (i < 0 || !def) return "That situation is not part of your shift.";
    if (rec.answers[taskId]) return "You have already answered that one.";
    if (opensAt(rec, i) > now) return "That situation has not come up yet.";
    if (typeof shown !== "number" || !Number.isInteger(shown) || shown < 0 || shown >= def.choices.length) return "Please pick one of the choices.";
    const picked = def.choices[choiceOrder(p.staffId, taskId, def.choices.length)[shown]];
    followUp = picked.followUp as FollowUp | undefined;
    // A choice can lead to another situation. It is added while there is still time to answer it, and never more than MAX_CHAIN in one shift.
    let taskIds = rec.taskIds;
    let opens = rec.opens;
    let nextTitle: string | undefined;
    const base = rec.base ?? rec.taskIds.length;
    const next = picked.next ? defs.get(picked.next) : undefined;
    if (next && !rec.taskIds.includes(next.id) && rec.taskIds.length - base < MAX_CHAIN && now + 60_000 < rec.endsAt) {
      taskIds = [...rec.taskIds, next.id];
      opens = { ...(rec.opens ?? {}), [next.id]: now + 15_000 };
      nextTitle = next.title;
    }
    const message = picked.verdict === "best" ? "Well handled." : picked.verdict === "partly" ? "Not bad, but there was a better way." : "That is not how we would handle it.";
    return { next: { shift: { ...rec, base, taskIds, opens, answers: { ...rec.answers, [taskId]: { shown, verdict: picked.verdict, at: now } } } }, message, verdict: picked.verdict, feedback: picked.feedback, consequence: picked.consequence as Consequence | undefined, nextTitle, comesBack: !!picked.followUp };
  });
  // Real consequences take time to show: the follow-up reaches the person's Updates later
  if (r.ok && followUp) {
    const f: FollowUp = followUp;
    await scheduleNotice(user.staffId, { icon: f.icon, text: f.text, tone: f.tone }, now + f.afterMinutes * 60_000);
  }
  return r;
}

/** Finish the shift. It pays only when the shift time is up; leaving early ends it with no pay. */
export async function finishShift(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<ShiftResult> {
  let usedStyle: string | undefined;
  const r = await change(user, now, (p, cfg) => {
    const rec = p.shift;
    if (!rec) return "You are not on a shift.";
    if (now < rec.endsAt) return `Stay ${Math.max(1, Math.ceil((rec.endsAt - now) / 60_000))} more minute${rec.endsAt - now > 60_000 ? "s" : ""} to be paid, or leave now with no pay.`;
    const style = styleOf(cfg, rec.style);
    usedStyle = style.id;
    const pay = shiftPay(rec, cfg.settings as ShiftSettings, style.payPercent);
    const byId = byIdOf(cfg);
    const skillXp = { ...(p.skillXp ?? {}) };
    for (const id of rec.taskIds) {
      const skill = byId.get(id)?.skill;
      if (skill && rec.answers[id]?.verdict === "best") skillXp[skill] = (skillXp[skill] ?? 0) + cfg.settings.skillXpBest;
    }
    const st = withStats(p.stats);
    return { next: { shift: undefined, points: p.points + pay.points, skillXp, stats: { ...st, shifts: st.shifts + 1, shiftPoints: st.shiftPoints + pay.points } }, message: `Shift complete. You earned ${pay.points} Merit points (${pay.best} of ${rec.taskIds.length} handled the best way).` };
  });
  if (r.ok) {
    await notify(user.staffId, { icon: "💼", text: r.message, tone: "good" }, now);
    await recordEvent(user.staffId, "shift", now);
    // How the person chose to work shows in their needs (never in whether their decisions count as good)
    const cfg = await getConfig("shifts");
    const style = styleOf(cfg, usedStyle);
    await perform(user, { key: "shift-style", effects: style.effects, cost: 0, cooldownMinutes: 0, feeling: { label: style.label, text: `You worked: ${style.label.toLowerCase()}.` }, event: "shift-style" }, now);
  }
  return r;
}

export function leaveShift(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<ShiftResult> {
  return change(user, now, (p) => {
    if (!p.shift) return "You are not on a shift.";
    return { next: { shift: undefined }, message: "You left the shift early. No pay this time." };
  });
}
