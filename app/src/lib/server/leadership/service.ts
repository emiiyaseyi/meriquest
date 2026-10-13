import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { notify } from "../notices/service";
import { dayKey } from "@/lib/game";
import { hashString } from "@/lib/iso/geometry";
import { applyChoice, order, rate, startMeters, type Rating } from "@/lib/leadership";

type Cfg = Awaited<ReturnType<typeof getConfig<"leadership">>>;
type Scenario = Cfg["scenarios"][number];

export interface LeadView {
  meters: { id: string; label: string; icon: string; value: number }[];
  today: { count: number; max: number };
  /** The run in progress: which decision it is on, and what it is. */
  run: null | { round: number; total: number; scenario: { id: string; title: string; story: string; choices: string[] } };
}

export type LeadResult =
  | { ok: true; view: LeadView; feedback?: string; changes?: { label: string; icon: string; delta: number }[]; finished?: { rating: Rating; points: number; meters: LeadView["meters"] } }
  | { ok: false; error: string };

async function ctx() {
  const [cfg, work] = await Promise.all([getConfig("leadership"), getConfig("workFirst")]);
  return { cfg, tz: work.timezone };
}

function viewOf(p: PlayerRecord, cfg: Cfg, tz: string, now: number): LeadView {
  const today = dayKey(now, tz);
  const count = p.lead?.day === today ? p.lead.count : 0;
  const run = p.lead?.run;
  const meters = cfg.meters.map((m) => ({ id: m.id, label: m.label, icon: m.icon, value: run?.meters[m.id] ?? cfg.settings.startMeter }));
  const base: LeadView = { meters, today: { count, max: cfg.settings.runsPerDay }, run: null };
  if (!run) return base;
  const sc = cfg.scenarios.find((s) => s.id === run.ids[run.idx]);
  if (!sc) return base;
  const shuffled = order(run.seed + hashString(sc.id), sc.choices.length);
  return { ...base, run: { round: run.idx + 1, total: run.ids.length, scenario: { id: sc.id, title: sc.title, story: sc.story, choices: shuffled.map((k) => sc.choices[k].text) } } };
}

export async function getLead(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<LeadView> {
  const [{ cfg, tz }, p] = await Promise.all([ctx(), getOrCreatePlayer(user, now)]);
  return viewOf(p, cfg, tz, now);
}

export async function startLead(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<LeadResult> {
  const { cfg, tz } = await ctx();
  await getOrCreatePlayer(user, now);
  let refusal: string | null = null;
  const saved = await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur) return cur;
    if (cur.lead?.run) {
      refusal = "You already have a run in progress.";
      return cur;
    }
    const today = dayKey(now, tz);
    const count = cur.lead?.day === today ? cur.lead.count : 0;
    if (count >= cfg.settings.runsPerDay) {
      refusal = `You have done ${cfg.settings.runsPerDay} run${cfg.settings.runsPerDay === 1 ? "" : "s"} today. Come back tomorrow.`;
      return cur;
    }
    const seed = (hashString(`${user.staffId}|${today}|${count}`) ^ (now & 0xffff)) >>> 0;
    const ids = order(seed, cfg.scenarios.length)
      .slice(0, Math.min(cfg.settings.rounds, cfg.scenarios.length))
      .map((i) => cfg.scenarios[i].id);
    return { ...cur, lead: { day: today, count: count + 1, run: { ids, idx: 0, meters: startMeters(cfg.meters.map((m) => m.id), cfg.settings.startMeter), seed } }, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, view: viewOf(saved as PlayerRecord, cfg, tz, now) };
}

export async function answerLead(user: Pick<UserDTO, "staffId">, shown: unknown, now: number = Date.now()): Promise<LeadResult> {
  const { cfg, tz } = await ctx();
  await getOrCreatePlayer(user, now);
  let refusal: string | null = null;
  let feedback = "";
  let changes: { label: string; icon: string; delta: number }[] = [];
  let finished: { rating: Rating; points: number } | undefined;
  let finalMeters: Record<string, number> = {};
  const saved = await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    const run = cur?.lead?.run;
    if (!cur || !cur.lead || !run) {
      refusal = "You are not in a run. Start one first.";
      return cur;
    }
    const sc: Scenario | undefined = cfg.scenarios.find((s) => s.id === run.ids[run.idx]);
    if (!sc) {
      refusal = "That decision is no longer available. Start a new run.";
      return { ...cur, lead: { day: cur.lead.day, count: cur.lead.count } };
    }
    if (typeof shown !== "number" || !Number.isInteger(shown) || shown < 0 || shown >= sc.choices.length) {
      refusal = "Please pick one of the choices.";
      return cur;
    }
    const choice = sc.choices[order(run.seed + hashString(sc.id), sc.choices.length)[shown]];
    const meters = applyChoice(run.meters, choice.effects);
    feedback = choice.feedback;
    changes = cfg.meters.map((m) => ({ label: m.label, icon: m.icon, delta: meters[m.id] - run.meters[m.id] })).filter((c) => c.delta !== 0);
    if (run.idx + 1 < run.ids.length) return { ...cur, lead: { ...cur.lead, run: { ...run, idx: run.idx + 1, meters } }, updatedAt: now };
    const rating = rate(meters, { great: cfg.settings.greatAverage, good: cfg.settings.goodAverage, floor: cfg.settings.floor });
    const points = rating === "great" ? cfg.settings.pointsGreat : rating === "good" ? cfg.settings.pointsGood : cfg.settings.pointsLearning;
    finished = { rating, points };
    finalMeters = meters;
    return { ...cur, points: cur.points + points, lead: { day: cur.lead.day, count: cur.lead.count }, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  const p = saved as PlayerRecord;
  if (finished) {
    const f: { rating: Rating; points: number } = finished;
    await notify(user.staffId, { icon: "🧭", text: `Leadership run finished: ${f.rating === "great" ? "great leadership" : f.rating === "good" ? "good leadership" : "a learning run"}. +${f.points} Merit points.`, tone: "good" }, now);
    return { ok: true, view: viewOf(p, cfg, tz, now), feedback, changes, finished: { ...f, meters: cfg.meters.map((m) => ({ id: m.id, label: m.label, icon: m.icon, value: finalMeters[m.id] ?? 0 })) } };
  }
  return { ok: true, view: viewOf(p, cfg, tz, now), feedback, changes };
}
