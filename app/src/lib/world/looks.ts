import type { Fabric, HairStyle, Outfit, Skin } from "./types";

/**
 * What a person can choose in the appearance editor, as plain data. The server accepts a saved look only if
 * every part of it is on these lists, so nothing else can be stored.
 */
export const BODIES = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
] as const;

export const HAIR_STYLES: { id: Exclude<HairStyle, "short" | "bun">; label: string }[] = [
  { id: "lowcut", label: "Low cut" },
  { id: "bald", label: "Bald" },
  { id: "curls", label: "Curls" },
  { id: "afro", label: "Afro" },
  { id: "locs", label: "Locs" },
  { id: "braids", label: "Braids" },
  { id: "classic", label: "Classic" },
];

export const OUTFITS: { id: Outfit; label: string }[] = [
  { id: "casual", label: "Casual" },
  { id: "hoodie", label: "Hoodie" },
  { id: "office", label: "Office" },
  { id: "chill", label: "Chill" },
  { id: "sitework", label: "Site work" },
];

export const FABRICS: { id: Fabric; label: string }[] = [
  { id: "plain", label: "Plain" },
  { id: "ankara", label: "Ankara" },
  { id: "adire", label: "Adire" },
  { id: "asooke", label: "Aso-oke" },
];

export const SKIN_TONES = ["#c68d63", "#a9714a", "#8f5d3b", "#7a4a2b", "#62391f", "#4d2c18", "#3a2112"];
export const HAIR_COLOURS = ["#14110f", "#2a1d14", "#46301f", "#7a4a2b", "#a8672a", "#c9a56a", "#6b2d8c"];
export const OUTFIT_COLOURS = ["#2d5d41", "#8db74e", "#2f6fe0", "#e04848", "#f2a03d", "#7c5cf0", "#e0488a", "#17b2a6", "#1d2433", "#f3efe6", "#d4a62a"];
export const BOTTOM_COLOURS = ["#1f2a3d", "#2b4a7a", "#14110f", "#4a4f57", "#b9a77a", "#f3efe6", "#2d5d41", "#7a2e2e"];

const ids = <T extends { id: string }>(l: T[]) => new Set(l.map((x) => x.id));
const HAIR_IDS = ids(HAIR_STYLES);
const OUTFIT_IDS = ids(OUTFITS);
const FABRIC_IDS = ids(FABRICS);

/**
 * Strict check for a look the person submitted from the editor: every field must be present and on the
 * lists above. Returns null if anything is off.
 */
export function parseChosenLook(raw: unknown): Skin | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const body = o.body;
  if (body !== "man" && body !== "woman") return null;
  const hairStyle = o.hairStyle;
  const outfit = o.outfit;
  const fabric = o.fabric;
  if (typeof hairStyle !== "string" || !HAIR_IDS.has(hairStyle)) return null;
  if (typeof outfit !== "string" || !OUTFIT_IDS.has(outfit)) return null;
  if (typeof fabric !== "string" || !FABRIC_IDS.has(fabric)) return null;
  if (typeof o.skin !== "string" || !SKIN_TONES.includes(o.skin)) return null;
  if (typeof o.hair !== "string" || !HAIR_COLOURS.includes(o.hair)) return null;
  if (typeof o.top !== "string" || !OUTFIT_COLOURS.includes(o.top)) return null;
  if (typeof o.pants !== "string" || !BOTTOM_COLOURS.includes(o.pants)) return null;
  return { body, hairStyle: hairStyle as HairStyle, outfit: outfit as Outfit, fabric: fabric as Fabric, skin: o.skin, hair: o.hair, top: o.top, pants: o.pants };
}

export function sameLook(a: Skin, b: Skin): boolean {
  return a.body === b.body && a.hairStyle === b.hairStyle && a.outfit === b.outfit && a.fabric === b.fabric && a.skin === b.skin && a.hair === b.hair && a.top === b.top && a.pants === b.pants;
}
