import "server-only";
import { randomBytes } from "node:crypto";
import { getConfig } from "@/lib/server/config/registry";
import { getStore } from "../store";
import { getOrCreatePlayer, type PlayerRecord } from "@/lib/server/world/service";
import type { UserDTO } from "../types";
import { canPlace, cleanDecor, cutDecay, decayCuts, firstFree, type DecorItem, type DecorState } from "@/lib/decor";
import type { Needs } from "@/lib/world/player";

type Cfg = Awaited<ReturnType<typeof getConfig<"decor">>>;

export interface DecorView {
  points: number;
  decor: DecorState;
  grid: { w: number; d: number };
  categories: Cfg["categories"];
  items: DecorItem[];
  maxPlaced: number;
}

export type DecorResult = { ok: true; view: DecorView; message: string } | { ok: false; error: string };

const byIdOf = (cfg: Cfg) => new Map<string, DecorItem>((cfg.items as DecorItem[]).map((i) => [i.id, i]));

const viewOf = (p: PlayerRecord, cfg: Cfg): DecorView => {
  const byId = byIdOf(cfg);
  return { points: p.points, decor: cleanDecor(p.decor, byId, cfg.settings.gridW, cfg.settings.gridD), grid: { w: cfg.settings.gridW, d: cfg.settings.gridD }, categories: cfg.categories, items: cfg.items as DecorItem[], maxPlaced: cfg.settings.maxPlaced };
};

/** How fast needs fall for this person, after what stands in their Workspace helps. Used by the needs rules. */
export function ratesFor(perHour: Needs, decor: unknown, cfg: Cfg): Needs {
  const byId = byIdOf(cfg);
  const d = cleanDecor(decor, byId, cfg.settings.gridW, cfg.settings.gridD);
  return cutDecay(perHour, decayCuts(d.placed, byId, cfg.settings.maxHelpPerNeed));
}

