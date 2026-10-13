"use client";

import { useEffect, useRef } from "react";
import { buildGrid, findPath, hotspotAt, nearestWalkable, portalAt, walkable, type Tile } from "@/lib/iso/path";
import { renderScene, screenToTile, type View, type Walker } from "@/lib/iso/render";
import "@/lib/iso/render-flat";
import type { Hotspot, Portal, Scene, Skin } from "@/lib/world/types";

const SPEED = 3.6; // tiles per second

export interface WorldCanvasProps {
  scene: Scene;
  start: { x: number; y: number };
  look: Skin;
  name: string;
  mode: "iso" | "flat";
  paused: boolean;
  onPortal: (p: Portal) => void;
  onHotspot: (h: Hotspot) => void;
  onHover?: (label: string | null) => void;
}

/**
 * The walkable world. Drawing is done in a canvas; the room is plain data from lib/world. Click a tile to
 * walk there, or use the arrow keys / WASD. Walking onto a door or a glowing spot triggers it.
 * Nothing here is trusted by the server: doors are re-checked there.
 */
export function WorldCanvas({ scene, start, look, name, mode, paused, onPortal, onHotspot, onHover }: WorldCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef({
    x: start.x,
    y: start.y,
    fx: 0,
    fy: 1,
    walking: false,
    path: [] as Tile[],
    goal: null as Tile | null,
    hover: null as { x: number; y: number } | null,
    view: null as View | null,
    size: { w: 0, h: 0, dpr: 1 },
  });
  const placedFor = useRef("");
  const logo = useRef<HTMLImageElement | null>(null);
  const handlers = useRef({ onPortal, onHotspot, onHover, paused });
  // Keep the latest callbacks available to the animation loop without restarting it.
  useEffect(() => {
    handlers.current = { onPortal, onHotspot, onHover, paused };
  });

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const grid = buildGrid(scene);
    const s = sim.current;
    // Put the player at the arrival point only when entering a room, not when the drawing mode changes.
    const placeKey = `${scene.id}:${start.x},${start.y}`;
    if (placedFor.current !== placeKey) {
      placedFor.current = placeKey;
      s.x = start.x;
      s.y = start.y;
      s.path = [];
      s.goal = null;
    }

    const img = new Image();
    img.src = "/brand/meristem-logo-white.png";
    img.onload = () => {
      logo.current = img;
      staticDirty = true;
    };

    // The room itself (floor and walls) is drawn once and reused until the size or mode changes.
    const staticLayer = document.createElement("canvas");
    let staticDirty = true;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      s.size = { w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)), dpr };
      el.width = Math.floor(s.size.w * dpr);
      el.height = Math.floor(s.size.h * dpr);
      staticLayer.width = el.width;
      staticLayer.height = el.height;
      staticDirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const tileOf = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      if (!s.view) return null;
      const t = screenToTile(s.view, e.clientX - r.left, e.clientY - r.top);
      const tx = Math.floor(t.x);
      const ty = Math.floor(t.y);
      return tx >= 0 && ty >= 0 && tx < scene.cols && ty < scene.rows ? { x: tx, y: ty } : null;
    };

    const goTo = (target: Tile) => {
      const dest: Tile | null = walkable(grid, target.x, target.y) ? target : nearestWalkable(grid, target.x, target.y);
      if (!dest) return;
      const from = { x: Math.round(s.x), y: Math.round(s.y) };
      const path = findPath(grid, from, dest);
      if (path.length === 0 && (from.x !== dest.x || from.y !== dest.y)) return; // no route
      s.path = path;
      s.goal = dest;
      if (path.length === 0) arrive(dest);
    };

    const arrive = (t: Tile) => {
      s.goal = null;
      const portal = portalAt(scene, t.x, t.y);
      if (portal) return handlers.current.onPortal(portal);
      const spot = hotspotAt(scene, t.x, t.y);
      if (spot) handlers.current.onHotspot(spot);
    };

    const onClick = (e: MouseEvent) => {
      if (handlers.current.paused) return;
      const t = tileOf(e);
      if (t) goTo(t);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!s.view) return;
      const t = screenToTile(s.view, e.clientX - r.left, e.clientY - r.top);
      s.hover = t;
      const tx = Math.floor(t.x);
      const ty = Math.floor(t.y);
      const portal = portalAt(scene, tx, ty);
      const spot = hotspotAt(scene, tx, ty);
      handlers.current.onHover?.(portal ? portal.label : spot ? spot.label : null);
    };
    const onLeave = () => {
      s.hover = null;
      handlers.current.onHover?.(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (handlers.current.paused) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const iso = mode === "iso";
      const k = e.key.toLowerCase();
      let d: [number, number] | null = null;
      if (k === "arrowup" || k === "w") d = iso ? [-1, -1] : [0, -1];
      else if (k === "arrowdown" || k === "s") d = iso ? [1, 1] : [0, 1];
      else if (k === "arrowleft" || k === "a") d = iso ? [-1, 1] : [-1, 0];
      else if (k === "arrowright" || k === "d") d = iso ? [1, -1] : [1, 0];
      if (!d) return;
      e.preventDefault();
      goTo({ x: Math.round(s.x) + d[0], y: Math.round(s.y) + d[1] });
    };
    el.addEventListener("click", onClick);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKey);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Walk along the route
      s.walking = false;
      if (s.path.length > 0 && !handlers.current.paused) {
        const t = s.path[0];
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.hypot(dx, dy);
        const step = SPEED * dt;
        s.walking = true;
        if (dist > 0.001) {
          s.fx = dx / dist;
          s.fy = dy / dist;
        }
        if (dist <= step) {
          s.x = t.x;
          s.y = t.y;
          s.path.shift();
          if (s.path.length === 0 && s.goal) arrive(s.goal);
        } else {
          s.x += (dx / dist) * step;
          s.y += (dy / dist) * step;
        }
      }

      if (!document.hidden) {
        const walker: Walker = { x: s.x, y: s.y, fx: s.fx, fy: s.fy, walking: s.walking, look, name };
        const base = { mode, width: s.size.w, height: s.size.h, time: now, dpr: s.size.dpr, logo: logo.current, labels: true } as const;
        if (mode === "iso") {
          if (staticDirty) {
            const sctx = staticLayer.getContext("2d");
            if (sctx) renderScene(sctx, scene, { ...base, player: walker, layer: "static" });
            staticDirty = false;
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, el.width, el.height);
          ctx.drawImage(staticLayer, 0, 0);
          s.view = renderScene(ctx, scene, { ...base, player: walker, hover: s.hover, path: s.path, layer: "dynamic" });
        } else {
          s.view = renderScene(ctx, scene, { ...base, player: walker, hover: s.hover, path: s.path, layer: "all" });
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
    };
    // The world is rebuilt when the room or the drawing mode changes. Appearance is read through the closure on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, mode, start.x, start.y]);

  return (
    <div ref={wrap} className="world-wrap">
      <canvas ref={canvas} className="world-canvas" role="img" aria-label={`${scene.name}. Click or use the arrow keys to walk.`} />
    </div>
  );
}
