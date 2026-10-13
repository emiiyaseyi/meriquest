import type { Skin } from "./types";
import { hashString, seeded } from "@/lib/iso/geometry";

/** Pure helpers for the player's character and status bars. Safe on the server and in the browser. */

export interface Needs {
  energy: number; // 0 to 100
  focus: number;
  mood: number;
  social: number;
}

export const DEFAULT_NEEDS: Needs = { energy: 82, focus: 76, mood: 84, social: 62 };

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Keep stored values sane: numbers between 0 and 100, with defaults for anything missing or odd. */
export function cleanNeeds(raw: unknown): Needs {
  const o = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = (k: keyof Needs) => (typeof o[k] === "number" && Number.isFinite(o[k]) ? clamp(o[k] as number) : DEFAULT_NEEDS[k]);
  return { energy: n("energy"), focus: n("focus"), mood: n("mood"), social: n("social") };
}

/** A mood word for the top bar, from the average of the bars. */
export function moodLabel(n: Needs): string {
  const avg = (n.energy + n.focus + n.mood + n.social) / 4;
  if (avg >= 85) return "Very happy";
  if (avg >= 70) return "Happy";
  if (avg >= 55) return "Okay";
  if (avg >= 35) return "Stressed";
  return "Exhausted";
}

const SKIN_TONES = ["#5b3a29", "#6e4630", "#8a5a3c", "#a8714a", "#c58f67"];
const HAIR_COLORS = ["#14110f", "#14110f", "#2a1d14", "#3a2a1c"];
const HAIR_STYLES: Skin["hairStyle"][] = ["short", "afro", "braids", "short", "bun", "bald"];
const TOPS = ["#2d5d41", "#3f5f8a", "#8db74e", "#c8503c", "#6b5aa6", "#1d2a44"];
const PANTS = ["#1f2a3d", "#2b2f36", "#3a3f4a"];

/** A pleasant default character, the same every time for the same person (until they customise it). */
export function defaultLook(staffId: string): Skin {
  const r = seeded(hashString(staffId));
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length) % a.length];
  return { skin: pick(SKIN_TONES), hair: pick(HAIR_COLORS), hairStyle: pick(HAIR_STYLES), top: pick(TOPS), pants: pick(PANTS) };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const STYLES = new Set<string>(["short", "afro", "braids", "bald", "bun"]);

/** Accept a stored or submitted look only if every field is valid; otherwise fall back to the default. */
export function cleanLook(raw: unknown, fallback: Skin): Skin {
  if (raw === null || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const hex = (k: string, d: string) => (typeof o[k] === "string" && HEX.test(o[k] as string) ? (o[k] as string) : d);
  return {
    skin: hex("skin", fallback.skin),
    hair: hex("hair", fallback.hair),
    top: hex("top", fallback.top),
    pants: hex("pants", fallback.pants),
    hairStyle: typeof o.hairStyle === "string" && STYLES.has(o.hairStyle) ? (o.hairStyle as Skin["hairStyle"]) : fallback.hairStyle,
  };
}
