import "server-only";
import { randomBytes } from "node:crypto";
import { getStore } from "../store";
import { getConfig } from "../config/registry";
import type { UserDTO } from "../types";
import { playStatus } from "../workfirst/service";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { ratesFor } from "../decor/service";
import { ensureMissionDay, recordEvent, type MissionDay } from "./missions";
import { notify, unreadCount } from "../notices/service";
import { getScene } from "@/lib/world/scenes";
import { localTime } from "@/lib/workfirst";
import { hashString, seeded } from "@/lib/iso/geometry";
import { applyEffects, decayNeeds, dayKey, effectTags, missionLevel, nextStreak, streakDay, skillStanding, type Effects, type SkillStanding } from "@/lib/game";
import { NEED_KEYS, type NeedKey } from "@/lib/world/player";
import { SCENES } from "@/lib/world/scenes";
import type { Needs } from "@/lib/world/player";

/**
 * Needs, feelings, skills and Today's Plan. The server decides every change: the browser can only ask to
 * do something (greet someone, take a coffee, claim a reward) and the rules here accept or refuse it.
 */
export interface Feeling {
  id: string;
  label: string;
  text: string;
  /** What it changed, for display: "+5 Social". */
  change: string;
  at: number;
}

export interface MissionView {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardPoints: number;
  level: "Easy" | "Medium" | "Hard";
  done: boolean;
  claimed: boolean;
  /** True when it can still be swapped for another. */
  canSwap: boolean;
}

export interface StreakView {
  count: number;
  best: number;
  /** Today's place in the 7-day track. */
  day: number;
  checkedInToday: boolean;
  track: { day: number; points: number; done: boolean }[];
}

export interface InteractionView {
  id: string;
  label: string;
  icon: string;
  tags: string[];
  cost: number;
  cooldownMinutes: number;
}

export interface GameState {
  needs: Needs;
  points: number;
  feelings: Feeling[];
  skills: SkillStanding[];
  plan: { day: string; missions: MissionView[]; allDone: boolean; bonusPoints: number; bonusClaimed: boolean; /** When new missions arrive (epoch ms). */ newAt: number; swapsLeft: number };
  streak: StreakView;
  interactions: InteractionView[];
  /** Places that recharge needs, by the kind of hotspot. */
  spots: Record<string, { label: string; icon: string; tags: string[]; cooldownMinutes: number }>;
  /** For each need, where and how it can be recharged ("Coffee point · Open-plan floor", "Say hello"). */
  recharge: Record<NeedKey, string[]>;
  /** Updates on the Work Phone that have not been read. */
  unread: number;
  /** Cooldowns still running, as the time they end (key: interaction id and person, or "spot:kind"). */
  cooldowns: Record<string, number>;
}

export type ActionResult = { ok: true; state: GameState; message: string } | { ok: false; error: string };

const MAX_FEELINGS = 12;

type Gameplay = Awaited<ReturnType<typeof getConfig<"gameplay">>>;

/** Where each need can be recharged, worked out from the settings and the rooms (so it never goes out of date). */
function rechargeHints(gameplay: Gameplay): Record<NeedKey, string[]> {
  const out = Object.fromEntries(NEED_KEYS.map((k) => [k, [] as string[]])) as Record<NeedKey, string[]>;
  for (const spot of gameplay.spots) {
    const places = Object.values(SCENES).flatMap((s) => s.hotspots.filter((h) => h.kind === spot.kind).map((h) => `${h.label} · ${s.name}`));
    if (places.length === 0) continue;
    for (const k of NEED_KEYS) if ((spot.effects[k] ?? 0) > 0) out[k].push(places.join(", "));
  }
  for (const i of gameplay.interactions) for (const k of NEED_KEYS) if ((i.effects[k] ?? 0) > 0) out[k].push(`${i.label} with a colleague`);
  for (const k of NEED_KEYS) if ((gameplay.claimEffects[k] ?? 0) > 0) out[k].push("Claim a mission reward");
  return out;
}

async function applyDecay(staffId: string, now: number): Promise<PlayerRecord> {
  const [gameplay, decorCfg] = await Promise.all([getConfig("gameplay"), getConfig("decor")]);
  await getOrCreatePlayer({ staffId }, now);
  const saved = await getStore().update<PlayerRecord>("players", staffId, (cur) => {
    if (!cur) return cur;
    const last = typeof cur.needsAt === "number" ? cur.needsAt : now;
    return { ...cur, needs: decayNeeds(cur.needs, now - last, ratesFor(gameplay.decayPerHour, cur.decor, decorCfg)), needsAt: now };
  });
  return saved as PlayerRecord;
}

