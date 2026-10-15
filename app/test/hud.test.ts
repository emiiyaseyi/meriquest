import { beforeEach, describe, expect, it } from "vitest";
import { computeView } from "@/lib/iso/render";
import { project } from "@/lib/iso/geometry";
import { SCENES } from "@/lib/world/scenes";
import { onlineNow, resetOnlineCache } from "@/lib/server/game/presence";
import { getGameState } from "@/lib/server/game/service";
import { getStore } from "@/lib/server/store";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-15T11:00:00+01:00");

describe("camera presets", () => {
  const scene = SCENES["ikoyi-floor"];

  it("shows the whole room by default and zooms in on a chosen tile, which then sits in the middle", () => {
    const whole = computeView(scene, "iso", 1000, 700);
    const near = computeView(scene, "iso", 1000, 700, 1.9, { x: 6, y: 8 });
    expect(near.scale).toBeCloseTo(whole.scale * 1.9, 5);
    const p = project(6.5, 8.5);
    expect(near.ox + p.x * near.scale).toBeCloseTo(500, 3);
    expect(near.oy + p.y * near.scale).toBeCloseTo(350, 3);
  });

  it("does the same in the top-down overview", () => {
    const flat = computeView(scene, "flat", 1000, 700, 2, { x: 3, y: 4 });
    expect(flat.ox + 3.5 * flat.scale).toBeCloseTo(500, 3);
    expect(flat.oy + 4.5 * flat.scale).toBeCloseTo(350, 3);
    // zoom 1 ignores the focus, so the room stays centred
    const whole = computeView(scene, "flat", 1000, 700, 1, { x: 3, y: 4 });
    expect(whole).toEqual(computeView(scene, "flat", 1000, 700));
  });
});

describe("online now", () => {
  beforeEach(async () => {
    await freshWorld();
    resetOnlineCache();
  });

  it("counts people the game heard from in the last two minutes, and nobody else", async () => {
    const put = (id: string, lastBeat: number | null) => getStore().put("play_sessions", id, { staffId: id, used: 0, lastPlayAt: null, lastBeat, lastActivity: "world" });
    await put("MS1001", NOW - 20_000);
    await put("MS1002", NOW - 100_000);
    await put("MS1003", NOW - 5 * 60_000);
    await put("MS1004", null);
    expect(await onlineNow(NOW)).toBe(2);
  });

  it("keeps the number for a few seconds, then looks again", async () => {
    await getStore().put("play_sessions", "MS1001", { staffId: "MS1001", used: 0, lastPlayAt: null, lastBeat: NOW - 1000, lastActivity: "world" });
    expect(await onlineNow(NOW)).toBe(1);
    await getStore().put("play_sessions", "MS1002", { staffId: "MS1002", used: 0, lastPlayAt: null, lastBeat: NOW - 1000, lastActivity: "world" });
    expect(await onlineNow(NOW + 5_000)).toBe(1); // still the saved number
    expect(await onlineNow(NOW + 20_000)).toBe(2); // looked again: both are still within two minutes
  });

  it("always counts the person looking at the screen", async () => {
    const s = await getGameState(await dto("MS1001"), NOW);
    expect(s.online).toBe(1);
  });

  it("is part of the game state every screen reads", async () => {
    await getStore().put("play_sessions", "MS1002", { staffId: "MS1002", used: 0, lastPlayAt: null, lastBeat: NOW - 1000, lastActivity: "world" });
    const s = await getGameState(await dto("MS1001"), NOW);
    expect(s.online).toBe(1);
  });
});
