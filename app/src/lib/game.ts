import { hashString, seeded } from "@/lib/iso/geometry";
import { NEED_KEYS, type NeedKey, type Needs } from "@/lib/world/player";

/**
 * The rules of needs, skills and daily missions, as plain functions. Safe on the server and in the browser,
 * and easy to test. The numbers all come from the admin-editable "gameplay" setting.
 */
export type Effects = Partial<Record<keyof Needs, number>>;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Longest stretch of away-time that counts towards falling needs, so a weekend off does not exhaust anyone. */
export const MAX_DECAY_HOURS = 1;

/** Needs after some time has passed. Each bar falls by its hourly rate; never below zero. */
export function decayNeeds(needs: Needs, elapsedMs: number, perHour: Needs): Needs {
  const hours = Math.max(0, Math.min(MAX_DECAY_HOURS, elapsedMs / 3_600_000));
  const out = { ...needs };
  for (const k of NEED_KEYS) out[k] = clamp(needs[k] - perHour[k] * hours);
  return out;
}

export function applyEffects(needs: Needs, effects: Effects): Needs {
  const out = { ...needs };
  for (const k of NEED_KEYS) out[k] = clamp(needs[k] + (effects[k] ?? 0));
  return out;
}

export const NEED_LABEL: Record<NeedKey, string> = { energy: "Energy", focus: "Focus", mood: "Mood", social: "Social", hunger: "Hunger", hydration: "Hydration", growth: "Growth", recognition: "Recognition" };

/** "+Social +Mood" for an interaction's effects (only the bars it raises). */
export function effectTags(effects: Effects): string[] {
  return NEED_KEYS.filter((k) => (effects[k] ?? 0) > 0).map((k) => `+${NEED_LABEL[k]}`);
}

export interface SkillDef {
  id: string;
  label: string;
  icon: string;
  xpPerLevel: number;
  maxLevel: number;
}

export interface SkillStanding {
  id: string;
  label: string;
  icon: string;
  level: number;
  maxLevel: number;
  /** Progress through the current level, 0 to 1. */
  progress: number;
}

export function skillStanding(def: SkillDef, xp: number): SkillStanding {
  const total = Math.max(0, Math.floor(xp));
  const level = Math.min(def.maxLevel, Math.floor(total / def.xpPerLevel));
  const progress = level >= def.maxLevel ? 1 : (total % def.xpPerLevel) / def.xpPerLevel;
  return { id: def.id, label: def.label, icon: def.icon, level, maxLevel: def.maxLevel, progress };
}

/** The date in a time zone, as YYYY-MM-DD, so "today" means the same thing for everyone in Lagos. */
export function dayKey(now: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  return parts;
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  event: string;
  target: number;
  rewardPoints: number;
}

/** Today's missions: the same three for the same person all day, and a different mix each day. */
export function pickMissions(defs: readonly MissionDef[], count: number, staffId: string, day: string): MissionDef[] {
  const n = Math.min(count, defs.length);
  const rnd = seeded(hashString(`${staffId}|${day}`));
  const pool = [...defs];
  const out: MissionDef[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(rnd() * pool.length) % pool.length;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export interface Streak {
  /** The last day (YYYY-MM-DD) the person checked in. */
  last: string;
  count: number;
  best: number;
}

/** The streak after checking in today: it grows when yesterday was checked in, otherwise it starts again. */
export function nextStreak(prev: Streak | undefined, today: string, yesterday: string): Streak {
  if (prev && prev.last === today) return prev;
  const count = prev && prev.last === yesterday ? prev.count + 1 : 1;
  return { last: today, count, best: Math.max(prev?.best ?? 0, count) };
}

/** Where a streak count falls in the 7-day track (1 to 7, then it starts a new week). */
export const streakDay = (count: number): number => ((Math.max(1, count) - 1) % 7) + 1;

/** A label for a mission by how much it pays. */
export function missionLevel(rewardPoints: number): "Easy" | "Medium" | "Hard" {
  return rewardPoints <= 3 ? "Easy" : rewardPoints <= 5 ? "Medium" : "Hard";
}

export interface StoredFeeling {
  id: string;
  label: string;
  text: string;
  change: string;
  at: number;
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

/** Keep the stored game fields sane: right shapes, sensible sizes, no odd keys. */
export function cleanProgress(raw: { feelings?: unknown; skillXp?: unknown; cooldowns?: unknown; needsAt?: unknown }): { feelings: StoredFeeling[]; skillXp: Record<string, number>; cooldowns: Record<string, number>; needsAt?: number } {
  const feelings = Array.isArray(raw.feelings)
    ? raw.feelings.slice(0, 12).flatMap((f): StoredFeeling[] => {
        if (f === null || typeof f !== "object") return [];
        const o = f as Record<string, unknown>;
        if (typeof o.at !== "number" || !Number.isFinite(o.at)) return [];
        return [{ id: str(o.id, 20), label: str(o.label, 30), text: str(o.text, 160), change: str(o.change, 60), at: o.at }];
      })
    : [];
  const numbers = (v: unknown, maxKeys: number): Record<string, number> => {
    const out: Record<string, number> = {};
    if (v === null || typeof v !== "object" || Array.isArray(v)) return out;
    for (const [k, n] of Object.entries(v as Record<string, unknown>).slice(0, maxKeys)) {
      if (k.length <= 80 && typeof n === "number" && Number.isFinite(n) && n >= 0) out[k] = Math.floor(n);
    }
    return out;
  };
  return { feelings, skillXp: numbers(raw.skillXp, 40), cooldowns: numbers(raw.cooldowns, 200), needsAt: typeof raw.needsAt === "number" && Number.isFinite(raw.needsAt) ? raw.needsAt : undefined };
}

/**
 * What the screen shows straight away, before the server has answered. The server is still the judge: when it answers,
 * its numbers replace these. A prediction that is wrong is corrected quietly.
 */
export interface Predictable {
  needs: Needs;
  points: number;
  cooldowns: Record<string, number>;
}

export function predictAction<T extends Predictable>(g: T, a: { key: string; effects: Effects; cost?: number; gain?: number; cooldownMinutes: number }, now: number): T | string {
  const until = g.cooldowns[a.key] ?? 0;
  if (until > now) return "Not just yet. Give it a little while.";
  if ((a.cost ?? 0) > g.points) return `You need ${a.cost} Merit points for that.`;
  return { ...g, needs: applyEffects(g.needs, a.effects), points: g.points - (a.cost ?? 0) + (a.gain ?? 0), cooldowns: a.cooldownMinutes > 0 ? { ...g.cooldowns, [a.key]: now + a.cooldownMinutes * 60_000 } : g.cooldowns };
}
