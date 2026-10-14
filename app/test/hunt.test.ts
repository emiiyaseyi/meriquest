import { beforeEach, describe, expect, it } from "vitest";
import { clueFor, ensureHunt, huntView } from "@/lib/server/game/hunt";
import { getGameState } from "@/lib/server/game/service";
import { travelByMap, getOrCreatePlayer } from "@/lib/server/world/service";
import { getConfig } from "@/lib/server/config/registry";
import { huntSchema } from "@/lib/server/config/definitions";
import { DEFAULT_HUNT } from "@/lib/server/config/hunt-content";
import { SCENES } from "@/lib/world/scenes";
import { dayKey } from "@/lib/game";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T10:00:00+01:00");

describe("daily clue", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("ships valid clues that all point to real rooms", () => {
    expect(huntSchema.safeParse(DEFAULT_HUNT).success).toBe(true);
    for (const c of DEFAULT_HUNT.clues) expect(SCENES[c.scene], c.id).toBeDefined();
  });

  it("gives the same clue all day and tends to change from day to day", async () => {
    const cfg = await getConfig("hunt");
    expect(clueFor(cfg, "MS1001", "2026-10-14")).toBe(clueFor(cfg, "MS1001", "2026-10-14"));
    const days = ["2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"];
    expect(new Set(days.map((d) => clueFor(cfg, "MS1001", d).id)).size).toBeGreaterThan(1);
  });

  it("never reveals the room before it is found", async () => {
    await getOrCreatePlayer({ staffId: "MS1001" }, NOW);
    const g = await getGameState({ staffId: "MS1001" }, NOW);
    expect(g.hunt?.found).toBe(false);
    expect(JSON.stringify(g.hunt)).not.toMatch(/ikoyi|my-workspace/);
  });

  it("pays the faster reward on arriving in the right room, once", async () => {
    const user = await dto("MS1001");
    const cfg = await getConfig("hunt");
    const today = dayKey(NOW, (await getConfig("workFirst")).timezone);
    const target = clueFor(cfg, "MS1001", today).scene;
    await getOrCreatePlayer(user, NOW);
    await ensureHunt("MS1001", NOW);
    // Start somewhere else so that arriving counts
    const elsewhere = Object.keys(SCENES).find((id) => id !== target && SCENES[id].level !== "floor-2" && id !== "ikoyi-floor") ?? "ikoyi-lobby";
    await travelByMap(user, elsewhere === "my-workspace" && target !== "ikoyi-lobby" ? "ikoyi-lobby" : elsewhere, NOW);
    const before = (await getOrCreatePlayer(user, NOW)).points;
    const r = await travelByMap(user, target, NOW + 5 * 60_000);
    expect(r.ok).toBe(true);
    const after = (await getOrCreatePlayer(user, NOW)).points;
    expect(after - before).toBe(cfg.settings.pointsFast);
    // arriving again pays nothing more
    await travelByMap(user, elsewhere, NOW + 6 * 60_000);
    await travelByMap(user, target, NOW + 7 * 60_000);
    expect((await getOrCreatePlayer(user, NOW)).points).toBe(after);
    expect((await getGameState(user, NOW + 8 * 60_000)).hunt?.found).toBe(true);
  });

  it("pays the lower reward when found after the first window", async () => {
    const user = await dto("MS1001");
    const cfg = await getConfig("hunt");
    const today = dayKey(NOW, (await getConfig("workFirst")).timezone);
    const target = clueFor(cfg, "MS1001", today).scene;
    await getOrCreatePlayer(user, NOW);
    await ensureHunt("MS1001", NOW);
    const elsewhere = target === "ikoyi-lobby" ? "ikoyi-lounge" : "ikoyi-lobby";
    await travelByMap(user, elsewhere, NOW);
    const before = (await getOrCreatePlayer(user, NOW)).points;
    await travelByMap(user, target, NOW + (cfg.settings.fastMinutes + 5) * 60_000);
    expect((await getOrCreatePlayer(user, NOW)).points - before).toBe(cfg.settings.pointsLater);
  });

  it("builds the view from the settings", async () => {
    const cfg = await getConfig("hunt");
    const v = huntView({ staffId: "MS1001", hunt: undefined }, cfg, NOW, "2026-10-14");
    expect(v?.pointsNow).toBe(cfg.settings.pointsFast);
    expect(huntView({ staffId: "MS1001", hunt: undefined }, { ...cfg, clues: [] }, NOW, "2026-10-14")).toBeNull();
  });
});
