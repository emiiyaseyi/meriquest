import type { Dir, Scene, SceneObject, Skin, WallFeature } from "@/lib/world/types";
import { TH, TW, ZH, hashString, project, sceneBounds, seeded, shade, unproject, type Pt } from "./geometry";
import { drawNameTag, drawPerson, roundRect } from "./people";

type Ctx = CanvasRenderingContext2D;

export interface View {
  mode: "iso" | "flat";
  scale: number;
  ox: number;
  oy: number;
}

export interface Walker {
  x: number; // tile position (fractional while walking)
  y: number;
  fx: number; // facing, tile space
  fy: number;
  walking: boolean;
  look: Skin;
  name?: string;
}

export interface RenderOptions {
  mode: "iso" | "flat";
  width: number;
  height: number;
  time: number;
  player: Walker;
  hover?: { x: number; y: number } | null;
  path?: { x: number; y: number }[];
  /** Meristem logo (white version) for the moss wall. */
  logo?: CanvasImageSource | null;
  /** Names above people. */
  labels?: boolean;
  /** Device pixel ratio, for sharp drawing on high-resolution screens. */
  dpr?: number;
  /** Camera preset: zoom in (above 1) and look at this tile, as it appears in the turned view. */
  zoom?: number;
  focus?: { x: number; y: number } | null;
  /**
   * all: everything. static: only the background, floor and walls (cache this). dynamic: everything else,
   * drawn on top of a cached static layer.
   */
  layer?: "all" | "static" | "dynamic";
}

/* --------------------------------- view and picking --------------------------------- */

/**
 * How the room fits the canvas. A camera preset can zoom in (zoom above 1) and look at one tile of the room as it
 * appears in the turned view (focus), so that tile sits in the middle of the canvas.
 */
export function computeView(scene: Scene, mode: "iso" | "flat", width: number, height: number, zoom = 1, focus?: { x: number; y: number } | null): View {
  if (mode === "flat") {
    const pad = 12;
    const fit = Math.min((width - pad * 2) / scene.cols, (height - pad * 2) / scene.rows);
    if (zoom > 1 && focus) {
      const tile = fit * zoom;
      return { mode, scale: tile, ox: width / 2 - (focus.x + 0.5) * tile, oy: height / 2 - (focus.y + 0.5) * tile };
    }
    return { mode, scale: fit, ox: (width - scene.cols * fit) / 2, oy: (height - scene.rows * fit) / 2 };
  }
  const b = sceneBounds(scene.cols, scene.rows, scene.wallHeight);
  const pad = 28;
  const bw = b.maxX - b.minX + pad * 2;
  const bh = b.maxY - b.minY + pad * 2 + 20;
  const base = Math.min(width / bw, height / bh, 1.7);
  if (zoom > 1 && focus) {
    const scale = base * zoom;
    const p = project(focus.x + 0.5, focus.y + 0.5);
    return { mode, scale, ox: width / 2 - p.x * scale, oy: height / 2 - p.y * scale };
  }
  const scale = base;
  return { mode, scale, ox: (width - (b.maxX - b.minX) * scale) / 2 - b.minX * scale, oy: (height - (b.maxY - b.minY) * scale) / 2 - b.minY * scale + 8 * scale };
}

/** Canvas pixel to fractional tile coordinates on the floor. */
export function screenToTile(view: View, sx: number, sy: number): Pt {
  const wx = (sx - view.ox) / view.scale;
  const wy = (sy - view.oy) / view.scale;
  return view.mode === "flat" ? { x: wx, y: wy } : unproject(wx, wy);
}

/* ---------------------------------- drawing helpers ---------------------------------- */

const P = project;
const PERSON_SCALE = 1.35;

function poly(ctx: Ctx, pts: Pt[], fill: string | CanvasGradient, stroke?: string, lw = 0.8): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

interface FaceColors {
  top: string;
  left: string; // face looking towards +y
  right: string; // face looking towards +x
}

function tones(base: string): FaceColors {
  return { top: shade(base, 1.08), left: shade(base, 0.86), right: shade(base, 0.7) };
}

/** An axis-aligned box on the floor: footprint (x, y, w, d), height h, starting at height z0. */
function box(ctx: Ctx, x: number, y: number, w: number, d: number, h: number, z0: number, base: string | FaceColors, edge = true): void {
  const c = typeof base === "string" ? tones(base) : base;
  const z1 = z0 + h;
  // Face looking towards +x
  poly(ctx, [P(x + w, y, z1), P(x + w, y + d, z1), P(x + w, y + d, z0), P(x + w, y, z0)], c.right, edge ? "rgba(0,0,0,0.12)" : undefined);
  // Face looking towards +y
  poly(ctx, [P(x, y + d, z1), P(x + w, y + d, z1), P(x + w, y + d, z0), P(x, y + d, z0)], c.left, edge ? "rgba(0,0,0,0.1)" : undefined);
  // Top
  poly(ctx, [P(x, y, z1), P(x + w, y, z1), P(x + w, y + d, z1), P(x, y + d, z1)], c.top, edge ? "rgba(0,0,0,0.08)" : undefined);
}

/**
 * Furniture and decoration made of a few boxes, so bought items look like objects in the room and not like pictures.
 * Each shape fits the footprint it is given and takes its main colour from the catalogue.
 */
