import "server-only";
import { getStore } from "../store";
import { audit } from "../audit";
import type { UserDTO } from "../types";
import { playStatus } from "../workfirst/service";
import { FIRST_SCENE, getScene } from "@/lib/world/scenes";
import { cleanLook, cleanNeeds, defaultLook, DEFAULT_NEEDS, type Needs } from "@/lib/world/player";
import { parseChosenLook } from "@/lib/world/looks";
import type { Skin } from "@/lib/world/types";

/**
 * The player's place in the world. Position is decided here, not by the browser: the client can only
 * ask to use a door or pick a room on the map, and the server checks the rules (same building, a real
 * door, and Work First) before it moves anyone.
 */
export interface PlayerRecord {
  staffId: string;
  scene: string;
  look: Skin;
  needs: Needs;
  points: number; // Merit points (never transferable, no cash value)
  /** True once the person has finished or skipped the welcome tour. */
  toured?: boolean;
  updatedAt: number;
}

export async function getOrCreatePlayer(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<PlayerRecord> {
  const store = getStore();
  const saved = await store.update<PlayerRecord>("players", user.staffId, (cur) => {
    const fallbackLook = defaultLook(user.staffId);
    if (!cur) return { staffId: user.staffId, scene: FIRST_SCENE, look: fallbackLook, needs: { ...DEFAULT_NEEDS }, points: 0, updatedAt: now };
    // Heal an old or tampered record rather than trusting it
    const scene = getScene(cur.scene) ? cur.scene : FIRST_SCENE;
    return { ...cur, toured: cur.toured === true, scene, look: cleanLook(cur.look, fallbackLook), needs: cleanNeeds(cur.needs), points: Number.isFinite(cur.points) && cur.points >= 0 ? Math.floor(cur.points) : 0 };
  });
  return saved as PlayerRecord;
}

/** Remember that the welcome tour is done (finished or skipped), so it is not shown again. */
export async function markToured(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<void> {
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, toured: true, updatedAt: now } : cur));
}

/** Save the look chosen in the appearance editor. Every part must be one of the offered choices. */
export async function saveLook(user: Pick<UserDTO, "staffId">, raw: unknown, now: number = Date.now()): Promise<{ ok: true; look: Skin } | { ok: false; error: string }> {
  const look = parseChosenLook(raw);
  if (!look) return { ok: false, error: "That look is not available. Please pick from the choices shown." };
  await getOrCreatePlayer(user, now);
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, look, updatedAt: now } : cur));
  return { ok: true, look };
}

export type TravelResult = { ok: true; scene: string; arrive: { x: number; y: number } } | { ok: false; error: string };

async function guard(user: Pick<UserDTO, "staffId" | "unit" | "role">, now: number): Promise<string | null> {
  const d = await playStatus(user, "world", now);
  return d.allowed ? null : d.message;
}

/** Walk through a door in the room the player is in. The door must exist in their current room. */
export async function travelByPortal(user: Pick<UserDTO, "staffId" | "unit" | "role">, portalId: unknown, now: number = Date.now()): Promise<TravelResult> {
  const blocked = await guard(user, now);
  if (blocked) return { ok: false, error: blocked };
  if (typeof portalId !== "string" || portalId.length > 60) return { ok: false, error: "That door does not exist." };
  const player = await getOrCreatePlayer(user, now);
  const here = getScene(player.scene);
  const portal = here?.portals.find((p) => p.id === portalId);
  const target = portal ? getScene(portal.to) : undefined;
  if (!here || !portal || !target) return { ok: false, error: "That door does not exist." };
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, scene: target.id, updatedAt: now } : cur));
  await audit(user.staffId, "world_travel", target.id, { via: "door", from: here.id }, now);
  return { ok: true, scene: target.id, arrive: portal.arrive };
}

/** Pick a room from the map. Rooms in the same building connect with no travel step (RULEBOOK §2.7). */
export async function travelByMap(user: Pick<UserDTO, "staffId" | "unit" | "role">, sceneId: unknown, now: number = Date.now()): Promise<TravelResult> {
  const blocked = await guard(user, now);
  if (blocked) return { ok: false, error: blocked };
  if (typeof sceneId !== "string" || sceneId.length > 60) return { ok: false, error: "That room does not exist." };
  const target = getScene(sceneId);
  const player = await getOrCreatePlayer(user, now);
  const here = getScene(player.scene);
  if (!target || !here) return { ok: false, error: "That room does not exist." };
  if (target.building !== here.building) return { ok: false, error: "That is in another building. Travel between buildings is not open yet." };
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, scene: target.id, updatedAt: now } : cur));
  await audit(user.staffId, "world_travel", target.id, { via: "map", from: here.id }, now);
  return { ok: true, scene: target.id, arrive: target.spawn };
}
