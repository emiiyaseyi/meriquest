import { beforeEach, describe, expect, it } from "vitest";
import { computeView } from "@/lib/iso/render";
import { project } from "@/lib/iso/geometry";
import { LOBBY_WAITING_SPOTS, SCENES, WORKSPACE_ID, isPersonalRoom, liftRooms, withSigns, withVisitors } from "@/lib/world/scenes";
import { buildGrid, walkable } from "@/lib/iso/path";
import { DEFAULT_LOCATIONS } from "@/lib/server/config/location-content";
import { locationsSchema } from "@/lib/server/config/definitions";
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

describe("wall signs", () => {
  const room = SCENES["ikoyi-boardroom"];

  it("adds a sign as a wall feature in capitals and leaves the room's own list alone", () => {
    const out = withSigns(room, [{ text: "Boardroom", wall: "x", at: 3, width: 4 }]);
    const sign = out.features.find((f) => f.kind === "sign");
    expect(sign).toMatchObject({ wall: "x", from: 3, to: 7, text: "BOARDROOM" });
    expect(room.features.some((f) => f.kind === "sign")).toBe(false);
    expect(withSigns(room, [])).toBe(room);
    expect(withSigns(room, undefined)).toBe(room);
  });

  it("ignores a sign that would run off the wall", () => {
    const out = withSigns(room, [{ text: "Too far", wall: "x", at: room.rows - 1, width: 4 }, { text: "Negative", wall: "y", at: -2, width: 2 }]);
    expect(out).toBe(room);
  });

  it("ships valid default signs that sit inside their rooms", () => {
    expect(locationsSchema.safeParse(DEFAULT_LOCATIONS).success).toBe(true);
    let count = 0;
    for (const r of DEFAULT_LOCATIONS.rooms) {
      const sc = SCENES[r.scene];
      for (const s of r.signs) {
        count++;
        expect(s.at).toBeGreaterThanOrEqual(0);
        expect(s.at + s.width).toBeLessThanOrEqual(s.wall === "x" ? sc.rows : sc.cols);
      }
    }
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

describe("lifts", () => {
  const all = Object.values(SCENES);

  it("never take you to a personal room: Floor 1 offers the open-plan floor, not the Workspace", () => {
    const floor1 = liftRooms(all, "ikoyi-hq", "floor-1");
    expect(floor1.map((s) => s.id)).toContain("ikoyi-floor");
    expect(floor1.map((s) => s.id)).not.toContain(WORKSPACE_ID);
    expect(floor1[0].id).toBe("ikoyi-floor");
    // the Workspace sits on Floor 1, so without the rule it would have come first
    expect(all.filter((s) => s.building === "ikoyi-hq" && s.level === "floor-1")[0].id).toBe(WORKSPACE_ID);
  });

  it("only treats the Workspace as personal", () => {
    expect(isPersonalRoom(WORKSPACE_ID)).toBe(true);
    expect(all.filter((s) => isPersonalRoom(s.id)).map((s) => s.id)).toEqual([WORKSPACE_ID]);
    for (const s of all) if (!isPersonalRoom(s.id)) expect(liftRooms(all, s.building, s.level).map((r) => r.id)).toContain(s.id);
  });
});

describe("clients waiting in the lobby", () => {
  const lobby = SCENES["ikoyi-lobby"];
  const waiting = [
    { id: "a1", name: "Mrs Esther Adeyemi", kind: "Walk-in" },
    { id: "a2", name: "Mr Kunle Bakare", kind: "Appointment" },
    { id: "a3", name: "Ms Amaka Obi", kind: "Walk-in" },
    { id: "a4", name: "Mr Femi Lawal", kind: "Walk-in" },
    { id: "a5", name: "Dr Bisi Coker", kind: "Walk-in" },
  ];

  it("stand in the lobby, at most four, each with their own look that never changes", () => {
    const out = withVisitors(lobby, waiting);
    const added = out.npcs.filter((n) => n.id.startsWith("visitor:"));
    expect(added).toHaveLength(4);
    expect(added[0]).toMatchObject({ id: "visitor:a1", name: "Adeyemi", role: "Walk-in" });
    expect(withVisitors(lobby, waiting).npcs).toEqual(out.npcs);
    expect(new Set(added.map((n) => JSON.stringify(n.look))).size).toBeGreaterThan(1);
    expect(lobby.npcs.some((n) => n.id.startsWith("visitor:"))).toBe(false); // the room itself is unchanged
  });

  it("only appear in the lobby, and nothing is added when nobody waits", () => {
    expect(withVisitors(SCENES["ikoyi-floor"], waiting)).toBe(SCENES["ikoyi-floor"]);
    expect(withVisitors(lobby, [])).toBe(lobby);
    expect(withVisitors(lobby, undefined)).toBe(lobby);
  });

  it("stand where a person can stand: every waiting spot is free floor in the lobby", () => {
    const grid = buildGrid(lobby);
    for (const s of LOBBY_WAITING_SPOTS) expect(walkable(grid, s.x, s.y)).toBe(true);
  });
});

