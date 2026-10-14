import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { notify } from "../notices/service";
import { dayKey } from "@/lib/game";
import { withStats } from "@/lib/stats";
import { hashString } from "@/lib/iso/geometry";
import { applyChoice, order, rate, startMeters, type Rating } from "@/lib/leadership";

/**
 * The decision simulators: the leadership simulator (people management) and the client simulation (client cases for
 * each unit). Both are runs of decisions that move meters; the server decides what each choice does and how the run is
 * rated. They share this code and differ in their settings and in which cases a person is dealt.
 */
export type SimKind = "leadership" | "clientsim";

type Cfg = Awaited<ReturnType<typeof getConfig<"leadership">>>;
type Scenario = Cfg["scenarios"][number] & { units?: string[] };

const FIELD = { leadership: "lead", clientsim: "sim" } as const;
const LABEL = { leadership: "Leadership run", clientsim: "Client simulation" } as const;

export interface LeadView {
  meters: { id: string; label: string; icon: string; value: number }[];
  today: { count: number; max: number };
  /** The run in progress: which decision it is on, and what it is. */
  run: null | { round: number; total: number; scenario: { id: string; title: string; story: string; choices: string[] } };
}

export type LeadResult =
  | { ok: true; view: LeadView; feedback?: string; changes?: { label: string; icon: string; delta: number }[]; finished?: { rating: Rating; points: number; meters: LeadView["meters"] } }
  | { ok: false; error: string };

type Run = { ids: string[]; idx: number; meters: Record<string, number>; seed: number };
type Slot = { day: string; count: number; run?: Run };

async function ctx(kind: SimKind) {
  const [cfg, work] = await Promise.all([getConfig(kind) as Promise<Cfg>, getConfig("workFirst")]);
  return { cfg, tz: work.timezone };
}

const slotOf = (p: PlayerRecord, kind: SimKind): Slot | undefined => p[FIELD[kind]];

function viewOf(p: PlayerRecord, cfg: Cfg, tz: string, now: number, kind: SimKind): LeadView {
  const today = dayKey(now, tz);
  const slot = slotOf(p, kind);
  const count = slot?.day === today ? slot.count : 0;
  const run = slot?.run;
  const meters = cfg.meters.map((m) => ({ id: m.id, label: m.label, icon: m.icon, value: run?.meters[m.id] ?? cfg.settings.startMeter }));
  const base: LeadView = { meters, today: { count, max: cfg.settings.runsPerDay }, run: null };
  if (!run) return base;
  const sc = cfg.scenarios.find((s) => s.id === run.ids[run.idx]);
  if (!sc) return base;
  const shuffled = order(run.seed + hashString(sc.id), sc.choices.length);
  return { ...base, run: { round: run.idx + 1, total: run.ids.length, scenario: { id: sc.id, title: sc.title, story: sc.story, choices: shuffled.map((k) => sc.choices[k].text) } } };
}

export async function getSim(user: Pick<UserDTO, "staffId">, kind: SimKind, now: number = Date.now()): Promise<LeadView> {
  const [{ cfg, tz }, p] = await Promise.all([ctx(kind), getOrCreatePlayer(user, now)]);
  return viewOf(p, cfg, tz, now, kind);
}

/** The cases a person may be dealt: the ones for their unit and the ones for everyone. */
function dealable(cfg: Cfg, unit: string | undefined): Scenario[] {
  const all = cfg.scenarios as Scenario[];
  return all.filter((s) => !s.units || s.units.includes("*") || (unit !== undefined && s.units.includes(unit)));
}

export async function startSim(user: Pick<UserDTO, "staffId"> & Partial<Pick<UserDTO, "unit">>, kind: SimKind, now: number = Date.now()): Promise<LeadResult> {
  const { cfg, tz } = await ctx(kind);
  await getOrCreatePlayer(user, now);
  const pool = dealable(cfg, user.unit);
  if (pool.length === 0) return { ok: false, error: "There are no cases set up for you yet." };
  let refusal: string | null = null;
  const field = FIELD[kind];
  const saved = await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur) return cur;
    const slot = slotOf(cur, kind);
    if (slot?.run) {
      refusal = "You already have a run in progress.";
      return cur;
    }
    const today = dayKey(now, tz);
    const count = slot?.day === today ? slot.count : 0;
    if (count >= cfg.settings.runsPerDay) {
      refusal = `You have done ${cfg.settings.runsPerDay} run${cfg.settings.runsPerDay === 1 ? "" : "s"} today. Come back tomorrow.`;
      return cur;
    }
    const seed = (hashString(`${user.staffId}|${kind}|${today}|${count}`) ^ (now & 0xffff)) >>> 0;
    const ids = order(seed, pool.length)
      .slice(0, Math.min(cfg.settings.rounds, pool.length))
      .map((i) => pool[i].id);
    return { ...cur, [field]: { day: today, count: count + 1, run: { ids, idx: 0, meters: startMeters(cfg.meters.map((m) => m.id), cfg.settings.startMeter), seed } }, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, view: viewOf(saved as PlayerRecord, cfg, tz, now, kind) };
}

