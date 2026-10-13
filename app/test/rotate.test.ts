import { describe, expect, it } from "vitest";
import { buildGrid } from "@/lib/iso/path";
import { nextQuarter, pointFromView, rotateScene, tileToView, vectorFromView, vectorToView, type Quarter } from "@/lib/iso/rotate";
import { countdown } from "@/lib/format";
import { SCENES } from "@/lib/world/scenes";

const ks: Quarter[] = [0, 1, 2, 3];

describe("turning the camera", () => {
  for (const scene of Object.values(SCENES)) {
    for (const k of ks) {
      it(`${scene.id} turned ${k}: everything stays inside the room and walkable tiles match`, () => {
        const r = rotateScene(scene, k);
        expect(r.cols).toBe(k % 2 ? scene.rows : scene.cols);
        const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < r.cols && y < r.rows;
        for (const n of r.npcs) expect(inside(n.x, n.y)).toBe(true);
        for (const o of r.objects) {
          expect(o.x).toBeGreaterThanOrEqual(0);
          expect(o.y).toBeGreaterThanOrEqual(0);
          expect(o.x + (o.w ?? 1)).toBeLessThanOrEqual(r.cols);
          expect(o.y + (o.d ?? 1)).toBeLessThanOrEqual(r.rows);
        }
        // A tile is blocked after turning exactly when it was blocked before
        const before = buildGrid(scene);
        const after = buildGrid(r);
        for (let y = 0; y < scene.rows; y++) for (let x = 0; x < scene.cols; x++) {
          const v = tileToView(scene, k, x, y);
          expect(after.blocked[v.y][v.x]).toBe(before.blocked[y][x]);
        }
        // Doors and hotspots move with their tiles
        for (const h of scene.hotspots) expect(r.hotspots.find((q) => q.id === h.id)).toMatchObject(tileToView(scene, k, h.x, h.y));
      });
    }
  }

  it("four quarter-turns come back to the start", () => {
    const s = SCENES["ikoyi-lobby"];
    let k: Quarter = 0;
    for (let i = 0; i < 4; i++) k = nextQuarter(k, 1);
    expect(k).toBe(0);
    expect(nextQuarter(0, -1)).toBe(3);
    expect(rotateScene(s, 0)).toBe(s);
  });

  it("a click in the turned view maps back to the same room point", () => {
    const s = SCENES["ikoyi-floor"];
    for (const k of ks) {
      for (const [x, y] of [[0.5, 0.5], [3.25, 7.75], [10, 4]]) {
        // continuous point -> view (tile index form shifted by half a tile) -> back
        const v = tileToView(s, k, x - 0.5, y - 0.5);
        const back = pointFromView(s, k, v.x + 0.5, v.y + 0.5);
        expect(back.x).toBeCloseTo(x, 6);
        expect(back.y).toBeCloseTo(y, 6);
      }
    }
  });

  it("directions turn and turn back", () => {
    for (const k of ks) {
      const v = vectorToView(k, 1, 0);
      const back = vectorFromView(k, v.x, v.y);
      expect(back).toEqual({ x: 1, y: 0 });
    }
  });

  it("keeps wall features only on the two back walls", () => {
    const lobby = SCENES["ikoyi-lobby"];
    const r = rotateScene(lobby, 1);
    expect(r.features.every((f) => f.wall === "x" || f.wall === "y")).toBe(true);
    // the logo wall that was on the back-left wall is now on the back-right one
    const moss = lobby.features.find((f) => f.kind === "moss");
    if (moss) expect(r.features.find((f) => f.kind === "moss")?.wall).not.toBe(moss.wall);
  });
});

describe("countdown", () => {
  it("shows minutes and seconds", () => {
    expect(countdown(1745)).toBe("29:05");
    expect(countdown(59.2)).toBe("1:00");
    expect(countdown(0)).toBe("0:00");
    expect(countdown(3725)).toBe("1:02:05");
    expect(countdown(-5)).toBe("0:00");
  });
});
