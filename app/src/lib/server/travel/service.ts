import "server-only";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { playStatus } from "../workfirst/service";
import { recordEvent } from "../game/missions";
import { checkHunt } from "../game/hunt";
import type { UserDTO } from "../types";
import { floorBlock } from "@/lib/world/access";
import { BUILDINGS, getScene } from "@/lib/world/scenes";
import { hashString, seeded } from "@/lib/iso/geometry";

/**
 * Travel between offices (Lagos only for now): choose how to go, ride for a short time on screen, and arrive. The cost
 * is paid when the ride starts; a ride can be skipped or turned back when the settings allow. The server keeps the time
 * and decides the road event, so the screen can only show what happened.
 */
type User = Pick<UserDTO, "staffId" | "unit" | "role">;

export interface TripView {
  to: string;
  toName: string;
  fromName: string;
  mode: string;
  label: string;
  icon: string;
  startedAt: number;
  endsAt: number;
  event: { label: string; icon: string } | null;
}

export interface TravelOptions {
  modes: { id: string; label: string; icon: string; cost: number; rideSeconds: number; note: string }[];
  skipAllowed: boolean;
  turnBackAllowed: boolean;
  active: TripView | null;
}

export type TravelResult = { ok: true; arrived?: { scene: string; arrive: { x: number; y: number } }; trip?: TripView; points?: number } | { ok: false; error: string };

const nameOf = (sceneId: string) => BUILDINGS.find((b) => b.id === getScene(sceneId)?.building)?.name ?? getScene(sceneId)?.name ?? sceneId;

function tripView(t: NonNullable<PlayerRecord["trip"]>): TripView {
  return { to: t.to, toName: nameOf(t.to), fromName: nameOf(t.from), mode: t.mode, label: t.label, icon: t.icon, startedAt: t.startedAt, endsAt: t.endsAt, event: t.event ?? null };
}

export async function getTravel(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<TravelOptions> {
  const [cfg, transport, p] = await Promise.all([getConfig("travel"), getConfig("transport"), getOrCreatePlayer(user, now)]);
  return {
    modes: transport.filter((m) => m.enabled).map((m) => ({ id: m.id, label: m.label, icon: m.icon, cost: m.costPoints, rideSeconds: m.rideSeconds, note: m.requiresBooking ? "Booked through the pool, so it can take longer" : "" })),
    skipAllowed: cfg.settings.skipAllowed,
    turnBackAllowed: cfg.settings.turnBackAllowed,
    active: p.trip ? tripView(p.trip) : null,
  };
}

/** Start a ride to another office. `toScene` is the room you arrive in. */
export async function startTrip(user: User, toScene: unknown, modeId: unknown, now: number = Date.now()): Promise<TravelResult> {
  const play = await playStatus(user, "world", now);
  if (!play.allowed) return { ok: false, error: play.message };
  if (typeof toScene !== "string" || typeof modeId !== "string") return { ok: false, error: "Choose where to go and how." };
  const target = getScene(toScene);
  if (!target) return { ok: false, error: "That place does not exist." };
  const [cfg, transport, floors, player] = await Promise.all([getConfig("travel"), getConfig("transport"), getConfig("floors"), getOrCreatePlayer(user, now)]);
  const here = getScene(player.scene);
  if (!here) return { ok: false, error: "That place does not exist." };
  if (target.building === here.building) return { ok: false, error: "That is in the same building. Use the map." };
  const closed = floorBlock(floors, target.level, user);
  if (closed) return { ok: false, error: closed };
  const mode = transport.find((m) => m.id === modeId && m.enabled);
  if (!mode) return { ok: false, error: "That way of travelling is not available." };
  const roll = seeded(hashString(`${user.staffId}|trip|${now}`))() * 100;
  let acc = 0;
  let event: { label: string; icon: string; extraSeconds: number } | undefined;
  for (const e of cfg.events) {
    acc += e.chance;
    if (roll < acc) {
      event = { label: e.label, icon: e.icon, extraSeconds: e.extraSeconds };
      break;
    }
  }
  const seconds = Math.max(3, mode.rideSeconds + (event?.extraSeconds ?? 0));
  let refusal: string | null = null;
  let points = 0;
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur) return cur;
    if (cur.trip) {
      refusal = "You are already on a ride.";
      return cur;
    }
    if (cur.points < mode.costPoints) {
      refusal = `You need ${mode.costPoints} Merit points for that ride.`;
      return cur;
    }
    points = cur.points - mode.costPoints;
    return { ...cur, points, trip: { to: target.id, from: cur.scene, mode: mode.id, label: mode.label, icon: mode.icon, startedAt: now, endsAt: now + seconds * 1000, ...(event ? { event: { label: event.label, icon: event.icon } } : {}) }, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  await audit(user.staffId, "world_trip_started", target.id, { mode: mode.id, cost: mode.costPoints }, now);
  const p = await getOrCreatePlayer(user, now);
  return { ok: true, trip: p.trip ? tripView(p.trip) : undefined, points };
}

/** Arrive. The ride must have run its time unless skipping is allowed. */
export async function finishTrip(user: User, skip: boolean, now: number = Date.now()): Promise<TravelResult> {
  const cfg = await getConfig("travel");
  const p = await getOrCreatePlayer(user, now);
  const t = p.trip;
  if (!t) return { ok: false, error: "You are not on a ride." };
  if (now + 500 < t.endsAt && !(skip && cfg.settings.skipAllowed)) return { ok: false, error: "The ride is not over yet." };
  const target = getScene(t.to);
  if (!target) return { ok: false, error: "That place does not exist." };
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur?.trip) return cur;
    const { trip: _t, ...rest } = cur;
    void _t;
    return { ...rest, scene: target.id, updatedAt: now } as PlayerRecord;
  });
  await audit(user.staffId, "world_travel", target.id, { via: "trip", from: t.from }, now);
  await recordEvent(user.staffId, "visit", now);
  await checkHunt(user.staffId, target.id, now);
  return { ok: true, arrived: { scene: target.id, arrive: target.spawn } };
}

/** Go back to where the ride began, when the settings allow it. The cost is not refunded. */
export async function turnBack(user: User, now: number = Date.now()): Promise<TravelResult> {
  const cfg = await getConfig("travel");
  if (!cfg.settings.turnBackAllowed) return { ok: false, error: "You cannot turn back on this ride." };
  const p = await getOrCreatePlayer(user, now);
  const t = p.trip;
  if (!t) return { ok: false, error: "You are not on a ride." };
  const back = getScene(t.from);
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur?.trip) return cur;
    const { trip: _t, ...rest } = cur;
    void _t;
    return rest as PlayerRecord;
  });
  await audit(user.staffId, "world_trip_turned_back", t.to, undefined, now);
  return { ok: true, arrived: back ? { scene: back.id, arrive: back.spawn } : undefined };
}
