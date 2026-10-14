import { NEED_KEYS, type NeedKey, type Needs } from "@/lib/world/player";

/**
 * Workspace decoration: what can be bought, where things may stand, and what they do. Plain functions, safe on
 * the server and in the browser. The catalogue itself comes from the admin-editable "decor" setting.
 */
export interface DecorItem {
  id: string;
  category: string;
  name: string;
  icon: string;
  /** Floor space in tiles. */
  w: number;
  d: number;
  /** 0 to 3 stars, shown on the card. */
  stars: number;
  /** Price in Merit points. */
  price: number;
  /** Some items help a need by slowing how fast it falls: a share between 0 and 1. */
  effect?: { need: NeedKey; cut: number };
  model?: string;
  color?: string;
}

export interface PlacedItem {
  uid: string;
  item: string;
  x: number;
  y: number;
  /** 1 when turned a quarter, so its width and depth swap. */
  rot?: 0 | 1;
}

/** The floor space an item takes, allowing for a turn. */
export const footprint = (it: { w: number; d: number }, rot?: number): { w: number; d: number } => (rot === 1 ? { w: it.d, d: it.w } : { w: it.w, d: it.d });

export interface DecorState {
  owned: Record<string, number>;
  placed: PlacedItem[];
  /** "grid": the person places things; "auto": bought things are put in the first free spot. */
  mode: "grid" | "auto";
}

export const EMPTY_DECOR: DecorState = { owned: {}, placed: [], mode: "grid" };

const fits = (f: { w: number; d: number }, x: number, y: number, gridW: number, gridD: number) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + f.w <= gridW && y + f.d <= gridD;

const overlaps = (a: { x: number; y: number; w: number; d: number }, b: { x: number; y: number; w: number; d: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;

/** Whether an item may stand with its top-left tile at (x, y): inside the room and not on anything else. */
export function canPlace(placed: PlacedItem[], byId: Map<string, DecorItem>, gridW: number, gridD: number, item: DecorItem, x: number, y: number, ignoreUid?: string, rot?: number): boolean {
  const f = footprint(item, rot);
  if (!fits(f, x, y, gridW, gridD)) return false;
  const me = { x, y, w: f.w, d: f.d };
  return !placed.some((p) => {
    if (p.uid === ignoreUid) return false;
    const other = byId.get(p.item);
    if (!other) return false;
    const of = footprint(other, p.rot);
    return overlaps(me, { x: p.x, y: p.y, w: of.w, d: of.d });
  });
}

/** The first free spot for an item, reading the room row by row. */
export function firstFree(placed: PlacedItem[], byId: Map<string, DecorItem>, gridW: number, gridD: number, item: DecorItem): { x: number; y: number } | null {
  for (let y = 0; y < gridD; y++) for (let x = 0; x < gridW; x++) if (canPlace(placed, byId, gridW, gridD, item, x, y)) return { x, y };
  return null;
}

/** How much each need's fall is slowed by what stands in the room, never more than `cap` for one need. */
export function decayCuts(placed: PlacedItem[], byId: Map<string, DecorItem>, cap: number): Partial<Record<NeedKey, number>> {
  const out: Partial<Record<NeedKey, number>> = {};
  for (const p of placed) {
    const e = byId.get(p.item)?.effect;
    if (e) out[e.need] = Math.min(cap, (out[e.need] ?? 0) + e.cut);
  }
  return out;
}

/** The hourly fall of each need after the room's help. */
export function cutDecay(perHour: Needs, cuts: Partial<Record<NeedKey, number>>): Needs {
  const out = { ...perHour };
  for (const k of NEED_KEYS) out[k] = perHour[k] * (1 - (cuts[k] ?? 0));
  return out;
}

/** Heal a stored decoration record: only whole, positive counts and placed things the person really owns. */
export function cleanDecor(raw: unknown, byId: Map<string, DecorItem>, gridW: number, gridD: number): DecorState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<DecorState>;
  const owned: Record<string, number> = {};
  for (const [id, n] of Object.entries(r.owned ?? {})) if (byId.has(id) && Number.isInteger(n) && n > 0 && n < 1000) owned[id] = n;
  const used: Record<string, number> = {};
  const placed: PlacedItem[] = [];
  for (const p of Array.isArray(r.placed) ? r.placed : []) {
    const it = typeof p?.item === "string" ? byId.get(p.item) : undefined;
    if (!it || typeof p.uid !== "string" || (used[it.id] ?? 0) >= (owned[it.id] ?? 0)) continue;
    const rot = p.rot === 1 ? 1 : 0;
    if (!canPlace(placed, byId, gridW, gridD, it, p.x, p.y, undefined, rot)) continue;
    used[it.id] = (used[it.id] ?? 0) + 1;
    placed.push({ uid: p.uid, item: it.id, x: p.x, y: p.y, rot });
  }
  return { owned, placed, mode: r.mode === "auto" ? "auto" : "grid" };
}
