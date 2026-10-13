import type { Skin } from "@/lib/world/types";
import { shade } from "./geometry";

type Ctx = CanvasRenderingContext2D;

export interface PersonState {
  /** Milliseconds, for the walking cycle. */
  t: number;
  walking: boolean;
  /** Facing as a tile-space direction (fx, fy). */
  fx: number;
  fy: number;
  seated?: boolean;
}

/**
 * Draws one person in the low-poly style at screen position (x, y) = the point between their feet.
 * Flat-shaded shapes only, so it stays crisp at any zoom. All sizes are in world pixels.
 */
export function drawPerson(ctx: Ctx, x: number, y: number, look: Skin, s: PersonState): void {
  const swing = s.walking ? Math.sin(s.t * 0.014) : 0;
  const bob = s.walking ? Math.abs(Math.sin(s.t * 0.014)) * 1.6 : 0;
  // Which way the face points on screen: away from the camera when moving "up" the screen.
  const sdx = s.fx - s.fy;
  const sdy = s.fx + s.fy;
  const facingAway = sdy < -0.01;
  const lean = Math.max(-1, Math.min(1, sdx)) * 1.6;

  // Shadow
  ctx.fillStyle = "rgba(20,30,25,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const lift = s.seated ? 9 : 0;
  const top = look.top;
  const shoes = look.shoes ?? "#15171a";

  if (!s.seated) {
    // Legs
    for (const side of [-1, 1] as const) {
      const off = side * 3.6;
      const sw = swing * side * 3;
      ctx.fillStyle = side === -1 ? shade(look.pants, 0.86) : look.pants;
      roundRect(ctx, x + off - 2.8 + sw * 0.4, y - 16 - bob, 5.6, 15.5 + (sw > 0 ? -sw * 0.2 : 0), 2);
      ctx.fillStyle = shoes;
      roundRect(ctx, x + off - 3.2 + sw * 0.6, y - 3 - bob + Math.min(0, sw * 0.2), 6.4, 3.4, 1.6);
    }
  }

  const bodyY = y - 17 - bob + lift;

  // Arms behind the torso
  ctx.fillStyle = shade(top, 0.82);
  const armSwing = s.walking ? swing * 3 : 0;
  roundRect(ctx, x - 13 - armSwing * 0.3, bodyY - 15, 4.6, 14.5, 2.3);
  ctx.fillStyle = shade(look.skin, 0.9);
  roundRect(ctx, x - 12.8 - armSwing * 0.3, bodyY - 2, 4.2, 3.2, 1.6);

  // Torso
  ctx.fillStyle = top;
  roundRect(ctx, x - 9.5, bodyY - 18, 19, 18.5, 4.5);
  // Light panel on the side facing the light, for a flat-shaded look
  ctx.fillStyle = shade(top, 1.12);
  roundRect(ctx, x - 9.5, bodyY - 18, 7, 18.5, 4.5);

  // Arm in front
  ctx.fillStyle = top;
  roundRect(ctx, x + 8.6 + armSwing * 0.3, bodyY - 15, 4.6, 14.5, 2.3);
  ctx.fillStyle = look.skin;
  roundRect(ctx, x + 8.8 + armSwing * 0.3, bodyY - 2, 4.2, 3.2, 1.6);

  // Neck and head
  const headY = bodyY - 26;
  ctx.fillStyle = shade(look.skin, 0.88);
  roundRect(ctx, x - 2.6 + lean * 0.3, bodyY - 20, 5.2, 5, 1.5);

  // Hair behind the head (afro, bun)
  if (look.hairStyle === "afro") {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(x + lean * 0.4, headY - 1.5, 10.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (look.hairStyle === "bun") {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(x + lean * 0.4, headY - 10, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.ellipse(x + lean * 0.5, headY, 7.6, 8.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cheek shade
  ctx.fillStyle = shade(look.skin, 0.88);
  ctx.beginPath();
  ctx.ellipse(x + lean * 0.5 + 3.6, headY + 1.5, 3.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair on top
  ctx.fillStyle = look.hair;
  if (look.hairStyle !== "bald") {
    ctx.beginPath();
    if (facingAway) ctx.ellipse(x + lean * 0.5, headY - 0.5, 8, 8.8, 0, 0, Math.PI * 2);
    else ctx.ellipse(x + lean * 0.5, headY - 4.4, 8, 5.4, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    if (look.hairStyle === "braids" && !facingAway) {
      for (const k of [-6, -3, 3, 6]) roundRect(ctx, x + lean * 0.5 + k - 0.8, headY - 3, 1.8, 11, 0.9);
    }
  }

  // Face (only when turned towards the camera)
  if (!facingAway) {
    ctx.fillStyle = "#1b1410";
    const ex = lean * 0.5 + Math.max(-1, Math.min(1, sdx)) * 1.5;
    ctx.beginPath();
    ctx.arc(x + ex - 2.6, headY + 0.6, 1, 0, Math.PI * 2);
    ctx.arc(x + ex + 2.6, headY + 0.6, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

/** Small name pill above a character, like the @username bubbles in the reference game. */
export function drawNameTag(ctx: Ctx, x: number, y: number, text: string, accent = false): void {
  ctx.font = "600 11px Inter, system-ui, 'Segoe UI', Arial, sans-serif";
  const w = Math.ceil(ctx.measureText(text).width) + 14;
  const h = 17;
  ctx.fillStyle = accent ? "#2d5d41" : "rgba(255,255,255,0.94)";
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 8.5);
  ctx.fillStyle = accent ? "#ffffff" : "#17261c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 0.5);
}
