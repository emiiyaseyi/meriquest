import type { Dir, Scene, WallFeature } from "@/lib/world/types";

/**
 * Turning the camera. A room is always drawn with its two back walls at x = 0 and y = 0, so turning the view
 * means turning the room's contents a quarter-turn at a time. Everything in the game (walking, doors, the
 * server) keeps using the room's own coordinates; only drawing and picking go through these helpers.
 */
export type Quarter = 0 | 1 | 2 | 3;

type Wall = "x0" | "y0" | "xc" | "yc"; // x = 0, y = 0, x = cols, y = rows

interface Dims {
  cols: number;
  rows: number;
}

/** One quarter-turn of a tile index: (x, y) becomes (rows - 1 - y, x). */
function stepTile(x: number, y: number, rows: number): [number, number] {
  return [rows - 1 - y, x];
}

/** A tile (or a fractional walking position) of the room, as it appears in the turned view. */
export function tileToView(scene: Dims, k: Quarter, x: number, y: number): { x: number; y: number } {
  let d: Dims = scene;
  let p: [number, number] = [x, y];
  for (let i = 0; i < k; i++) {
    p = stepTile(p[0], p[1], d.rows);
    d = { cols: d.rows, rows: d.cols };
  }
  return { x: p[0], y: p[1] };
}

/** A point on the floor of the turned view (for example a click) back to the room's own coordinates. */
export function pointFromView(scene: Dims, k: Quarter, x: number, y: number): { x: number; y: number } {
  // Undo the quarter-turns one at a time, from the last back to the first
  const sizes: Dims[] = [scene];
  for (let i = 0; i < k; i++) sizes.push({ cols: sizes[i].rows, rows: sizes[i].cols });
  let p: [number, number] = [x, y];
  for (let i = k; i > 0; i--) {
    const before = sizes[i - 1];
    // forward: x' = rows - y, y' = x   so   x = y', y = rows - x'
    p = [p[1], before.rows - p[0]];
  }
  return { x: p[0], y: p[1] };
}

/** A direction (such as the way someone faces) in the turned view. */
export function vectorToView(k: Quarter, fx: number, fy: number): { x: number; y: number } {
  let v: [number, number] = [fx, fy];
  for (let i = 0; i < k; i++) v = [-v[1], v[0]];
  return { x: v[0], y: v[1] };
}

/** A direction on screen back to the room's own directions (for the arrow keys). */
export function vectorFromView(k: Quarter, dx: number, dy: number): { x: number; y: number } {
  let v: [number, number] = [dx, dy];
  for (let i = 0; i < k; i++) v = [v[1], -v[0]];
  return { x: v[0], y: v[1] };
}

const turnDir = (d: Dir, k: number): Dir => (((d + k) % 4) as Dir);

function turnRect(x: number, y: number, w: number, d: number, rows: number): { x: number; y: number; w: number; d: number } {
  return { x: rows - y - d, y: x, w: d, d: w };
}

function turnWall(w: Wall, from: number, to: number, rows: number): { wall: Wall; from: number; to: number } {
  switch (w) {
    case "x0":
      return { wall: "y0", from: rows - to, to: rows - from };
    case "y0":
      return { wall: "xc", from, to };
    case "xc":
      return { wall: "yc", from: rows - to, to: rows - from };
    case "yc":
      return { wall: "x0", from, to };
  }
}

/**
 * The room as seen after k quarter-turns. Only features on the two back walls are kept, as the front walls
 * are cut away so you can see in.
 */
export function rotateScene(scene: Scene, k: Quarter): Scene {
  if (k === 0) return scene;
  let cur: Scene = scene;
  let feats = scene.features.map((f) => ({ ...f, wall: (f.wall === "x" ? "x0" : "y0") as Wall }));
  for (let i = 0; i < k; i++) {
    const rows = cur.rows;
    feats = feats.map((f) => ({ ...f, ...turnWall(f.wall, f.from, f.to, rows) }));
    cur = {
      ...cur,
      cols: cur.rows,
      rows: cur.cols,
      objects: cur.objects.map((o) => ({ ...o, ...turnRect(o.x, o.y, o.w ?? 1, o.d ?? 1, rows), ...(o.dir === undefined ? {} : { dir: turnDir(o.dir, 1) }) })),
      npcs: cur.npcs.map((n) => {
        const [x, y] = stepTile(n.x, n.y, rows);
        return { ...n, x, y, dir: turnDir(n.dir, 1) };
      }),
      portals: cur.portals.map((p) => ({ ...p, ...turnRect(p.x, p.y, p.w, p.d, rows) })),
      hotspots: cur.hotspots.map((h) => {
        const [x, y] = stepTile(h.x, h.y, rows);
        return { ...h, x, y };
      }),
      spawn: (() => {
        const [x, y] = stepTile(cur.spawn.x, cur.spawn.y, rows);
        return { x, y };
      })(),
    };
  }
  const visible = feats.filter((f) => f.wall === "x0" || f.wall === "y0").map((f) => ({ ...f, wall: f.wall === "x0" ? "x" : "y" }) as WallFeature);
  return { ...cur, features: visible };
}

export function nextQuarter(k: Quarter, by: 1 | -1): Quarter {
  return ((k + by + 4) % 4) as Quarter;
}
