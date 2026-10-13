"use client";

import { useEffect, useRef } from "react";
import { drawPerson } from "@/lib/iso/people";
import type { Skin } from "@/lib/world/types";

/** A round head-and-shoulders picture of a person, drawn from their look with the same code as the world. */
export function PersonPortrait({ look, size = 56, label }: { look: Skin; size?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(size * dpr);
    el.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, "#e4edf7");
    bg.addColorStop(1, "#d4e3dc");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    // Zoom in on the head and shoulders: the feet are well below the picture
    const k = size / 40;
    ctx.save();
    ctx.translate(size / 2, size * 1.52);
    ctx.scale(k, k);
    drawPerson(ctx, 0, 0, look, { t: 0, walking: false, fx: 0, fy: 1 });
    ctx.restore();
  }, [look, size]);
  return <canvas ref={ref} className="portrait" style={{ width: size, height: size }} role="img" aria-label={label} />;
}
