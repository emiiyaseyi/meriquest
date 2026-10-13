import type { Scene, SceneObject } from "@/lib/world/types";
import { shade } from "./geometry";
import { drawNameTag, roundRect } from "./people";
import { registerFlatRenderer, type RenderOptions, type View } from "./render";

type Ctx = CanvasRenderingContext2D;

/**
 * Lite mode: the same scene as a flat, illustrated floor plan. It is light on the processor and the
 * network, so it is used automatically on slow connections, data saver or small phones. Every feature
 * of the world works in it.
 */
const COLORS: Record<SceneObject["kind"], string> = {
  desk: "#dccfb6",
  partition: "#7ea63a",
  chair: "#383c41",
  armchair: "#3e4a49",
  plant: "#3f8240",
  reception: "#f4f5f2",
  planter: "#4a5250",
  turnstile: "#aab1b4",
  sofa: "#3c4043",
  coffeetable: "#e2d8c5",
  boardtable: "#3d4145",
  roundtable: "#e9e5db",
  shelf: "#b79267",
  column: "#d3d7d2",
  cabinet: "#e7e3d8",
  printer: "#2c3135",
  watercooler: "#9fd0ea",
};

function flatRender(ctx: Ctx, scene: Scene, opts: RenderOptions, view: View): View {
  const t = view.scale;
  const X = (gx: number) => view.ox + gx * t;
  const Y = (gy: number) => view.oy + gy * t;

  // Floor
  const base = scene.floor === "marble" ? "#e3e8e5" : scene.floor === "office" ? "#d4dad8" : "#cfae82";
  for (let gy = 0; gy < scene.rows; gy++) {
    for (let gx = 0; gx < scene.cols; gx++) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? base : shade(base, 0.965);
      ctx.fillRect(X(gx), Y(gy), t + 0.5, t + 0.5);
    }
  }

  // Walls along the top and left edges, with the features as coloured bands
  const wall = Math.max(7, t * 0.3);
  ctx.fillStyle = "#f3f4f0";
  ctx.fillRect(X(0) - wall, Y(0) - wall, scene.cols * t + wall, wall);
  ctx.fillRect(X(0) - wall, Y(0) - wall, wall, scene.rows * t + wall);
  const band: Record<string, string> = { windows: "#a9c6dc", moss: "#4f8a2f", slats: "#b58b5a", liftdoors: "#aeb3b1", screen: "#1b1e22", glass: "#bfd7e1" };
  for (const f of scene.features) {
    ctx.fillStyle = band[f.kind] ?? "#999";
    if (f.wall === "x") ctx.fillRect(X(0) - wall, Y(f.from), wall, (f.to - f.from) * t);
    else ctx.fillRect(X(f.from), Y(0) - wall, (f.to - f.from) * t, wall);
  }

  // Portals and hotspots
  for (const p of scene.portals) {
    ctx.fillStyle = "rgba(141,183,78,0.55)";
    ctx.fillRect(X(p.x), Y(p.y), p.w * t, p.d * t);
    ctx.strokeStyle = "#5f8a2e";
    ctx.lineWidth = 2;
    ctx.strokeRect(X(p.x), Y(p.y), p.w * t, p.d * t);
  }

  // Furniture as simple rounded shapes
  for (const o of scene.objects) {
    const w = o.w ?? 1;
    const d = o.d ?? 1;
    ctx.fillStyle = COLORS[o.kind];
    const round = o.kind === "plant" || o.kind === "chair" || o.kind === "coffeetable" || o.kind === "boardtable" || o.kind === "roundtable";
    if (o.kind === "boardtable" || o.kind === "roundtable" || o.kind === "coffeetable") {
      ctx.beginPath();
      ctx.ellipse(X(o.x + w / 2), Y(o.y + d / 2), (w * t) / 2 - 2, (d * t) / 2 - 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (round) {
      ctx.beginPath();
      ctx.arc(X(o.x + 0.5), Y(o.y + 0.5), t * (o.kind === "plant" ? 0.34 : 0.3), 0, Math.PI * 2);
      ctx.fill();
    } else {
      roundRect(ctx, X(o.x) + 1.5, Y(o.y) + 1.5, w * t - 3, d * t - 3, Math.min(6, t * 0.15));
    }
  }

  for (const h of scene.hotspots) {
    ctx.strokeStyle = "#2d5d41";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(h.x + 0.5), Y(h.y + 0.5), t * 0.36, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (opts.path) {
    ctx.fillStyle = "rgba(45,93,65,0.6)";
    for (const p of opts.path) {
      ctx.beginPath();
      ctx.arc(X(p.x + 0.5), Y(p.y + 0.5), t * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (opts.hover) {
    const hx = Math.floor(opts.hover.x);
    const hy = Math.floor(opts.hover.y);
    if (hx >= 0 && hy >= 0 && hx < scene.cols && hy < scene.rows) {
      ctx.fillStyle = "rgba(141,183,78,0.35)";
      ctx.fillRect(X(hx), Y(hy), t, t);
    }
  }

  // People are coloured circles with their initial
  const person = (x: number, y: number, look: { skin: string; top: string }, label: string, you: boolean) => {
    const cx = X(x + 0.5);
    const cy = Y(y + 0.5);
    ctx.fillStyle = look.top;
    ctx.beginPath();
    ctx.arc(cx, cy, t * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(cx, cy - t * 0.05, t * 0.2, 0, Math.PI * 2);
    ctx.fill();
    if (you) {
      ctx.strokeStyle = "#8db74e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, t * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (opts.labels !== false) drawNameTag(ctx, cx, cy - t * 0.62, label, you);
  };
  for (const n of scene.npcs) person(n.x, n.y, n.look, n.name, false);
  person(opts.player.x, opts.player.y, opts.player.look, opts.player.name ?? "You", true);

  if (opts.labels !== false) {
    for (const p of scene.portals) drawNameTag(ctx, X(p.x + p.w / 2), Y(p.y + p.d / 2), p.label, true);
  }
  return view;
}

registerFlatRenderer(flatRender);