export async function getDecor(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<DecorView> {
  const [cfg, p] = await Promise.all([getConfig("decor"), getOrCreatePlayer(user, now)]);
  return viewOf(p, cfg);
}

/** Run one change on the person's decoration record, atomically. The change returns an error text to refuse. */
async function change(user: Pick<UserDTO, "staffId">, now: number, fn: (d: DecorState, p: PlayerRecord, cfg: Cfg, byId: Map<string, DecorItem>) => { decor?: DecorState; points?: number; message: string } | string): Promise<DecorResult> {
  const cfg = await getConfig("decor");
  await getOrCreatePlayer(user, now);
  const byId = byIdOf(cfg);
  let refusal: string | null = null;
  let message = "";
  const saved = await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur) return cur;
    const d = cleanDecor(cur.decor, byId, cfg.settings.gridW, cfg.settings.gridD);
    const r = fn(d, cur, cfg, byId);
    if (typeof r === "string") {
      refusal = r;
      return cur;
    }
    message = r.message;
    return { ...cur, decor: r.decor ?? d, points: r.points ?? cur.points, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  return { ok: true, view: viewOf(saved as PlayerRecord, cfg), message };
}

const newUid = () => randomBytes(4).toString("hex");
const placedCount = (d: DecorState, id: string) => d.placed.filter((p) => p.item === id).length;

export function buyItem(user: Pick<UserDTO, "staffId">, itemId: string, now: number = Date.now()): Promise<DecorResult> {
  return change(user, now, (d, p, cfg, byId) => {
    const it = byId.get(itemId);
    if (!it) return "That item is not in the catalogue.";
    if (p.points < it.price) return `You need ${it.price} Merit points for the ${it.name}.`;
    if ((d.owned[it.id] ?? 0) >= 20) return "You already have plenty of those.";
    const owned = { ...d.owned, [it.id]: (d.owned[it.id] ?? 0) + 1 };
    let placed = d.placed;
    let where = "";
    if (d.mode === "auto" && placed.length < cfg.settings.maxPlaced) {
      const spot = firstFree(placed, byId, cfg.settings.gridW, cfg.settings.gridD, it);
      if (spot) {
        placed = [...placed, { uid: newUid(), item: it.id, x: spot.x, y: spot.y }];
        where = " and placed it in your Workspace";
      }
    }
    return { decor: { ...d, owned, placed }, points: p.points - it.price, message: `You bought the ${it.name}${where}.` };
  });
}

const turn = (r: unknown): 0 | 1 => (r === 1 ? 1 : 0);

/** Buy an item and put it down in one step, as the placing panel does: a copy already owned is used first, otherwise it is bought. */
export function buyAndPlace(user: Pick<UserDTO, "staffId">, itemId: string, x: unknown, y: unknown, rot: unknown, now: number = Date.now()): Promise<DecorResult> {
  return change(user, now, (d, p, cfg, byId) => {
    const it = byId.get(itemId);
    if (!it) return "That item is not in the catalogue.";
    if (d.placed.length >= cfg.settings.maxPlaced) return `Your Workspace is full (${cfg.settings.maxPlaced} things).`;
    const r = turn(rot);
    if (typeof x !== "number" || typeof y !== "number" || !canPlace(d.placed, byId, cfg.settings.gridW, cfg.settings.gridD, it, x, y, undefined, r)) return "That spot is not free.";
    const have = (d.owned[it.id] ?? 0) > placedCount(d, it.id);
    if (!have && p.points < it.price) return `You need ${it.price} Merit points for the ${it.name}.`;
    if (!have && (d.owned[it.id] ?? 0) >= 20) return "You already have plenty of those.";
    const owned = have ? d.owned : { ...d.owned, [it.id]: (d.owned[it.id] ?? 0) + 1 };
    return { decor: { ...d, owned, placed: [...d.placed, { uid: newUid(), item: it.id, x, y, rot: r }] }, points: have ? p.points : p.points - it.price, message: have ? `Placed the ${it.name}.` : `You bought the ${it.name} and placed it.` };
  });
}

export function placeItem(user: Pick<UserDTO, "staffId">, itemId: string, x: unknown, y: unknown, now: number = Date.now(), rot?: unknown): Promise<DecorResult> {
  return change(user, now, (d, _p, cfg, byId) => {
    const it = byId.get(itemId);
    if (!it) return "That item is not in the catalogue.";
    if ((d.owned[it.id] ?? 0) <= placedCount(d, it.id)) return "You have none of those left to place. Buy another, or take one out of the room first.";
    if (d.placed.length >= cfg.settings.maxPlaced) return `Your Workspace is full (${cfg.settings.maxPlaced} things).`;
    const r = turn(rot);
    if (typeof x !== "number" || typeof y !== "number" || !canPlace(d.placed, byId, cfg.settings.gridW, cfg.settings.gridD, it, x, y, undefined, r)) return "That spot is not free.";
    return { decor: { ...d, placed: [...d.placed, { uid: newUid(), item: it.id, x, y, rot: r }] }, message: `Placed the ${it.name}.` };
  });
}

export function moveItem(user: Pick<UserDTO, "staffId">, uid: string, x: unknown, y: unknown, now: number = Date.now(), rot?: unknown): Promise<DecorResult> {
  return change(user, now, (d, _p, cfg, byId) => {
    const at = d.placed.find((p) => p.uid === uid);
    const it = at ? byId.get(at.item) : undefined;
    if (!at || !it) return "That item is not in your Workspace.";
    const r = rot === undefined ? turn(at.rot) : turn(rot);
    if (typeof x !== "number" || typeof y !== "number" || !canPlace(d.placed, byId, cfg.settings.gridW, cfg.settings.gridD, it, x, y, uid, r)) return "That spot is not free.";
    return { decor: { ...d, placed: d.placed.map((p) => (p.uid === uid ? { ...p, x, y, rot: r } : p)) }, message: `Moved the ${it.name}.` };
  });
}

/** Take a thing out of the room. It stays yours and can be placed again. */
export function removeItem(user: Pick<UserDTO, "staffId">, uid: string, now: number = Date.now()): Promise<DecorResult> {
  return change(user, now, (d, _p, _cfg, byId) => {
    const at = d.placed.find((p) => p.uid === uid);
    if (!at) return "That item is not in your Workspace.";
    return { decor: { ...d, placed: d.placed.filter((p) => p.uid !== uid) }, message: `Put the ${byId.get(at.item)?.name ?? "item"} away.` };
  });
}

export function setDecorMode(user: Pick<UserDTO, "staffId">, mode: unknown, now: number = Date.now()): Promise<DecorResult> {
  return change(user, now, (d) => {
    if (mode !== "grid" && mode !== "auto") return "Choose either placing things yourself or automatic placing.";
    return { decor: { ...d, mode }, message: mode === "auto" ? "New things will be placed for you." : "You will place things yourself." };
  });
}