function drawDecorModel(ctx: Ctx, model: string, x: number, y: number, w: number, d: number, color: string): void {
  const dark = shade(color, 0.55);
  const light = shade(color, 1.25);
  const cx = x + w / 2;
  const cy = y + d / 2;
  switch (model) {
    case "desk":
    case "table": {
      const h = model === "desk" ? 0.72 : 0.62;
      for (const [lx, ly] of [[x + 0.08, y + 0.1], [x + w - 0.18, y + 0.1], [x + 0.08, y + d - 0.2], [x + w - 0.18, y + d - 0.2]]) box(ctx, lx, ly, 0.1, 0.1, h, 0, dark, false);
      box(ctx, x + 0.04, y + 0.06, w - 0.08, d - 0.12, 0.08, h, color);
      if (model === "desk") {
        box(ctx, cx - 0.3, cy - 0.04, 0.6, 0.05, 0.38, h + 0.08, "#1b1f23", false);
        box(ctx, cx - 0.26, cy - 0.02, 0.52, 0.02, 0.3, h + 0.12, "#3c6a96", false);
      }
      return;
    }
    case "chair": {
      box(ctx, x + 0.2, y + 0.2, w - 0.4, d - 0.4, 0.08, 0.38, color);
      box(ctx, x + 0.24, y + 0.24, 0.08, 0.08, 0.38, 0, dark, false);
      box(ctx, x + w - 0.32, y + d - 0.32, 0.08, 0.08, 0.38, 0, dark, false);
      box(ctx, x + 0.2, y + 0.2, 0.08, d - 0.4, 0.5, 0.46, light);
      return;
    }
    case "sofa": {
      box(ctx, x + 0.04, y + 0.08, w - 0.08, d - 0.16, 0.3, 0, dark);
      box(ctx, x + 0.1, y + 0.12, w - 0.2, d - 0.24, 0.14, 0.3, color);
      box(ctx, x + 0.04, y + 0.08, w - 0.08, 0.2, 0.34, 0.3, light);
      box(ctx, x + 0.04, y + 0.08, 0.16, d - 0.16, 0.2, 0.3, light);
      box(ctx, x + w - 0.2, y + 0.08, 0.16, d - 0.16, 0.2, 0.3, light);
      return;
    }
    case "plant": {
      box(ctx, cx - 0.2, cy - 0.2, 0.4, 0.4, 0.3, 0, "#e7e2d6");
      box(ctx, cx - 0.3, cy - 0.3, 0.6, 0.6, 0.35, 0.3, "#3f8f4f");
      box(ctx, cx - 0.2, cy - 0.2, 0.4, 0.4, 0.3, 0.65, "#56a863");
      box(ctx, cx - 0.1, cy - 0.1, 0.2, 0.2, 0.25, 0.95, "#6cbf78");
      return;
    }
    case "lamp": {
      box(ctx, cx - 0.14, cy - 0.14, 0.28, 0.28, 0.05, 0, dark);
      box(ctx, cx - 0.03, cy - 0.03, 0.06, 0.06, 0.9, 0.05, dark, false);
      box(ctx, cx - 0.2, cy - 0.2, 0.4, 0.4, 0.28, 0.95, "#f7e7a8");
      return;
    }
    case "screen": {
      box(ctx, cx - 0.2, cy - 0.12, 0.4, 0.24, 0.05, 0, "#2b2f33");
      box(ctx, cx - 0.04, cy - 0.04, 0.08, 0.08, 0.3, 0.05, "#2b2f33", false);
      box(ctx, cx - 0.42, cy - 0.04, 0.84, 0.07, 0.5, 0.33, "#1b1f23");
      box(ctx, cx - 0.38, cy - 0.01, 0.76, 0.02, 0.42, 0.37, "#3c6a96", false);
      return;
    }
    case "frame": {
      box(ctx, x + 0.1, cy - 0.04, w - 0.2, 0.08, 1.1, 0.25, "#4b3a2a");
      box(ctx, x + 0.18, cy - 0.01, w - 0.36, 0.03, 0.94, 0.33, color, false);
      return;
    }
    case "rug": {
      box(ctx, x + 0.04, y + 0.04, w - 0.08, d - 0.08, 0.03, 0, color, false);
      box(ctx, x + 0.2, y + 0.2, w - 0.4, d - 0.4, 0.035, 0, light, false);
      return;
    }
    case "shelf": {
      box(ctx, x + 0.06, y + 0.1, w - 0.12, d - 0.2, 1.5, 0, color);
      for (const z of [0.4, 0.8, 1.2]) box(ctx, x + 0.1, y + 0.14, w - 0.2, d - 0.28, 0.03, z, dark, false);
      return;
    }
    case "cabinet": {
      box(ctx, x + 0.06, y + 0.1, w - 0.12, d - 0.2, 0.9, 0, color);
      box(ctx, x + 0.12, y + 0.08, w - 0.24, 0.03, 0.7, 0.1, light, false);
      return;
    }
    default:
      box(ctx, x + 0.12, y + 0.12, w - 0.24, d - 0.24, 0.5, 0, color);
  }
}