async function view(player: PlayerRecord, mission: MissionDay, now: number): Promise<GameState> {
  const unread = await unreadCount(player);
  const [gameplay, work] = await Promise.all([getConfig("gameplay"), getConfig("workFirst")]);
  const skills = gameplay.skills.map((s) => skillStanding(s, player.skillXp?.[s.id] ?? 0));
  const missions: MissionView[] = mission.picks.flatMap((id) => {
    const m = gameplay.missions.find((x) => x.id === id);
    if (!m) return [];
    const progress = Math.min(m.target, mission.progress[id] ?? 0);
    return [{ id, title: m.title, description: m.description, progress, target: m.target, rewardPoints: m.rewardPoints, level: missionLevel(m.rewardPoints), done: progress >= m.target, claimed: mission.claimed[id] === true, canSwap: progress === 0 && mission.claimed[id] !== true && (mission.swaps ?? 0) < gameplay.swapsPerDay }];
  });
  const today = dayKey(now, work.timezone);
  const streak = player.streak && (player.streak.last === today || player.streak.last === dayKey(now - 86_400_000, work.timezone)) ? player.streak : undefined;
  const checked = player.streak?.last === today;
  const cycleDay = streak ? streakDay(streak.count) : 0;
  const lt = localTime(now, work.timezone);
  const cooldowns = Object.fromEntries(Object.entries(player.cooldowns ?? {}).filter(([, until]) => until > now));
  return {
    needs: player.needs,
    points: player.points,
    feelings: (player.feelings ?? []).slice(0, MAX_FEELINGS),
    skills,
    plan: { day: mission.day, missions, allDone: missions.length > 0 && missions.every((m) => m.done), bonusPoints: gameplay.dailyBonusPoints, bonusClaimed: mission.bonusClaimed, newAt: now + (1440 - lt.minutes) * 60_000, swapsLeft: Math.max(0, gameplay.swapsPerDay - (mission.swaps ?? 0)) },
    streak: {
      count: streak?.count ?? 0,
      best: player.streak?.best ?? 0,
      day: cycleDay,
      checkedInToday: checked,
      track: Array.from({ length: 7 }, (_, i) => ({ day: i + 1, points: gameplay.streakRewards.find((r) => r.day === i + 1)?.points ?? 0, done: streak !== undefined && i + 1 <= cycleDay })),
    },
    interactions: gameplay.interactions.map((i) => ({ id: i.id, label: i.label, icon: i.icon, tags: effectTags(i.effects), cost: i.cost, cooldownMinutes: i.cooldownMinutes })),
    spots: Object.fromEntries(gameplay.spots.map((s) => [s.kind, { label: s.label, icon: s.icon, tags: effectTags(s.effects), cooldownMinutes: s.cooldownMinutes }])),
    recharge: rechargeHints(gameplay),
    unread,
    cooldowns,
  };
}

/** Check in for today: the streak grows (or starts again) and a day with a reward pays it, once. */
async function checkIn(staffId: string, now: number): Promise<void> {
  const [gameplay, work] = await Promise.all([getConfig("gameplay"), getConfig("workFirst")]);
  const today = dayKey(now, work.timezone);
  const yesterday = dayKey(now - 86_400_000, work.timezone);
  let reward = 0;
  let count = 0;
  await getStore().update<PlayerRecord>("players", staffId, (cur) => {
    if (!cur || cur.streak?.last === today) return cur;
    const streak = nextStreak(cur.streak, today, yesterday);
    count = streak.count;
    reward = gameplay.streakRewards.find((r) => r.day === streakDay(streak.count))?.points ?? 0;
    return { ...cur, streak, points: cur.points + reward, updatedAt: now };
  });
  if (reward > 0) await notify(staffId, { icon: "🔥", text: `Day ${count} streak. +${reward} Merit points.`, tone: "good" }, now);
}

