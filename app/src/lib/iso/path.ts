import type { Scene } from "@/lib/world/types";

export interface Tile {
  x: number;
  y: number;
}

export interface Grid {
  cols: number;
  rows: number;
  blocked: boolean[][]; // blocked[y][x]
}

/** Footprint of an object in whole tiles (any overlap with a tile blocks it). */
function tilesOf(x: number, y: number, w: number, d: number): Tile[] {
  const out: Tile[] = [];
  for (let ty = Math.floor(y); ty < Math.ceil(y + d); ty++) for (let tx = Math.floor(x); tx < Math.ceil(x + w); tx++) out.push({ x: tx, y: ty });
  return out;
}

/** Which tiles a person can walk on: everything except solid objects and standing characters. */
export function buildGrid(scene: Scene, includeNpcs = true): Grid {
  const blocked = Array.from({ length: scene.rows }, () => Array<boolean>(scene.cols).fill(false));
  const mark = (t: Tile) => {
    if (t.x >= 0 && t.y >= 0 && t.x < scene.cols && t.y < scene.rows) blocked[t.y][t.x] = true;
  };
  for (const o of scene.objects) if (o.solid !== false) tilesOf(o.x, o.y, o.w ?? 1, o.d ?? 1).forEach(mark);
  if (includeNpcs) for (const n of scene.npcs) mark({ x: Math.floor(n.x), y: Math.floor(n.y) });
  return { cols: scene.cols, rows: scene.rows, blocked };
}

export function walkable(g: Grid, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < g.cols && y < g.rows && !g.blocked[y][x];
}

const STEPS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Shortest route over walkable tiles (8 directions, no cutting corners). Returns the tiles to walk
 * through, excluding the start; an empty list means "already there" or "no route".
 */
export function findPath(g: Grid, from: Tile, to: Tile, maxNodes = 5000): Tile[] {
  if (!walkable(g, from.x, from.y) && !(from.x >= 0 && from.y >= 0 && from.x < g.cols && from.y < g.rows)) return [];
  if (!walkable(g, to.x, to.y)) return [];
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x: number, y: number) => y * g.cols + x;
  const prev = new Map<number, number>();
  const queue: Tile[] = [from];
  prev.set(key(from.x, from.y), -1);
  let head = 0;
  let visited = 0;
  while (head < queue.length && visited < maxNodes) {
    const cur = queue[head++];
    visited++;
    if (cur.x === to.x && cur.y === to.y) break;
    for (const [dx, dy] of STEPS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!walkable(g, nx, ny) || prev.has(key(nx, ny))) continue;
      // Do not squeeze diagonally between two blocked tiles.
      if (dx !== 0 && dy !== 0 && (!walkable(g, cur.x + dx, cur.y) || !walkable(g, cur.x, cur.y + dy))) continue;
      prev.set(key(nx, ny), key(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(key(to.x, to.y))) return [];
  const path: Tile[] = [];
  let k = key(to.x, to.y);
  while (k !== -1) {
    path.push({ x: k % g.cols, y: Math.floor(k / g.cols) });
    k = prev.get(k) as number;
  }
  path.reverse();
  return path.slice(1);
}

/** The nearest walkable tile to a point (for clicks that land on furniture). */
export function nearestWalkable(g: Grid, x: number, y: number): Tile | null {
  const cx = Math.max(0, Math.min(g.cols - 1, Math.floor(x)));
  const cy = Math.max(0, Math.min(g.rows - 1, Math.floor(y)));
  if (walkable(g, cx, cy)) return { x: cx, y: cy };
  let best: Tile | null = null;
  let bestD = Infinity;
  for (let ty = 0; ty < g.rows; ty++) {
    for (let tx = 0; tx < g.cols; tx++) {
      if (!walkable(g, tx, ty)) continue;
      const d = (tx - cx) ** 2 + (ty - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: tx, y: ty };
      }
    }
  }
  return best;
}

export function portalAt(scene: Scene, x: number, y: number) {
  return scene.portals.find((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.d);
}

export function hotspotAt(scene: Scene, x: number, y: number) {
  return scene.hotspots.find((h) => h.x === x && h.y === y);
}
