"use client";

import { useEffect, useMemo, useRef } from "react";
import { project } from "@/lib/iso/geometry";
import { buildGrid, findPath, hotspotAt, nearestWalkable, portalAt, walkable, type Tile } from "@/lib/iso/path";
import { renderScene, screenToTile, type View, type Walker } from "@/lib/iso/render";
import { pointFromView, rotateScene, tileToView, vectorFromView, vectorToView, type Quarter } from "@/lib/iso/rotate";
import "@/lib/iso/render-flat";
import type { Hotspot, Npc, Portal, Scene, Skin } from "@/lib/world/types";

const SPEED = 3.6; // tiles per second
const SWIPE_PX = 70; // a sideways drag this long turns the view

export interface WorldCanvasProps {
  scene: Scene;
  start: { x: number; y: number };
  look: Skin;
  name: string;
  mode: "iso" | "flat";
  /** Quarter-turns of the camera (isometric view only). */
  rotation: Quarter;
  paused: boolean;
  onPortal: (p: Portal) => void;
  onHotspot: (h: Hotspot) => void;
  onNpc: (n: Npc) => void;
  onRotate: (by: 1 | -1) => void;
  onHover?: (label: string | null) => void;
  /** Called when the character starts or stops walking, so the screen can offer "Skip". */
  onWalking?: (walking: boolean) => void;
  /** Goes up by one each time the person asks to skip the walk. */
  skipTick?: number;
}

type Then = { kind: "hotspot"; h: Hotspot } | null;

/**
 * The walkable world. Drawing is done in a canvas; the room is plain data from lib/world. Click a tile to
 * walk there, click a person, a door or an object to use it, or use the arrow keys / WASD. [ and ] (or a
 * sideways drag) turn the view without moving you. The room's own coordinates never change: the camera turn
 * only affects drawing and picking. Nothing here is trusted by the server: doors are re-checked there.
 */