/** A circle or ellipse lying flat in the floor plane (drawn exactly in the isometric projection). */
function floorEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, z: number, fill: string, stroke?: string): void {
  const o = P(cx, cy, z);
  ctx.save();
  ctx.transform(TW / 2, TH / 2, -TW / 2, TH / 2, o.x, o.y);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Points on a wall plane. `wall` x means the wall at x = 0 (running along y); y means the wall at y = 0. */
function wp(wall: "x" | "y", along: number, z: number): Pt {
  return wall === "x" ? P(0, along, z) : P(along, 0, z);
}
function wallQuad(wall: "x" | "y", a0: number, a1: number, z0: number, z1: number): Pt[] {
  return [wp(wall, a0, z0), wp(wall, a1, z0), wp(wall, a1, z1), wp(wall, a0, z1)];
}

/* ------------------------------------- floors ------------------------------------- */

function drawFloor(ctx: Ctx, scene: Scene): void {
  const { cols, rows, floor } = scene;
  const base = floor === "marble" ? "#dde2df" : floor === "office" ? "#cfd6d4" : "#c9a679";
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const alt = (gx + gy) % 2 === 0;
      const rnd = seeded(hashString(`${scene.id}:${gx}:${gy}`))();
      let f = alt ? 1 : 0.965;
      f += (rnd - 0.5) * 0.03;
      poly(ctx, [P(gx, gy), P(gx + 1, gy), P(gx + 1, gy + 1), P(gx, gy + 1)], shade(base, f), "rgba(60,75,70,0.07)", 0.7);
    }
  }
  // The floor slab's thickness along the two front edges
  poly(ctx, [P(cols, 0, 0), P(cols, rows, 0), P(cols, rows, -0.4), P(cols, 0, -0.4)], "#9aa6a0");
  poly(ctx, [P(0, rows, 0), P(cols, rows, 0), P(cols, rows, -0.4), P(0, rows, -0.4)], "#b4beb8");
  if (floor === "marble") {
    // Dark inlays at tile corners, like the lobby floor in the photos
    for (let gy = 2; gy < rows; gy += 2) {
      for (let gx = 2; gx < cols; gx += 2) {
        const r = 0.13;
        poly(ctx, [P(gx - r, gy), P(gx, gy - r), P(gx + r, gy), P(gx, gy + r)], "#3c4a46");
      }
    }
  }
  if (floor === "office") {
    // Carpet-tile grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.6;
    for (let gx = 0; gx <= cols; gx += 1) {
      const a = P(gx, 0);
      const b = P(gx, rows);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

/* -------------------------------------- walls -------------------------------------- */

const WALL = "#f1f2ee";

function drawWalls(ctx: Ctx, scene: Scene, logo: CanvasImageSource | null | undefined): void {
  const H = scene.wallHeight;
  const t = 0.32;
  // Wall bodies: the inner faces are the faces looking towards +x (wall x) and +y (wall y)
  box(ctx, -t, -t, t, scene.rows + t, H, 0, { top: "#fafbf8", left: WALL, right: WALL }, false);
  box(ctx, 0, -t, scene.cols, t, H, 0, { top: "#fafbf8", left: shade(WALL, 0.93), right: shade(WALL, 0.9) }, false);
  // Skirting boards
  poly(ctx, wallQuad("x", 0, scene.rows, 0, 0.14), "#cfd3cd");
  poly(ctx, wallQuad("y", 0, scene.cols, 0, 0.14), "#c3c8c1");
  // Ceiling line shadow
  poly(ctx, wallQuad("x", 0, scene.rows, H - 0.1, H), "rgba(0,0,0,0.05)");
  poly(ctx, wallQuad("y", 0, scene.cols, H - 0.1, H), "rgba(0,0,0,0.07)");
  for (const f of scene.features) drawFeature(ctx, scene, f, logo);
}

function drawFeature(ctx: Ctx, scene: Scene, f: WallFeature, logo: CanvasImageSource | null | undefined): void {
  const H = scene.wallHeight;
  const dark = f.wall === "y" ? 0.9 : 1;
  const q = (a0: number, a1: number, z0: number, z1: number) => wallQuad(f.wall, a0, a1, z0, z1);

  switch (f.kind) {
    case "windows": {
      const z0 = 0.4;
      const z1 = H - 0.35;
      const g = ctx.createLinearGradient(0, wp(f.wall, f.from, z1).y, 0, wp(f.wall, f.from, z0).y);
      g.addColorStop(0, "#a9c6dc");
      g.addColorStop(0.55, "#d3e3ec");
      g.addColorStop(1, "#e9efe9");
      poly(ctx, q(f.from, f.to, z0, z1), g, "#1c2226", 1.6);
      // Distant greenery along the sill
      ctx.fillStyle = "rgba(70,115,70,0.35)";
      const rnd = seeded(hashString(`win${f.from}${f.wall}`));
      for (let a = f.from; a < f.to; a += 0.5) {
        const h = 0.25 + rnd() * 0.45;
        poly(ctx, [wp(f.wall, a, z0), wp(f.wall, a + 0.5, z0), wp(f.wall, a + 0.5, z0 + h), wp(f.wall, a, z0 + h + 0.1)], "rgba(70,115,70,0.32)");
      }
      // Mullions and a transom
      const step = 1.5;
      for (let a = f.from; a <= f.to + 0.01; a += step) poly(ctx, q(a - 0.04, a + 0.04, z0, z1), "#1c2226");
      poly(ctx, q(f.from, f.to, z1 - 0.9, z1 - 0.84), "#1c2226");
      // Glass glare
      ctx.save();
      ctx.globalAlpha = 0.28;
      for (let a = f.from + 0.4; a < f.to - 0.5; a += 3) poly(ctx, [wp(f.wall, a, z0), wp(f.wall, a + 0.5, z0), wp(f.wall, a + 1.3, z1), wp(f.wall, a + 0.8, z1)], "#ffffff");
      ctx.restore();
      break;
    }
    case "moss": {
      const z0 = 0.2;
      const z1 = H - 0.45;
      poly(ctx, q(f.from, f.to, z0, z1), "#3d6b2d", "#2c4d22", 1);
      ctx.save();
      ctx.beginPath();
      const clip = q(f.from, f.to, z0, z1);
      ctx.moveTo(clip[0].x, clip[0].y);
      for (const p of clip.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.clip();
      const rnd = seeded(hashString("moss"));
      const palette = ["#2a5224", "#4f8a2f", "#8fae2e", "#a6bb3a", "#3a6a2a", "#1f4620"];
      for (let i = 0; i < 70; i++) {
        const cx = f.from + rnd() * (f.to - f.from);
        const cz = z0 + rnd() * (z1 - z0);
        const r = 0.35 + rnd() * 0.8;
        const pts: Pt[] = [];
        const n = 7;
        for (let k = 0; k < n; k++) {
          const ang = (k / n) * Math.PI * 2;
          const rr = r * (0.6 + rnd() * 0.6);
          pts.push(wp(f.wall, cx + Math.cos(ang) * rr * 1.1, cz + Math.sin(ang) * rr * 0.8));
        }
        poly(ctx, pts, palette[Math.floor(rnd() * palette.length)]);
      }
      ctx.restore();
      // Logo, drawn onto the wall plane
      if (logo) {
        const lw = Math.min(3.2, (f.to - f.from) * 0.55);
        const lh = lw * (664 / 2676) * 1.0;
        const a0 = f.from + ((f.to - f.from) - lw) / 2;
        const zt = z1 - (z1 - z0) * 0.32;
        // On the x wall the screen runs right-to-left as y grows, so start at the far end and walk back
        const sign = f.wall === 'x' ? -1 : 1;
        const startA = f.wall === 'x' ? a0 + lw : a0;
        const o = wp(f.wall, startA, zt);
        const ux = wp(f.wall, startA + sign, zt);
        const ax = ux.x - o.x;
        const ay = ux.y - o.y;
        ctx.save();
        ctx.transform((ax * lw) / 1, (ay * lw) / 1, 0, ZH * lh, o.x, o.y);
        ctx.globalAlpha = 0.96;
        ctx.drawImage(logo, 0, 0, 1, 1);
        ctx.restore();
      }
      break;
    }
    case "slats": {
      const z0 = 0.14;
      const z1 = H - 0.1;
      poly(ctx, q(f.from, f.to, z0, z1), "#8f6a43");
      const rnd = seeded(hashString(`slat${f.from}`));
      for (let a = f.from; a < f.to; a += 0.2) {
        const c = shade("#b58b5a", 0.9 + rnd() * 0.22) as string;
        poly(ctx, q(a, a + 0.15, z0, z1), c);
        // Warm accent lights set into the slats
        if (rnd() > 0.78) poly(ctx, q(a + 0.04, a + 0.1, z0 + 0.5 + rnd() * 1.7, z0 + 0.95 + rnd() * 1.7), "#ffd9a0");
      }
      break;
    }
    case "liftdoors": {
      const z1 = 2.75;
      poly(ctx, q(f.from - 0.3, f.to + 0.3, 0, z1 + 0.3), "#d9dcd7", "rgba(0,0,0,0.15)"); // marble surround
      const mid = (f.from + f.to) / 2;
      for (const [a0, a1] of [[f.from + 0.15, mid - 0.1], [mid + 0.1, f.to - 0.15]] as const) {
        const g = ctx.createLinearGradient(wp(f.wall, a0, 1).x, 0, wp(f.wall, a1, 1).x, 0);
        g.addColorStop(0, shade("#a9aeab", 1.1 * dark));
        g.addColorStop(0.5, shade("#c9cdca", dark));
        g.addColorStop(1, shade("#9ea3a0", dark));
        poly(ctx, q(a0, a1, 0.05, z1), g, "#5d6361", 1);
        poly(ctx, q((a0 + a1) / 2 - 0.02, (a0 + a1) / 2 + 0.02, 0.05, z1), "#6f7573");
      }
      poly(ctx, q(mid - 0.12, mid + 0.12, 1.1, 1.5), "#2b2f31");
      poly(ctx, q(mid - 0.04, mid + 0.04, 1.2, 1.28), "#8db74e");
      poly(ctx, q(f.from + 0.5, f.to - 0.5, z1 + 0.05, z1 + 0.22), "#1e2124"); // floor indicator
      break;
    }
    case "screen": {
      const z0 = 0.9;
      const z1 = 2.6;
      poly(ctx, q(f.from, f.to, z0, z1), "#15181b", "#0b0d0f", 1.2);
      const g = ctx.createLinearGradient(wp(f.wall, f.from, z1).x, wp(f.wall, f.from, z1).y, wp(f.wall, f.to, z0).x, wp(f.wall, f.to, z0).y);
      g.addColorStop(0, "#26313a");
      g.addColorStop(0.5, "#1a2128");
      g.addColorStop(1, "#2a363f");
      poly(ctx, q(f.from + 0.06, f.to - 0.06, z0 + 0.06, z1 - 0.06), g);
      ctx.save();
      ctx.globalAlpha = 0.12;
      poly(ctx, [wp(f.wall, f.from + 0.1, z1 - 0.06), wp(f.wall, f.from + 0.9, z1 - 0.06), wp(f.wall, f.from + 0.4, z0 + 0.06), wp(f.wall, f.from + 0.1, z0 + 0.06)], "#ffffff");
      ctx.restore();
      break;
    }
    case "glass": {
      // Glass-fronted offices: pale tinted glass in white frames, with a door
      const z1 = 2.7;
      const g = ctx.createLinearGradient(0, wp(f.wall, f.from, z1).y, 0, wp(f.wall, f.from, 0.1).y);
      g.addColorStop(0, "#c9dde6");
      g.addColorStop(1, "#e4eeee");
      poly(ctx, q(f.from, f.to, 0.14, z1), g, "#f4f6f3", 2.4);
      for (let a = f.from; a <= f.to + 0.01; a += 1.3) poly(ctx, q(a - 0.05, a + 0.05, 0.14, z1), "#f4f6f3");
      poly(ctx, q(f.from, f.to, 1.45, 1.5), "#f4f6f3");
      const mid = (f.from + f.to) / 2;
      poly(ctx, q(mid - 0.45, mid + 0.45, 0.14, 2.35), "rgba(255,255,255,0.35)", "#f4f6f3", 2);
      poly(ctx, q(mid + 0.28, mid + 0.34, 1.0, 1.25), "#8d9598");
      break;
    }
  }
}

/* --------------------------------------- objects --------------------------------------- */

type Draw = { key: number; draw: () => void };

function chairBox(ctx: Ctx, cx: number, cy: number, dir: Dir, base: string): void {
  // Seat, backrest on the side opposite to the way the chair faces, and a stem
  const back = dir === 0 ? [-0.34, -0.26, 0.12, 0.52] : dir === 2 ? [0.22, -0.26, 0.12, 0.52] : dir === 1 ? [-0.26, -0.34, 0.52, 0.12] : [-0.26, 0.22, 0.52, 0.12];
  box(ctx, cx - 0.04, cy - 0.04, 0.08, 0.08, 0.34, 0, "#8d9296", false);
  const drawBack = () => box(ctx, cx + back[0], cy + back[1], back[2], back[3], 0.62, 0.42, shade(base, 1.05));
  // The backrest is behind the seat for dir 0/1 (drawn first) and in front for dir 2/3
  if (dir === 0 || dir === 1) drawBack();
  box(ctx, cx - 0.27, cy - 0.27, 0.54, 0.54, 0.1, 0.36, base);
  if (dir === 2 || dir === 3) drawBack();
}

function plantDraw(ctx: Ctx, cx: number, cy: number, time: number, size = 1): void {
  box(ctx, cx - 0.26, cy - 0.26, 0.52, 0.52, 0.5, 0, "#f3f3ef");
  const base = P(cx, cy, 0.5);
  const rnd = seeded(hashString(`plant${cx},${cy}`));
  const sway = Math.sin(time / 900 + cx) * 1.2;
  const colors = ["#2f6b36", "#3f8240", "#5aa04a", "#276030"];
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + rnd();
    const len = (26 + rnd() * 26) * size;
    const lean = Math.cos(ang) * (10 + rnd() * 10);
    const tipX = base.x + lean + sway * (len / 40);
    const tipY = base.y - len * (0.85 + rnd() * 0.3);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(base.x - 2.2, base.y);
    ctx.quadraticCurveTo(base.x + lean * 0.2 - 5, base.y - len * 0.55, tipX, tipY);
    ctx.quadraticCurveTo(base.x + lean * 0.2 + 5, base.y - len * 0.5, base.x + 2.2, base.y);
    ctx.closePath();
    ctx.fill();
  }
}

/** Splits long objects into one-tile pieces so people sort correctly in front of and behind them. */
function segments(o: SceneObject): { x: number; y: number; first: boolean; last: boolean }[] {
  const w = o.w ?? 1;
  const d = o.d ?? 1;
  const out: { x: number; y: number; first: boolean; last: boolean }[] = [];
  if (w >= d) for (let i = 0; i < w; i++) out.push({ x: o.x + i, y: o.y, first: i === 0, last: i === w - 1 });
  else for (let i = 0; i < d; i++) out.push({ x: o.x, y: o.y + i, first: i === 0, last: i === d - 1 });
  return out;
}

function objectDraws(ctx: Ctx, o: SceneObject, time: number): Draw[] {
  const w = o.w ?? 1;
  const d = o.d ?? 1;
  const dir = o.dir ?? 0;
  const cx = o.x + w / 2;
  const cy = o.y + d / 2;
  const key = (x: number, y: number, ww = 1, dd = 1) => x + ww / 2 + y + dd / 2;
  const longAlongX = w >= d;

  switch (o.kind) {
    case "desk":
      return segments(o).map((s) => ({
        key: key(s.x, s.y),
        draw: () => {
          // Two white pedestals (at the ends of the run), a light wooden top, laptop and monitor
          if (s.first) box(ctx, s.x + 0.08, s.y + 0.14, 0.55, 0.72, 0.66, 0, "#f2f2ee");
          if (s.last) box(ctx, s.x + 0.37, s.y + 0.14, 0.55, 0.72, 0.66, 0, "#f2f2ee");
          box(ctx, s.x, s.y + 0.06, 1, 0.88, 0.07, 0.66, { top: "#dccfb6", left: "#c9bca4", right: "#a99d86" }, false);
          const mid = s.x + 0.5;
          if (s.first || (o.w ?? 1) === 1) {
            box(ctx, mid - 0.32, s.y + 0.4, 0.64, 0.05, 0.42, 0.78, "#1b1f23", false);
            box(ctx, mid - 0.28, s.y + 0.415, 0.56, 0.02, 0.34, 0.82, "#34506a", false);
            box(ctx, mid - 0.18, s.y + 0.6, 0.36, 0.14, 0.02, 0.73, "#2b2f33", false);
          } else if (s.last) {
            box(ctx, s.x + 0.25, s.y + 0.38, 0.28, 0.3, 0.05, 0.73, "#f7f7f4", false);
          }
        },
      }));
    case "partition":
      return segments(o).map((s) => ({
        key: key(s.x, s.y) + 0.001,
        draw: () => {
          // Green dividing panel with a grey shelf on top (as in the open-plan photos)
          box(ctx, s.x, s.y + 0.35, 1, 0.3, 1.28, 0, { top: "#9bc24c", left: "#7ea63a", right: "#6a8d31" }, false);
          if (!s.last || (o.w ?? 1) === 1) box(ctx, s.x + 0.05, s.y + 0.28, 0.9, 0.44, 0.34, 1.28, "#a9b1b4", false);
        },
      }));
    case "chair":
      return [{ key: key(o.x, o.y) + 0.02, draw: () => chairBox(ctx, cx, cy, dir, "#383c41") }];
    case "armchair":
      return [
        {
          key: key(o.x, o.y),
          draw: () => {
            const base = "#3e4a49";
            const back = dir === 0 ? [0.0, 0.05, 0.22, 0.9] : dir === 2 ? [0.78, 0.05, 0.22, 0.9] : dir === 1 ? [0.05, 0.0, 0.9, 0.22] : [0.05, 0.78, 0.9, 0.22];
            if (dir === 0 || dir === 1) box(ctx, o.x + back[0], o.y + back[1], back[2], back[3], 0.85, 0, base);
            box(ctx, o.x + 0.12, o.y + 0.12, 0.76, 0.76, 0.42, 0, shade(base, 1.1));
            if (dir === 2 || dir === 3) box(ctx, o.x + back[0], o.y + back[1], back[2], back[3], 0.85, 0, base);
          },
        },
      ];
    case "plant":
      return [{ key: key(o.x, o.y), draw: () => plantDraw(ctx, cx, cy, time) }];
    case "reception":
      return segments(o).map((s) => ({
        key: key(s.x, s.y),
        draw: () => {
          box(ctx, s.x + 0.1, s.y, 0.8, 1, 1.05, 0, { top: "#ffffff", left: "#f1f2ee", right: "#d8dad5" }, false);
          box(ctx, s.x + 0.1, s.y, 0.3, 1, 1.28, 0, { top: "#f6f7f4", left: "#e7e9e3", right: "#c9cdc7" }, false);
          if (!s.first && !s.last) box(ctx, s.x + 0.55, s.y + 0.25, 0.3, 0.45, 0.04, 1.05, "#2b2f33", false);
        },
      }));
    case "planter":
      return segments(o).map((s) => ({
        key: key(s.x, s.y),
        draw: () => {
          box(ctx, s.x, s.y + 0.2, 1, 0.6, 0.5, 0, "#4a5250", false);
          const rnd = seeded(hashString(`pl${s.x},${s.y}`));
          for (let i = 0; i < 5; i++) {
            const p = P(s.x + 0.1 + rnd() * 0.8, s.y + 0.25 + rnd() * 0.5, 0.5);
            ctx.fillStyle = ["#3f8240", "#2f6b36", "#5aa04a"][i % 3];
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - 6, 10, 9, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        },
      }));
    case "turnstile":
      return [
        {
          key: key(o.x, o.y),
          draw: () => {
            box(ctx, o.x + 0.28, o.y + 0.15, 0.44, 0.7, 0.95, 0, { top: "#e1e5e6", left: "#aab1b4", right: "#8d9598" }, false);
            box(ctx, o.x + 0.36, o.y + 0.3, 0.28, 0.4, 0.04, 0.95, "#2f363a", false);
            const p = P(o.x + 0.5, o.y + 0.5, 0.97);
            ctx.fillStyle = "#8db74e";
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 3.5, 1.8, 0, 0, Math.PI * 2);
            ctx.fill();
          },
        },
      ];
    case "sofa":
      return segments(o).map((s) => ({
        key: key(s.x, s.y),
        draw: () => {
          const base = "#3c4043";
          const backAxis = dir === 0 || dir === 2;
          const bx = dir === 2 ? s.x + 0.72 : s.x;
          const by = dir === 3 ? s.y + 0.72 : s.y;
          const bw = backAxis ? 0.28 : 1;
          const bd = backAxis ? 1 : 0.28;
          if (dir === 0 || dir === 1) box(ctx, bx, by, bw, bd, 0.95, 0, base);
          box(ctx, s.x + (dir === 0 ? 0.25 : 0), s.y + (dir === 1 ? 0.25 : 0), backAxis ? 0.75 : 1, backAxis ? 1 : 0.75, 0.46, 0, shade(base, 1.14));
          if (dir === 2 || dir === 3) box(ctx, bx, by, bw, bd, 0.95, 0, base);
          if (longAlongX === backAxis) {
            /* arms drawn only on the ends */
          }
          if ((s.first || s.last) && !backAxis) box(ctx, s.first ? s.x : s.x + 0.78, s.y, 0.22, 1, 0.66, 0, shade(base, 0.95));
          if (s.x % 2 === 0 || s.y % 2 === 0) box(ctx, s.x + 0.3, s.y + 0.3, 0.3, 0.3, 0.2, 0.46, "#ece6da", false);
        },
      }));
    case "coffeetable":
      return [
        {
          key: key(o.x, o.y, w, d) - 0.3,
          draw: () => {
            floorEllipse(ctx, cx, cy, (w - 0.2) / 2, (d - 0.15) / 2, 0.36, "#2e3235");
            floorEllipse(ctx, cx, cy, (w - 0.2) / 2, (d - 0.15) / 2, 0.42, "#e2d8c5", "rgba(0,0,0,0.12)");
          },
        },
      ];
    case "boardtable":
      return [
        {
          key: key(o.x, o.y, w, d),
          draw: () => {
            floorEllipse(ctx, cx, cy, w / 2 - 0.05, d / 2 - 0.05, 0.55, "#2a2d30");
            box(ctx, cx - 0.35, cy - 0.35, 0.7, 0.7, 0.55, 0, "#26292c", false);
            floorEllipse(ctx, cx, cy, w / 2 - 0.05, d / 2 - 0.05, 0.8, "#3d4145", "rgba(0,0,0,0.25)");
            floorEllipse(ctx, cx, cy, w / 2 - 0.45, d / 2 - 0.45, 0.8, "#464b4f");
            // A few papers and glasses
            for (let i = 0; i < 6; i++) {
              const px = o.x + 0.9 + i * 0.85;
              box(ctx, px, o.y + 0.9, 0.3, 0.22, 0.015, 0.8, "#f5f5f1", false);
              box(ctx, px, o.y + d - 1.2, 0.3, 0.22, 0.015, 0.8, "#f5f5f1", false);
            }
          },
        },
      ];
    case "roundtable":
      return [
        {
          key: key(o.x, o.y, w, d),
          draw: () => {
            box(ctx, cx - 0.08, cy - 0.08, 0.16, 0.16, 0.7, 0, "#5b6064", false);
            floorEllipse(ctx, cx, cy, w / 2 - 0.1, d / 2 - 0.1, 0.72, "#e9e5db", "rgba(0,0,0,0.15)");
          },
        },
      ];
    case "shelf":
      return segments(o).map((s) => ({
        key: key(s.x, s.y),
        draw: () => {
          box(ctx, s.x + 0.05, s.y, 0.55, 1, 2.1, 0, "#b79267", false);
          const rnd = seeded(hashString(`sh${s.x},${s.y}`));
          for (const z of [0.5, 1.05, 1.6]) {
            box(ctx, s.x + 0.08, s.y + 0.08, 0.5, 0.84, 0.02, z, "#8f6c46", false);
            for (let b = 0; b < 4; b++) box(ctx, s.x + 0.1, s.y + 0.1 + b * 0.2, 0.3, 0.14, 0.3 + rnd() * 0.14, z + 0.02, ["#2d5d41", "#c8503c", "#e8e1d0", "#3f5f8a"][b % 4], false);
          }
        },
      }));
    case "decor":
      return [
        {
          key: key(o.x, o.y, w, d) + 0.2,
          draw: () => {
            floorEllipse(ctx, cx, cy, w / 2 - 0.08, d / 2 - 0.08, 0.01, "rgba(0,0,0,0.16)");
            if (o.model && o.model !== "box") {
              drawDecorModel(ctx, o.model, o.x, o.y, w, d, o.tint ?? "#c9b99a");
              return;
            }
            box(ctx, o.x + 0.12, o.y + 0.12, w - 0.24, d - 0.24, 0.12, 0, o.tint ?? "#d9cfbd", false);
            if (o.icon && !o.model) {
              const p = P(cx, cy, 0.55 + 0.12 * Math.max(w, d));
              ctx.save();
              ctx.font = `${Math.round(TW * 0.62 * (0.8 + 0.35 * Math.max(w, d)))}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(o.icon, p.x, p.y);
              ctx.restore();
            }
          },
        },
      ];
    case "column":
      return [{ key: key(o.x, o.y) + 0.1, draw: () => box(ctx, o.x + 0.15, o.y + 0.15, 0.7, 0.7, 3.4, 0, { top: "#e4e7e3", left: "#d3d7d2", right: "#b3b8b3" }, false) }];
    case "cabinet":
      return segments(o).map((s) => ({
        key: key(s.x, s.y),
        draw: () => {
          box(ctx, s.x + 0.04, s.y + 0.12, 0.92, 0.76, 0.9, 0, { top: "#c9a679", left: "#f1f2ee", right: "#d4d6d0" }, false);
          const rnd = seeded(hashString(`cb${s.x},${s.y}`));
          if (rnd() > 0.5) box(ctx, s.x + 0.3, s.y + 0.3, 0.4, 0.3, 0.14, 0.9, "#d9d4c4", false);
        },
      }));
    case "watercooler":
      return [
        {
          key: key(o.x, o.y),
          draw: () => {
            box(ctx, o.x + 0.26, o.y + 0.26, 0.48, 0.48, 0.95, 0, { top: "#f4f7f8", left: "#e1e8ea", right: "#c4cdd1" }, false);
            box(ctx, o.x + 0.3, o.y + 0.3, 0.4, 0.4, 0.5, 0.95, { top: "#bfe3f4", left: "#9fd0ea", right: "#80b7d4" }, false);
            box(ctx, o.x + 0.42, o.y + 0.7, 0.16, 0.06, 0.08, 0.6, "#2c3135", false);
          },
        },
      ];
    case "printer":
      return [
        {
          key: key(o.x, o.y),
          draw: () => {
            box(ctx, o.x + 0.1, o.y + 0.15, 0.8, 0.7, 0.9, 0, "#e7e9e6", false);
            box(ctx, o.x + 0.1, o.y + 0.15, 0.8, 0.7, 0.14, 0.9, "#2c3135", false);
            box(ctx, o.x + 0.35, o.y + 0.8, 0.3, 0.05, 0.02, 0.5, "#8db74e", false);
          },
        },
      ];
  }
}

/* -------------------------------------- overlays -------------------------------------- */

function drawPortals(ctx: Ctx, scene: Scene, time: number, hover: RenderOptions["hover"], labels: boolean, me: { x: number; y: number }): void {
  const pulse = 0.5 + 0.5 * Math.sin(time / 420);
  for (const p of scene.portals) {
    const active = hover && hover.x >= p.x && hover.x < p.x + p.w && hover.y >= p.y && hover.y < p.y + p.d;
    ctx.save();
    ctx.globalAlpha = 0.45 + pulse * 0.2 + (active ? 0.2 : 0);
    poly(ctx, [P(p.x, p.y), P(p.x + p.w, p.y), P(p.x + p.w, p.y + p.d), P(p.x, p.y + p.d)], "#8db74e", "#5f8a2e", 1.5);
    ctx.restore();
    const close = Math.hypot(me.x - (p.x + p.w / 2), me.y - (p.y + p.d / 2)) <= 3.6;
    if (labels && (active || close)) {
      const c = P(p.x + p.w / 2, p.y + p.d / 2, 1.9);
      drawNameTag(ctx, c.x, c.y, p.label, true);
    }
  }
}

function drawHotspots(ctx: Ctx, scene: Scene, time: number, hover: RenderOptions["hover"], labels: boolean, me: { x: number; y: number }): void {
  for (const h of scene.hotspots) {
    const near = hover && Math.floor(hover.x) === h.x && Math.floor(hover.y) === h.y;
    const c = P(h.x + 0.5, h.y + 0.5, 0);
    const r = 11 + Math.sin(time / 380) * 1.5;
    ctx.strokeStyle = near ? "#2d5d41" : "rgba(45,93,65,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(141,183,78,0.35)";
    ctx.fill();
    const close = Math.hypot(me.x - h.x, me.y - h.y) <= 3.2;
    if (labels && (near || close)) {
      const t = P(h.x + 0.5, h.y + 0.5, 1.6);
      drawNameTag(ctx, t.x, t.y - 4, h.label);
    }
  }
}

function drawPath(ctx: Ctx, path: { x: number; y: number }[], time: number): void {
  ctx.fillStyle = "rgba(45,93,65,0.55)";
  path.forEach((t, i) => {
    const c = P(t.x + 0.5, t.y + 0.5, 0);
    const r = i === path.length - 1 ? 5 + Math.sin(time / 200) : 3;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ----------------------------------------- main ----------------------------------------- */

export function renderScene(ctx: Ctx, scene: Scene, opts: RenderOptions): View {
  const view = computeView(scene, opts.mode, opts.width, opts.height, opts.zoom, opts.focus);
  const dpr = opts.dpr ?? 1;
  const layer = opts.layer ?? "all";
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (layer !== "dynamic") {
    ctx.clearRect(0, 0, opts.width, opts.height);
    // Soft background behind the room
    const bg = ctx.createLinearGradient(0, 0, 0, opts.height);
    bg.addColorStop(0, "#dfe9e1");
    bg.addColorStop(1, "#c8d8cc");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, opts.width, opts.height);
  }

  if (opts.mode === "flat") {
    // The flat (Lite) renderer lives in render-flat.ts. It is simple enough to redraw every frame.
    if (layer === "static") {
      ctx.restore();
      return view;
    }
    const v = flatHook(ctx, scene, opts, view);
    ctx.restore();
    return v;
  }

  ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.ox * dpr, view.oy * dpr);
  if (layer !== "dynamic") {
    drawFloor(ctx, scene);
    drawWalls(ctx, scene, opts.logo);
  }
  if (layer === "static") {
    ctx.restore();
    return view;
  }

  if (opts.path?.length) drawPath(ctx, opts.path, opts.time);
  if (opts.hover) {
    const hx = Math.floor(opts.hover.x);
    const hy = Math.floor(opts.hover.y);
    if (hx >= 0 && hy >= 0 && hx < scene.cols && hy < scene.rows) poly(ctx, [P(hx, hy), P(hx + 1, hy), P(hx + 1, hy + 1), P(hx, hy + 1)], "rgba(141,183,78,0.28)", "rgba(45,93,65,0.6)", 1.2);
  }
  drawPortals(ctx, scene, opts.time, opts.hover, opts.labels !== false, opts.player);

  const draws: Draw[] = [];
  for (const o of scene.objects) draws.push(...objectDraws(ctx, o, opts.time));
  for (const n of scene.npcs) {
    const px = n.x + 0.5;
    const py = n.y + 0.5;
    const fx = n.dir === 0 ? 1 : n.dir === 2 ? -1 : 0;
    const fy = n.dir === 1 ? 1 : n.dir === 3 ? -1 : 0;
    draws.push({
      key: px + py + 0.05,
      draw: () => {
        const s = P(px, py, 0);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(PERSON_SCALE, PERSON_SCALE);
        drawPerson(ctx, 0, 0, n.look, { t: opts.time, walking: false, fx, fy, seated: n.seated });
        ctx.restore();
        if (opts.labels !== false) drawNameTag(ctx, s.x, s.y - 72 * PERSON_SCALE + (n.seated ? 9 : 0), n.name);
      },
    });
  }
  const pl = opts.player;
  draws.push({
    key: pl.x + 0.5 + (pl.y + 0.5) + 0.06,
    draw: () => {
      const s = P(pl.x + 0.5, pl.y + 0.5, 0);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(PERSON_SCALE, PERSON_SCALE);
      drawPerson(ctx, 0, 0, pl.look, { t: opts.time, walking: pl.walking, fx: pl.fx, fy: pl.fy });
      ctx.restore();
      // A green ring marks you
      ctx.strokeStyle = "rgba(141,183,78,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 1, 17, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (opts.labels !== false) drawNameTag(ctx, s.x, s.y - 72 * PERSON_SCALE, pl.name ?? "You", true);
    },
  });
  draws.sort((a, b) => a.key - b.key);
  for (const d of draws) d.draw();

  drawHotspots(ctx, scene, opts.time, opts.hover, opts.labels !== false, opts.player);
  ctx.restore();
  return view;
}

// Set by render-flat.ts so the two renderers stay in separate files without a circular import.
let flatImpl: ((ctx: Ctx, scene: Scene, opts: RenderOptions, view: View) => View) | null = null;
export function registerFlatRenderer(fn: (ctx: Ctx, scene: Scene, opts: RenderOptions, view: View) => View): void {
  flatImpl = fn;
}
function flatHook(ctx: Ctx, scene: Scene, opts: RenderOptions, view: View): View {
  if (!flatImpl) throw new Error("Flat renderer not registered");
  return flatImpl(ctx, scene, opts, view);
}

export { roundRect };