export async function getGameState(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<GameState> {
  await getOrCreatePlayer(user, now);
  await checkIn(user.staffId, now);
  const player = await applyDecay(user.staffId, now);
  return view(player, await ensureMissionDay(user.staffId, now), now);
}

/** Swap a mission you have not started for another one, up to the daily number of free swaps. */
export async function swapMission(user: Pick<UserDTO, "staffId">, missionId: unknown, now: number = Date.now()): Promise<ActionResult> {
  if (typeof missionId !== "string" || missionId.length > 41) return { ok: false, error: "That mission is not in today's plan." };
  const gameplay = await getConfig("gameplay");
  const doc = await ensureMissionDay(user.staffId, now);
  let refusal: string | null = null;
  await getStore().update<MissionDay>("missions", doc.id, (cur) => {
    if (!cur || !cur.picks.includes(missionId)) {
      refusal = "That mission is not in today's plan.";
      return cur;
    }
    if ((cur.swaps ?? 0) >= gameplay.swapsPerDay) {
      refusal = "You have used today's free swap.";
      return cur;
    }
    if (cur.claimed[missionId] || (cur.progress[missionId] ?? 0) > 0) {
      refusal = "You can only swap a mission you have not started.";
      return cur;
    }
    const options = gameplay.missions.filter((m) => !cur.picks.includes(m.id));
    if (options.length === 0) {
      refusal = "There is no other mission to swap to.";
      return cur;
    }
    const pick = options[Math.floor(seeded(hashString(`${cur.id}|swap|${cur.swaps ?? 0}|${missionId}`))() * options.length) % options.length];
    return { ...cur, picks: cur.picks.map((id) => (id === missionId ? pick.id : id)), swaps: (cur.swaps ?? 0) + 1 };
  });
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, state: await getGameState(user, now), message: "Swapped for a new mission." };
}

async function guard(user: Pick<UserDTO, "staffId" | "unit" | "role">, now: number): Promise<string | null> {
  const d = await playStatus(user, "world", now);
  return d.allowed ? null : d.message;
}

interface Action {
  key: string;
  effects: Effects;
  cost: number;
  cooldownMinutes: number;
  feeling: { label: string; text: string };
  skill?: { id: string; xp: number };
  event: string;
  /** Merit points earned by it. */
  gain?: number;
}

/** Apply one action to the person's record in a single atomic step. Returns an error text if it is not allowed. */
export async function perform(user: Pick<UserDTO, "staffId">, a: Action, now: number): Promise<string | null> {
  const [gameplay, decorCfg] = await Promise.all([getConfig("gameplay"), getConfig("decor")]);
  let refusal: string | null = null;
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur) return cur;
    const until = cur.cooldowns?.[a.key] ?? 0;
    if (until > now) {
      refusal = `Not just yet. Try again in ${Math.max(1, Math.ceil((until - now) / 60_000))} minute${Math.ceil((until - now) / 60_000) === 1 ? "" : "s"}.`;
      return cur;
    }
    if (cur.points < a.cost) {
      refusal = `You need ${a.cost} Merit points for that.`;
      return cur;
    }
    const last = typeof cur.needsAt === "number" ? cur.needsAt : now;
    const needs = applyEffects(decayNeeds(cur.needs, now - last, ratesFor(gameplay.decayPerHour, cur.decor, decorCfg)), a.effects);
    const change = effectTags(a.effects).join(" ") || "A good moment";
    const feeling: Feeling = { id: randomBytes(5).toString("hex"), label: a.feeling.label, text: a.feeling.text, change, at: now };
    const cooldowns = Object.fromEntries(Object.entries(cur.cooldowns ?? {}).filter(([, t]) => t > now));
    if (a.cooldownMinutes > 0) cooldowns[a.key] = now + a.cooldownMinutes * 60_000;
    const skillXp = { ...(cur.skillXp ?? {}) };
    if (a.skill) skillXp[a.skill.id] = (skillXp[a.skill.id] ?? 0) + a.skill.xp;
    return { ...cur, needs, needsAt: now, points: cur.points - a.cost + (a.gain ?? 0), feelings: [feeling, ...(cur.feelings ?? [])].slice(0, MAX_FEELINGS), skillXp, cooldowns, updatedAt: now };
  });
  if (!refusal) await recordEvent(user.staffId, a.event, now);
  return refusal;
}

