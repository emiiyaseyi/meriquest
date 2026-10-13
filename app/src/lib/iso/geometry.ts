/**
 * Isometric geometry. Tiles are laid out on a grid with x running right-and-down and y running
 * left-and-down (a standard 2:1 isometric view). Pure functions only: safe on the server, in the
 * browser and in tests.
 */
export const TW = 64; // tile width in pixels (diamond width)
export const TH = 32; // tile height in pixels (diamond height)
export const ZH = 26; // pixels per unit of height

export interface Pt {
  x: number;
  y: number;
}

/** Grid position (and optional height) to screen pixels, before camera zoom and offset. */
export function project(gx: number, gy: number, gz = 0): Pt {
  return { x: ((gx - gy) * TW) / 2, y: ((gx + gy) * TH) / 2 - gz * ZH };
}

/** Screen pixels (already in world pixel space) back to a fractional grid position on the floor. */
export function unproject(sx: number, sy: number): Pt {
  const a = sx / (TW / 2);
  const b = sy / (TH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Pixel bounds of a scene's floor plus its back walls, so the camera can fit it. */
export function sceneBounds(cols: number, rows: number, wallHeight: number): { minX: number; minY: number; maxX: number; maxY: number } {
  const corners = [project(0, 0, wallHeight), project(cols, 0, wallHeight), project(0, rows, wallHeight), project(cols, rows, 0), project(0, rows, 0), project(cols, 0, 0)];
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    maxX: Math.max(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxY: Math.max(...corners.map((c) => c.y)),
  };
}

/* ------------------------------------ colour ------------------------------------ */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Multiply a colour by a factor (below 1 darkens, above 1 lightens towards white). */
export function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (factor <= 1) return rgbToHex(r * factor, g * factor, b * factor);
  const t = factor - 1;
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

/** Small deterministic random generator so decorations (moss, marble) look the same every frame. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
