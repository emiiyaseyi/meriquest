import type { Skin } from "./types";
import { hashString, seeded } from "@/lib/iso/geometry";
import { BOTTOM_COLOURS, FABRICS, HAIR_COLOURS, HAIR_STYLES, OUTFITS, OUTFIT_COLOURS, SKIN_TONES } from "./looks";

/** Pure helpers for the player's character and status bars. Safe on the server and in the browser. */

/** Every need, in the order they are shown. */
export const NEED_KEYS = ["energy", "focus", "mood", "social", "hunger", "hydration", "growth", "recognition"] as const;
export type NeedKey = (typeof NEED_KEYS)[number];
export type Needs = Record<NeedKey, number>; // each 0 to 100

export const DEFAULT_NEEDS: Needs = { energy: 82, focus: 76, mood: 84, social: 62, hunger: 70, hydration: 74, growth: 58, recognition: 55 };

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Keep stored values sane: numbers between 0 and 100, with defaults for anything missing or odd (older records have fewer needs). */
export function cleanNeeds(raw: unknown): Needs {
  const o = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_NEEDS };
  for (const k of NEED_KEYS) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = clamp(v);
  }
  return out;
}

/** A mood word for the top bar, from the average of the bars. */
export function moodLabel(n: Needs): string {
  const avg = NEED_KEYS.reduce((sum, k) => sum + n[k], 0) / NEED_KEYS.length;
  if (avg >= 85) return "Very happy";
  if (avg >= 70) return "Happy";
  if (avg >= 55) return "Okay";
  if (avg >= 35) return "Stressed";
  return "Exhausted";
}

/** A pleasant default character, the same every time for the same person (until they customise it). */
export function defaultLook(staffId: string): Skin {
  const r = seeded(hashString(staffId));
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length];
  return {
    body: pick(["man", "woman"] as const),
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLOURS.slice(0, 4)),
    hairStyle: pick(HAIR_STYLES).id,
    outfit: pick(["casual", "office", "hoodie"] as const),
    fabric: "plain",
    top: pick(OUTFIT_COLOURS),
    pants: pick(BOTTOM_COLOURS.slice(0, 4)),
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const STYLES = new Set<string>(["lowcut", "bald", "curls", "afro", "locs", "braids", "classic", "short", "bun"]);
const OUTFIT_SET = new Set<string>(OUTFITS.map((o) => o.id));
const FABRIC_SET = new Set<string>(FABRICS.map((f) => f.id));

/** Accept a stored look only if every field is valid; anything missing or odd falls back to the default. Older looks still load. */
export function cleanLook(raw: unknown, fallback: Skin): Skin {
  if (raw === null || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const hex = (k: string, d: string) => (typeof o[k] === "string" && HEX.test(o[k] as string) ? (o[k] as string) : d);
  return {
    body: o.body === "man" || o.body === "woman" ? o.body : fallback.body,
    skin: hex("skin", fallback.skin),
    hair: hex("hair", fallback.hair),
    top: hex("top", fallback.top),
    pants: hex("pants", fallback.pants),
    hairStyle: typeof o.hairStyle === "string" && STYLES.has(o.hairStyle) ? (o.hairStyle as Skin["hairStyle"]) : fallback.hairStyle,
    outfit: typeof o.outfit === "string" && OUTFIT_SET.has(o.outfit) ? (o.outfit as Skin["outfit"]) : fallback.outfit,
    fabric: typeof o.fabric === "string" && FABRIC_SET.has(o.fabric) ? (o.fabric as Skin["fabric"]) : fallback.fabric,
  };
}

export interface LevelStanding {
  index: number;
  name: string;
  /** The next level's name and the points still needed, or null at the top. */
  next: { name: string; needed: number } | null;
  /** 0 to 1 progress through the current level. */
  progress: number;
}

/** Where a person stands on the growth ladder, from their points. Level thresholds come from admin settings. */
export function levelFor(points: number, levels: { name: string; xp: number }[]): LevelStanding {
  let index = 0;
  for (let i = 0; i < levels.length; i++) if (points >= levels[i].xp) index = i;
  const here = levels[index];
  const nxt = levels[index + 1];
  if (!nxt) return { index, name: here.name, next: null, progress: 1 };
  const span = nxt.xp - here.xp;
  return { index, name: here.name, next: { name: nxt.name, needed: nxt.xp - points }, progress: span > 0 ? Math.max(0, Math.min(1, (points - here.xp) / span)) : 0 };
}