/** Greet, help or treat a colleague who is in the same room. */
export async function interact(user: Pick<UserDTO, "staffId" | "unit" | "role">, interactionId: unknown, npcId: unknown, now: number = Date.now()): Promise<ActionResult> {
  const blocked = await guard(user, now);
  if (blocked) return { ok: false, error: blocked };
  if (typeof interactionId !== "string" || typeof npcId !== "string" || interactionId.length > 41 || npcId.length > 41) return { ok: false, error: "That is not possible." };
  const gameplay = await getConfig("gameplay");
  const def = gameplay.interactions.find((i) => i.id === interactionId);
  const player = await getOrCreatePlayer(user, now);
  const npc = getScene(player.scene)?.npcs.find((n) => n.id === npcId);
  if (!def || !npc) return { ok: false, error: "That person is not here." };
  const refusal = await perform(user, { key: `${def.id}:${npc.id}`, effects: def.effects, cost: def.cost, cooldownMinutes: def.cooldownMinutes, feeling: def.feeling, skill: def.skill, event: def.id }, now);
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, state: await getGameState(user, now), message: `${def.label}: ${npc.name}. ${effectTags(def.effects).join(" ")}`.trim() };
}

/** Use a spot (coffee point, water cooler, pantry, sofa, bookshelf) in the room the person is in. */
export async function visitSpot(user: Pick<UserDTO, "staffId" | "unit" | "role">, kind: unknown, now: number = Date.now()): Promise<ActionResult> {
  const blocked = await guard(user, now);
  if (blocked) return { ok: false, error: blocked };
  if (typeof kind !== "string" || kind.length > 41) return { ok: false, error: "That is not possible." };
  const gameplay = await getConfig("gameplay");
  const spot = gameplay.spots.find((s) => s.kind === kind);
  const player = await getOrCreatePlayer(user, now);
  if (!spot || !getScene(player.scene)?.hotspots.some((h) => h.kind === kind)) return { ok: false, error: "There is nothing like that in this room." };
  const refusal = await perform(user, { key: `spot:${kind}`, effects: spot.effects, cost: 0, cooldownMinutes: spot.cooldownMinutes, feeling: spot.feeling, skill: spot.skill, event: kind }, now);
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, state: await getGameState(user, now), message: `${spot.label}. ${effectTags(spot.effects).join(" ")}`.trim() };
}

export async function claimMission(user: Pick<UserDTO, "staffId">, missionId: unknown, now: number = Date.now()): Promise<ActionResult> {
  if (typeof missionId !== "string" || missionId.length > 41) return { ok: false, error: "That mission does not exist." };
  const gameplay = await getConfig("gameplay");
  const def = gameplay.missions.find((m) => m.id === missionId);
  const doc = await ensureMissionDay(user.staffId, now);
  if (!def || !doc.picks.includes(def.id)) return { ok: false, error: "That mission is not in today's plan." };
  let won = false;
  await getStore().update<MissionDay>("missions", doc.id, (cur) => {
    if (!cur || cur.claimed[def.id] || (cur.progress[def.id] ?? 0) < def.target) return cur;
    won = true;
    return { ...cur, claimed: { ...cur.claimed, [def.id]: true } };
  });
  if (!won) return { ok: false, error: "That reward is not ready." };
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, points: cur.points + def.rewardPoints, needs: applyEffects(cur.needs, gameplay.claimEffects), updatedAt: now } : cur));
  await notify(user.staffId, { icon: "🎯", text: `Mission complete: ${def.title}. +${def.rewardPoints} Merit points.`, tone: "good" }, now);
  return { ok: true, state: await getGameState(user, now), message: `+${def.rewardPoints} Merit points for "${def.title}".` };
}

export async function claimDailyBonus(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<ActionResult> {
  const gameplay = await getConfig("gameplay");
  const doc = await ensureMissionDay(user.staffId, now);
  const picked = gameplay.missions.filter((m) => doc.picks.includes(m.id));
  if (picked.length === 0 || !picked.every((m) => (doc.progress[m.id] ?? 0) >= m.target)) return { ok: false, error: "Finish all of today's missions first." };
  let won = false;
  await getStore().update<MissionDay>("missions", doc.id, (cur) => {
    if (!cur || cur.bonusClaimed) return cur;
    won = true;
    return { ...cur, bonusClaimed: true };
  });
  if (!won) return { ok: false, error: "You already took today's bonus." };
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, points: cur.points + gameplay.dailyBonusPoints, needs: applyEffects(cur.needs, gameplay.claimEffects), updatedAt: now } : cur));
  await notify(user.staffId, { icon: "🎁", text: `Daily bonus taken: +${gameplay.dailyBonusPoints} Merit points. Well done on finishing the day’s plan`, tone: "good" }, now);
  return { ok: true, state: await getGameState(user, now), message: `Daily bonus: +${gameplay.dailyBonusPoints} Merit points.` };
}
