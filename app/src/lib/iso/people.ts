import type { Skin } from "@/lib/world/types";
import { hashString, seeded, shade } from "./geometry";

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

/** Hair styles from before the editor existed still draw: "short" is a low cut. */
export function normalHair(h: Skin["hairStyle"]): "lowcut" | "bald" | "curls" | "afro" | "locs" | "braids" | "classic" | "bun" {
  return h === "short" ? "lowcut" : h;
}

const SHOES: Record<NonNullable<Skin["outfit"]>, string> = { casual: "#f1f1ec", hoodie: "#e6e6e0", office: "#1b1d20", chill: "#e9e9e4", sitework: "#5a4630" };

/** The fabric pattern, drawn over whatever shape is currently the clip. Deterministic, so it never flickers. */
function drawFabric(ctx: Ctx, fabric: NonNullable<Skin["fabric"]>, base: string, x0: number, y0: number, x1: number, y1: number): void {
  if (fabric === "plain") return;
  ctx.save();
  if (fabric === "ankara") {
    const a = shade(base, 0.62);
    const gold = "#f2c14e";
    let row = 0;
    for (let yy = y0; yy < y1; yy += 4.2, row++) {
      for (let xx = x0 + (row % 2) * 2.4; xx < x1; xx += 4.8) {
        ctx.fillStyle = row % 3 === 0 ? gold : a;
        ctx.beginPath();
        ctx.arc(xx, yy, 1.35, 0, Math.PI * 2);
        ctx.fill();
        if (row % 3 === 1) {
          ctx.fillStyle = "#f6efe0";
          ctx.beginPath();
          ctx.moveTo(xx, yy - 1.5);
          ctx.lineTo(xx + 1.2, yy);
          ctx.lineTo(xx, yy + 1.5);
          ctx.lineTo(xx - 1.2, yy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  } else if (fabric === "adire") {
    const rnd = seeded(hashString(`adire${base}`));
    ctx.fillStyle = "rgba(20,35,80,0.45)";
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let i = 0; i < 14; i++) {
      const cx = x0 + rnd() * (x1 - x0);
      const cy = y0 + rnd() * (y1 - y0);
      for (const r of [3.4, 2.1, 0.9]) {
        ctx.strokeStyle = r > 2 ? "rgba(235,242,250,0.55)" : "rgba(235,242,250,0.8)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else {
    // Aso-oke: narrow woven bands with gold thread
    for (let xx = x0; xx < x1; xx += 3.6) {
      ctx.fillStyle = "rgba(212,166,42,0.85)";
      ctx.fillRect(xx, y0, 0.9, y1 - y0);
      ctx.fillStyle = "rgba(255,244,214,0.5)";
      ctx.fillRect(xx + 1.8, y0, 0.5, y1 - y0);
    }
  }
  ctx.restore();
}

/** A limb as a tapered quad from (x1, y1) to (x2, y2) with widths w1 and w2. */
function limb(ctx: Ctx, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x1 - w1 / 2, y1);
  ctx.lineTo(x1 + w1 / 2, y1);
  ctx.lineTo(x2 + w2 / 2, y2);
  ctx.lineTo(x2 - w2 / 2, y2);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws one person in the low-poly style at screen position (x, y) = the point between their feet. About 66
 * world pixels tall with real proportions (long legs, shoulders, arms with hands), like the characters in the
 * reference game. Flat-shaded shapes only, so it stays crisp at any zoom.
 */
export function drawPerson(ctx: Ctx, x: number, y: number, look: Skin, s: PersonState): void {
  const woman = look.body === "woman";
  const outfit = look.outfit ?? "casual";
  const fabric = look.fabric ?? "plain";
  const hair = normalHair(look.hairStyle);
  const swing = s.walking ? Math.sin(s.t * 0.014) : 0;
  const bob = s.walking ? Math.abs(Math.sin(s.t * 0.014)) * 1.4 : 0;
  // Which way the face points on screen: away from the camera when moving "up" the screen.
  const sdx = s.fx - s.fy;
  const sdy = s.fx + s.fy;
  const away = sdy < -0.01;
  const lean = Math.max(-1, Math.min(1, sdx)) * 1.5;

  const skin = look.skin;
  const skinD = shade(skin, 0.86);
  const lift = s.seated ? 9 : 0;
  const top = look.top;
  const pants = look.pants;
  const shoes = look.shoes ?? SHOES[outfit];
  const shorts = outfit === "chill";

  // Shadow
  ctx.fillStyle = "rgba(20,30,25,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const hipY = y - 30 - bob + lift;
  const shY = hipY - 20;
  const sh = woman ? 7.0 : 8.6; // half shoulder width
  const wa = woman ? 5.2 : 6.6; // half waist
  const hp = woman ? 7.4 : 6.9; // half hip

  // Legs and shoes
  if (!s.seated) {
    for (const side of [-1, 1] as const) {
      const fx = x + side * (woman ? 3.0 : 3.3);
      const sw = swing * side * 2.6;
      const legTop = hipY;
      const legBottom = y - 3.2 - bob;
      const fill = side === -1 ? shade(pants, 0.84) : pants;
      if (shorts) {
        limb(ctx, fx, legTop, woman ? 5.4 : 5.8, fx + sw * 0.3, y - 17 - bob, woman ? 5.2 : 5.6, fill);
        limb(ctx, fx + sw * 0.3, y - 17 - bob, 4.0, fx + sw * 0.5, legBottom, 3.6, side === -1 ? skinD : skin);
      } else {
        limb(ctx, fx, legTop, woman ? 5.6 : 6.0, fx + sw * 0.5, legBottom, woman ? 4.0 : 4.6, fill);
      }
      ctx.fillStyle = shoes;
      roundRect(ctx, fx + sw * 0.6 - 3.8, y - 4.2 - bob + Math.min(0, sw * 0.2), 7.6, outfit === "sitework" ? 5 : 4, 2);
      if (outfit !== "sitework") {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(fx + sw * 0.6 - 3.8, y - 1.6 - bob + Math.min(0, sw * 0.2), 7.6, 1.2);
      }
    }
  }

  // Shape of the torso, reused for the fabric clip
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(x - sh, shY + 1.5);
    ctx.quadraticCurveTo(x - sh, shY - 0.6, x - sh + 2.4, shY - 0.6);
    ctx.lineTo(x + sh - 2.4, shY - 0.6);
    ctx.quadraticCurveTo(x + sh, shY - 0.6, x + sh, shY + 1.5);
    ctx.lineTo(x + wa, hipY - 9);
    ctx.lineTo(x + hp, hipY + 1.2);
    ctx.lineTo(x - hp, hipY + 1.2);
    ctx.lineTo(x - wa, hipY - 9);
    ctx.closePath();
  };

  // Sleeves and arms (behind the torso first)
  const longSleeve = outfit === "hoodie" || outfit === "office";
  const armLen = 21;
  const arm = (side: -1 | 1, front: boolean) => {
    const ax = x + side * (sh + 1.0);
    const hand = hipY - 4 + (s.walking ? swing * side * -2.4 : 0);
    const handX = ax + side * 0.8;
    const sleeveEnd = longSleeve ? hand - 3 : shY + 9;
    const sleeveCol = front || side === 1 ? top : shade(top, 0.84);
    // Bare arm, then sleeve on top
    limb(ctx, ax, shY + 1.5, 4.2, handX, hand, 3.5, side === -1 ? skinD : skin);
    limb(ctx, ax, shY + 1.5, 4.8, ax + side * 0.3, sleeveEnd, longSleeve ? 4.4 : 4.6, sleeveCol);
    if (fabric !== "plain" && !longSleeve) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(ax - 2.6, shY + 1, 5.2, sleeveEnd - shY);
      ctx.clip();
      drawFabric(ctx, fabric, top, ax - 3, shY, ax + 3, sleeveEnd);
      ctx.restore();
    }
    ctx.fillStyle = side === -1 ? skinD : skin;
    ctx.beginPath();
    ctx.arc(handX, hand + 1.6, 2.2, 0, Math.PI * 2);
    ctx.fill();
  };
  arm(-1, false);
  void armLen;

  // Torso
  torso();
  ctx.fillStyle = top;
  ctx.fill();
  ctx.save();
  torso();
  ctx.clip();
  drawFabric(ctx, fabric, top, x - hp, shY - 1, x + hp, hipY + 2);
  // A lighter panel on the side facing the light
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x - hp, shY - 1, 5.6, 24);
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(x + hp - 4.4, shY - 1, 5, 24);
  // Outfit details
  if (outfit === "hoodie" && !away) {
    ctx.fillStyle = shade(top, 0.8);
    roundRect(ctx, x - 5, hipY - 8, 10, 6, 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(x - 2.2, shY + 1, 0.8, 5);
    ctx.fillRect(x + 1.4, shY + 1, 0.8, 5);
  } else if (outfit === "office") {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x - 0.4, shY, 0.8, 22);
    if (!away) {
      if (!woman) {
        ctx.fillStyle = "#2d5d41";
        ctx.beginPath();
        ctx.moveTo(x - 1.2, shY + 0.5);
        ctx.lineTo(x + 1.2, shY + 0.5);
        ctx.lineTo(x + 1.8, shY + 12);
        ctx.lineTo(x, shY + 14);
        ctx.lineTo(x - 1.8, shY + 12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#f4f6f3";
      ctx.beginPath();
      ctx.moveTo(x - 3.4, shY - 0.6);
      ctx.lineTo(x, shY + 3.2);
      ctx.lineTo(x - 0.4, shY - 0.6);
      ctx.moveTo(x + 3.4, shY - 0.6);
      ctx.lineTo(x, shY + 3.2);
      ctx.lineTo(x + 0.4, shY - 0.6);
      ctx.fill();
    }
  } else if (outfit === "sitework") {
    // Hi-vis vest with reflective bands over a plain tee
    ctx.fillStyle = "#f5a623";
    ctx.fillRect(x - hp, shY - 1, hp * 2, 24);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(x - hp, shY + 6, hp * 2, 1.8);
    ctx.fillRect(x - hp, shY + 13, hp * 2, 1.8);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x - 0.4, shY, 0.8, 22);
  }
  ctx.restore();
  // Neckline
  if (!away) {
    ctx.fillStyle = skinD;
    ctx.beginPath();
    ctx.ellipse(x, shY - 0.4, 3.4, outfit === "office" ? 2.4 : 2.0, 0, 0, Math.PI);
    ctx.fill();
  }
  arm(1, true);

  // Neck
  ctx.fillStyle = skinD;
  roundRect(ctx, x - 2.3 + lean * 0.2, shY - 4.2, 4.6, 5, 1.4);

  // Head
  const hx = x + lean * 0.5;
  const hy = shY - 9.6;
  const rx = woman ? 5.4 : 5.8;
  const ry = 6.7;
  ctx.fillStyle = look.hair;
  const strands = (count: number, len: number, braided: boolean, frontLayer: boolean) => {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const sx = hx + (t - 0.5) * (rx * 2 + 1.2);
      const sideBias = Math.abs(t - 0.5) * 2; // outer strands hang longer at the sides
      const l = len * (0.7 + sideBias * 0.3);
      if (frontLayer === away || (!away && sideBias > 0.78) || away) {
        const top0 = hy - 2.4 + (1 - sideBias) * 1.2;
        for (let k = 0; k < l / 2.6; k++) {
          ctx.fillStyle = braided && k % 2 === 0 ? shade(look.hair, 1.35) : look.hair;
          ctx.beginPath();
          ctx.ellipse(sx, top0 + k * 2.6, 1.15, 1.7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };
  // Hair behind the head
  if (hair === "afro") {
    ctx.beginPath();
    ctx.arc(hx, hy - 1.6, 9.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (hair === "bun") {
    ctx.beginPath();
    ctx.arc(hx, hy - 8.6, 3.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (hair === "locs") {
    strands(9, 17, false, false);
  } else if (hair === "braids") {
    strands(9, 21, true, false);
  } else if (hair === "classic" && woman) {
    // A bob that frames the face and ends at the chin
    roundRect(ctx, hx - rx - 1.4, hy - 3, rx * 2 + 2.8, 8.5, 4);
  }

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skinD;
  ctx.beginPath();
  ctx.ellipse(hx + rx * 0.62, hy + 1.2, rx * 0.4, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ears
  ctx.fillStyle = skinD;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(hx + side * (rx + 0.4), hy + 0.6, 1.3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hair on top of the head
  ctx.fillStyle = look.hair;
  const cap = (rr: number) => {
    ctx.beginPath();
    if (away) ctx.ellipse(hx, hy - 0.6, rx + 0.4, ry + 0.4, 0, 0, Math.PI * 2);
    else ctx.ellipse(hx, hy - ry * 0.46 - rr * 0.1, rx + 0.5, ry * 0.58 + rr, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  };
  switch (hair) {
    case "lowcut":
      cap(-0.6);
      break;
    case "bald":
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.ellipse(hx - 1.6, hy - ry * 0.62, 2.4, 1.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "curls":
      cap(0.4);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.beginPath();
        ctx.arc(hx + Math.cos(a) * (rx + 0.4), hy - 1.4 + Math.sin(a) * (ry * 0.9), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "afro":
      cap(1.2);
      break;
    case "locs":
      cap(0.8);
      strands(9, 17, false, true);
      break;
    case "braids":
      cap(0.6);
      ctx.strokeStyle = shade(look.hair, 1.5);
      ctx.lineWidth = 0.6;
      if (!away) {
        ctx.beginPath();
        ctx.moveTo(hx, hy - ry - 0.6);
        ctx.lineTo(hx, hy - 2.6);
        ctx.stroke();
      }
      strands(9, 21, true, true);
      break;
    case "classic":
      cap(woman ? 0.8 : 0.2);
      if (!away) {
        ctx.strokeStyle = shade(look.hair, 1.6);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(hx - 2.2, hy - ry + 0.6);
        ctx.lineTo(hx - 1.2, hy - 3.2);
        ctx.stroke();
      }
      break;
    case "bun":
      cap(0.4);
      break;
  }

  // Face (only when turned towards the camera)
  if (!away) {
    const ex = hx + Math.max(-1, Math.min(1, sdx)) * 1.2;
    ctx.fillStyle = "#1b1410";
    ctx.beginPath();
    ctx.ellipse(ex - 2.3, hy + 0.5, 0.95, 1.15, 0, 0, Math.PI * 2);
    ctx.ellipse(ex + 2.3, hy + 0.5, 0.95, 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(look.hair, 0.9);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(ex - 3.4, hy - 1.5);
    ctx.lineTo(ex - 1.3, hy - 1.7);
    ctx.moveTo(ex + 1.3, hy - 1.7);
    ctx.lineTo(ex + 3.4, hy - 1.5);
    ctx.stroke();
    ctx.fillStyle = skinD;
    ctx.beginPath();
    ctx.ellipse(ex, hy + 2.2, 0.9, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = woman ? "#9b4a52" : shade(skin, 0.7);
    ctx.beginPath();
    ctx.ellipse(ex, hy + 4.2, 1.7, 0.7, 0, 0, Math.PI * 2);
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