export async function answerSim(user: Pick<UserDTO, "staffId">, kind: SimKind, shown: unknown, now: number = Date.now()): Promise<LeadResult> {
  const { cfg, tz } = await ctx(kind);
  await getOrCreatePlayer(user, now);
  const field = FIELD[kind];
  let refusal: string | null = null;
  let feedback = "";
  let changes: { label: string; icon: string; delta: number }[] = [];
  let finished: { rating: Rating; points: number } | undefined;
  let finalMeters: Record<string, number> = {};
  const saved = await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    const slot = cur ? slotOf(cur, kind) : undefined;
    const run = slot?.run;
    if (!cur || !slot || !run) {
      refusal = "You are not in a run. Start one first.";
      return cur;
    }
    const sc = cfg.scenarios.find((s) => s.id === run.ids[run.idx]);
    if (!sc) {
      refusal = "That decision is no longer available. Start a new run.";
      return { ...cur, [field]: { day: slot.day, count: slot.count } };
    }
    if (typeof shown !== "number" || !Number.isInteger(shown) || shown < 0 || shown >= sc.choices.length) {
      refusal = "Please pick one of the choices.";
      return cur;
    }
    const choice = sc.choices[order(run.seed + hashString(sc.id), sc.choices.length)[shown]];
    const meters = applyChoice(run.meters, choice.effects);
    feedback = choice.feedback;
    changes = cfg.meters.map((m) => ({ label: m.label, icon: m.icon, delta: meters[m.id] - run.meters[m.id] })).filter((c) => c.delta !== 0);
    if (run.idx + 1 < run.ids.length) return { ...cur, [field]: { ...slot, run: { ...run, idx: run.idx + 1, meters } }, updatedAt: now };
    const rating = rate(meters, { great: cfg.settings.greatAverage, good: cfg.settings.goodAverage, floor: cfg.settings.floor });
    const points = rating === "great" ? cfg.settings.pointsGreat : rating === "good" ? cfg.settings.pointsGood : cfg.settings.pointsLearning;
    finished = { rating, points };
    finalMeters = meters;
    const st = withStats(cur.stats);
    const stats =
      kind === "leadership"
        ? { ...st, leadRuns: st.leadRuns + 1, leadGreat: st.leadGreat + (rating === "great" ? 1 : 0), leadGood: st.leadGood + (rating === "good" ? 1 : 0), leadLast: rating, leadLastAt: now }
        : { ...st, simRuns: st.simRuns + 1, simGreat: st.simGreat + (rating === "great" ? 1 : 0) };
    return { ...cur, points: cur.points + points, stats, [field]: { day: slot.day, count: slot.count }, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  const p = saved as PlayerRecord;
  if (finished) {
    const f: { rating: Rating; points: number } = finished;
    await notify(user.staffId, { icon: kind === "leadership" ? "🧭" : "💼", text: `${LABEL[kind]} finished: ${f.rating === "great" ? "great" : f.rating === "good" ? "good" : "a learning run"}. +${f.points} Merit points.`, tone: "good" }, now);
    return { ok: true, view: viewOf(p, cfg, tz, now, kind), feedback, changes, finished: { ...f, meters: cfg.meters.map((m) => ({ id: m.id, label: m.label, icon: m.icon, value: finalMeters[m.id] ?? 0 })) } };
  }
  return { ok: true, view: viewOf(p, cfg, tz, now, kind), feedback, changes };
}

// The leadership simulator under its original names
export const getLead = (user: Pick<UserDTO, "staffId">, now?: number) => getSim(user, "leadership", now);
export const startLead = (user: Pick<UserDTO, "staffId">, now?: number) => startSim(user, "leadership", now);
export const answerLead = (user: Pick<UserDTO, "staffId">, shown: unknown, now?: number) => answerSim(user, "leadership", shown, now);

/** Line managers must finish the leadership simulator now and then; everyone else is not asked. */
export async function requiredFor(user: Pick<UserDTO, "staffId"> & Partial<Pick<UserDTO, "isLineManager">>, now: number): Promise<{ id: string; title: string; reason: string } | null> {
  if (!user.isLineManager) return null;
  const cfg = await getConfig("leadership");
  const days = cfg.settings.leadershipRefreshDays;
  if (days <= 0) return null;
  const p = await getOrCreatePlayer(user, now);
  const last = p.stats?.leadLastAt;
  if (last && now - last <= days * 86_400_000) return null;
  return { id: "leadership", title: "Leadership simulator", reason: last ? `It is more than ${days} days since your last run.` : `Line managers complete it at least every ${days} days.` };
}
