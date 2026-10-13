import "server-only";
import { randomBytes } from "node:crypto";
import { getStore } from "../store";
import { getConfig } from "../config/registry";
import type { UserDTO } from "../types";
import { playStatus } from "../workfirst/service";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { ensureMissionDay, recordEvent, type MissionDay } from "./missions";
import { getScene } from "@/lib/world/scenes";
import { applyEffects, decayNeeds, effectTags, skillStanding, type Effects, type SkillStanding } from "@/lib/game";
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
  done: boolean;
  claimed: boolean;
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
  plan: { day: string; missions: MissionView[]; allDone: boolean; bonusPoints: number; bonusClaimed: boolean };
  interactions: InteractionView[];
  coffee: { tags: string[]; cooldownMinutes: number };
  /** Cooldowns still running, as the time they end (key: interaction id and person, or "coffee"). */
  cooldowns: Record<string, number>;
}

export type ActionResult = { ok: true; state: GameState; message: string } | { ok: false; error: string };

const MAX_FEELINGS = 12;

async function applyDecay(staffId: string, now: number): Promise<PlayerRecord> {
  const gameplay = await getConfig("gameplay");
  await getOrCreatePlayer({ staffId }, now);
  const saved = await getStore().update<PlayerRecord>("players", staffId, (cur) => {
    if (!cur) return cur;
    const last = typeof cur.needsAt === "number" ? cur.needsAt : now;
    return { ...cur, needs: decayNeeds(cur.needs, now - last, gameplay.decayPerHour), needsAt: now };
  });
  return saved as PlayerRecord;
}

async function view(player: PlayerRecord, mission: MissionDay, now: number): Promise<GameState> {
  const gameplay = await getConfig("gameplay");
  const skills = gameplay.skills.map((s) => skillStanding(s, player.skillXp?.[s.id] ?? 0));
  const missions: MissionView[] = mission.picks.flatMap((id) => {
    const m = gameplay.missions.find((x) => x.id === id);
    if (!m) return [];
    const progress = Math.min(m.target, mission.progress[id] ?? 0);
    return [{ id, title: m.title, description: m.description, progress, target: m.target, rewardPoints: m.rewardPoints, done: progress >= m.target, claimed: mission.claimed[id] === true }];
  });
  const cooldowns = Object.fromEntries(Object.entries(player.cooldowns ?? {}).filter(([, until]) => until > now));
  return {
    needs: player.needs,
    points: player.points,
    feelings: (player.feelings ?? []).slice(0, MAX_FEELINGS),
    skills,
    plan: { day: mission.day, missions, allDone: missions.length > 0 && missions.every((m) => m.done), bonusPoints: gameplay.dailyBonusPoints, bonusClaimed: mission.bonusClaimed },
    interactions: gameplay.interactions.map((i) => ({ id: i.id, label: i.label, icon: i.icon, tags: effectTags(i.effects), cost: i.cost, cooldownMinutes: i.cooldownMinutes })),
    coffee: { tags: effectTags(gameplay.coffee.effects), cooldownMinutes: gameplay.coffee.cooldownMinutes },
    cooldowns,
  };
}

export async function getGameState(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<GameState> {
  const player = await applyDecay(user.staffId, now);
  return view(player, await ensureMissionDay(user.staffId, now), now);
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
}

/** Apply one action to the person's record in a single atomic step. Returns an error text if it is not allowed. */
async function perform(user: Pick<UserDTO, "staffId">, a: Action, now: number): Promise<string | null> {
  const gameplay = await getConfig("gameplay");
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
    const needs = applyEffects(decayNeeds(cur.needs, now - last, gameplay.decayPerHour), a.effects);
    const change = effectTags(a.effects).join(" ") || "A good moment";
    const feeling: Feeling = { id: randomBytes(5).toString("hex"), label: a.feeling.label, text: a.feeling.text, change, at: now };
    const cooldowns = Object.fromEntries(Object.entries(cur.cooldowns ?? {}).filter(([, t]) => t > now));
    if (a.cooldownMinutes > 0) cooldowns[a.key] = now + a.cooldownMinutes * 60_000;
    const skillXp = { ...(cur.skillXp ?? {}) };
    if (a.skill) skillXp[a.skill.id] = (skillXp[a.skill.id] ?? 0) + a.skill.xp;
    return { ...cur, needs, needsAt: now, points: cur.points - a.cost, feelings: [feeling, ...(cur.feelings ?? [])].slice(0, MAX_FEELINGS), skillXp, cooldowns, updatedAt: now };
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

/** Take a coffee at the coffee point (the room must have one). */
export async function takeCoffee(user: Pick<UserDTO, "staffId" | "unit" | "role">, now: number = Date.now()): Promise<ActionResult> {
  const blocked = await guard(user, now);
  if (blocked) return { ok: false, error: blocked };
  const gameplay = await getConfig("gameplay");
  const player = await getOrCreatePlayer(user, now);
  if (!getScene(player.scene)?.hotspots.some((h) => h.kind === "coffee")) return { ok: false, error: "There is no coffee point in this room." };
  const c = gameplay.coffee;
  const refusal = await perform(user, { key: "coffee", effects: c.effects, cost: 0, cooldownMinutes: c.cooldownMinutes, feeling: c.feeling, skill: c.skill, event: "coffee" }, now);
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, state: await getGameState(user, now), message: `Coffee break. ${effectTags(c.effects).join(" ")}`.trim() };
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
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, points: cur.points + def.rewardPoints, updatedAt: now } : cur));
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
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, points: cur.points + gameplay.dailyBonusPoints, updatedAt: now } : cur));
  return { ok: true, state: await getGameState(user, now), message: `Daily bonus: +${gameplay.dailyBonusPoints} Merit points.` };
}