export function WorldCanvas({ scene, start, look, name, mode, rotation, paused, onPortal, onHotspot, onNpc, onRotate, onHover, onWalking, skipTick = 0 }: WorldCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const k: Quarter = mode === "iso" ? rotation : 0;
  const turned = useMemo(() => rotateScene(scene, k), [scene, k]);
  const sim = useRef({
    x: start.x,
    y: start.y,
    fx: 0,
    fy: 1,
    walking: false,
    path: [] as Tile[],
    goal: null as Tile | null,
    then: null as Then,
    hover: null as { x: number; y: number } | null, // room coordinates
    view: null as View | null,
    size: { w: 0, h: 0, dpr: 1 },
  });
  const placedFor = useRef("");
  const logo = useRef<HTMLImageElement | null>(null);
  const handlers = useRef({ onPortal, onHotspot, onNpc, onRotate, onHover, onWalking, paused, skipTick });
  const lastSkip = useRef(skipTick);
  const wasWalking = useRef(false);
  // Keep the latest callbacks available to the animation loop without restarting it.
  useEffect(() => {
    handlers.current = { onPortal, onHotspot, onNpc, onRotate, onHover, onWalking, paused, skipTick };
  });

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const grid = buildGrid(scene);
    const s = sim.current;
    // Put the player at the arrival point only when entering a room, not when the view or mode changes.
    const placeKey = `${scene.id}:${start.x},${start.y}`;
    if (placedFor.current !== placeKey) {
      placedFor.current = placeKey;
      s.x = start.x;
      s.y = start.y;
      s.path = [];
      s.goal = null;
      s.then = null;
    }

    const img = new Image();
    img.src = "/brand/meristem-logo-white.png";
    img.onload = () => {
      logo.current = img;
      staticDirty = true;
    };

    // The room itself (floor and walls) is drawn once and reused until the size, mode or camera changes.
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

    /** A point on the screen, as a continuous position in the room's own coordinates. */
    const roomPoint = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      if (!s.view) return null;
      const v = screenToTile(s.view, e.clientX - r.left, e.clientY - r.top);
      return pointFromView(scene, k, v.x, v.y);
    };
    const tileOf = (e: { clientX: number; clientY: number }) => {
      const p = roomPoint(e);
      if (!p) return null;
      const tx = Math.floor(p.x);
      const ty = Math.floor(p.y);
      return tx >= 0 && ty >= 0 && tx < scene.cols && ty < scene.rows ? { x: tx, y: ty } : null;
    };

    /** Where a person's feet are on the screen. */
    const feet = (view: View, x: number, y: number) => {
      const v = tileToView(scene, k, x, y);
      if (view.mode === "flat") return { x: (v.x + 0.5) * view.scale + view.ox, y: (v.y + 0.5) * view.scale + view.oy };
      const p = project(v.x + 0.5, v.y + 0.5, 0);
      return { x: p.x * view.scale + view.ox, y: p.y * view.scale + view.oy };
    };
    /** The person under the pointer, if any. People are tall, so the hit area reaches up from their feet. */
    const npcAtPointer = (e: { clientX: number; clientY: number }): Npc | null => {
      const r = el.getBoundingClientRect();
      const view = s.view;
      if (!view) return null;
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      let best: Npc | null = null;
      let bestY = -Infinity;
      for (const n of scene.npcs) {
        const f = feet(view, n.x, n.y);
        const hit = view.mode === "flat" ? Math.hypot(px - f.x, py - f.y) <= view.scale * 0.5 : Math.abs(px - f.x) <= 24 * view.scale && py >= f.y - 98 * view.scale && py <= f.y + 10 * view.scale;
        if (hit && f.y > bestY) {
          best = n;
          bestY = f.y;
        }
      }
      return best;
    };
    /** A hotspot at the tile, or on the solid object (such as the front desk) that covers it. */
    const hotspotFor = (t: Tile): Hotspot | null => {
      const direct = hotspotAt(scene, t.x, t.y);
      if (direct) return direct;
      for (const o of scene.objects) {
        const w = o.w ?? 1;
        const d = o.d ?? 1;
        if (t.x >= o.x && t.x < o.x + w && t.y >= o.y && t.y < o.y + d) {
          const h = scene.hotspots.find((hs) => hs.x >= o.x && hs.x < o.x + w && hs.y >= o.y && hs.y < o.y + d);
          if (h) return h;
        }
      }
      return null;
    };

    const goTo = (target: Tile, then: Then = null) => {
      const dest: Tile | null = walkable(grid, target.x, target.y) ? target : nearestWalkable(grid, target.x, target.y);
      if (!dest) return;
      const from = { x: Math.round(s.x), y: Math.round(s.y) };
      const path = findPath(grid, from, dest);
      if (path.length === 0 && (from.x !== dest.x || from.y !== dest.y)) return; // no route
      s.path = path;
      s.goal = dest;
      s.then = then;
      if (path.length === 0) arrive(dest);
    };

    const arrive = (t: Tile) => {
      s.goal = null;
      const then = s.then;
      s.then = null;
      if (then) return handlers.current.onHotspot(then.h);
      const portal = portalAt(scene, t.x, t.y);
      if (portal) return handlers.current.onPortal(portal);
      const spot = hotspotAt(scene, t.x, t.y);
      if (spot) handlers.current.onHotspot(spot);
    };

    let downAt: { x: number; y: number } | null = null;
    let swiped = false;
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
      swiped = false;
    };
    const onUp = (e: PointerEvent) => {
      if (!downAt || mode !== "iso") return;
      const dx = e.clientX - downAt.x;
      const dy = e.clientY - downAt.y;
      downAt = null;
      if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swiped = true;
        handlers.current.onRotate(dx < 0 ? 1 : -1);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (swiped) {
        swiped = false;
        return;
      }
      if (handlers.current.paused) return;
      const npc = npcAtPointer(e);
      if (npc) return handlers.current.onNpc(npc);
      const t = tileOf(e);
      if (!t) return;
      const spot = hotspotFor(t);
      goTo(spot ? { x: spot.x, y: spot.y } : t, spot ? { kind: "hotspot", h: spot } : null);
    };
    const onMove = (e: PointerEvent) => {
      const p = roomPoint(e);
      s.hover = p;
      const t = p ? { x: Math.floor(p.x), y: Math.floor(p.y) } : null;
      const npc = npcAtPointer(e);
      const portal = t ? portalAt(scene, t.x, t.y) : null;
      const spot = t ? hotspotFor(t) : null;
      const label = npc ? npc.name : portal ? portal.label : spot ? spot.label : null;
      el.style.cursor = label ? "pointer" : "default";
      handlers.current.onHover?.(label);
    };
    const onLeave = () => {
      s.hover = null;
      el.style.cursor = "default";
      handlers.current.onHover?.(null);
    };
    /** Jump straight to where the character is heading, as if the walk had finished. */
    const skipWalk = () => {
      const goal = s.goal;
      if (!goal || s.path.length === 0) return;
      s.x = goal.x;
      s.y = goal.y;
      s.path = [];
      arrive(goal);
    };

    const onKey = (e: KeyboardEvent) => {
      if (handlers.current.paused) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      const key = e.key.toLowerCase();
      if ((key === " " || key === "enter") && s.path.length > 0) {
        e.preventDefault();
        skipWalk();
        return;
      }
      if (mode === "iso" && (key === "[" || key === "]")) {
        e.preventDefault();
        handlers.current.onRotate(key === "[" ? -1 : 1);
        return;
      }
      const iso = mode === "iso";
      let d: [number, number] | null = null;
      if (key === "arrowup" || key === "w") d = iso ? [-1, -1] : [0, -1];
      else if (key === "arrowdown" || key === "s") d = iso ? [1, 1] : [0, 1];
      else if (key === "arrowleft" || key === "a") d = iso ? [-1, 1] : [-1, 0];
      else if (key === "arrowright" || key === "d") d = iso ? [1, -1] : [1, 0];
      if (!d) return;
      e.preventDefault();
      const room = vectorFromView(k, d[0], d[1]); // "up" on screen is a different way in the room once turned
      goTo({ x: Math.round(s.x) + room.x, y: Math.round(s.y) + room.y });
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKey);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (handlers.current.skipTick !== lastSkip.current) {
        lastSkip.current = handlers.current.skipTick;
        skipWalk();
      }
      const moving = s.path.length > 0;
      if (moving !== wasWalking.current) {
        wasWalking.current = moving;
        handlers.current.onWalking?.(moving);
      }
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
        // Everything is drawn in the turned view; the walking itself stays in the room's own coordinates
        const pos = tileToView(scene, k, s.x, s.y);
        const face = vectorToView(k, s.fx, s.fy);
        const walker: Walker = { x: pos.x, y: pos.y, fx: face.x, fy: face.y, walking: s.walking, look, name };
        const path = s.path.map((t) => tileToView(scene, k, t.x, t.y));
        const hover = s.hover ? tileToViewPoint(s.hover.x, s.hover.y) : null;
        const base = { mode, width: s.size.w, height: s.size.h, time: now, dpr: s.size.dpr, logo: logo.current, labels: true } as const;
        if (mode === "iso") {
          if (staticDirty) {
            const sctx = staticLayer.getContext("2d");
            if (sctx) renderScene(sctx, turned, { ...base, player: walker, layer: "static" });
            staticDirty = false;
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, el.width, el.height);
          ctx.drawImage(staticLayer, 0, 0);
          s.view = renderScene(ctx, turned, { ...base, player: walker, hover, path, layer: "dynamic" });
        } else {
          s.view = renderScene(ctx, turned, { ...base, player: walker, hover, path, layer: "all" });
        }
      }
      raf = requestAnimationFrame(frame);
    };

    /** A continuous point of the room, as it appears in the turned view. */
    const tileToViewPoint = (x: number, y: number) => {
      // A continuous point is the tile index shifted by half a tile, turned, and shifted back
      const v = tileToView(scene, k, x - 0.5, y - 0.5);
      return { x: v.x + 0.5, y: v.y + 0.5 };
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
    };
    // The world is rebuilt when the room, the drawing mode or the camera changes. Appearance is read through the closure on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, turned, mode, k, start.x, start.y]);

  return (
    <div ref={wrap} className="world-wrap">
      <canvas ref={canvas} className="world-canvas" role="img" aria-label={`${scene.name}. Click to walk, or use the arrow keys. Press [ or ] to turn the view.`} />
    </div>
  );
}
