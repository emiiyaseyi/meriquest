import { beforeEach, describe, expect, it } from "vitest";
import { cancelActivity, completeActivity, getLocation, startActivity } from "@/lib/server/game/activities";
import { getStore } from "@/lib/server/store";
import { getOrCreatePlayer, type PlayerRecord } from "@/lib/server/world/service";
import { DEFAULT_LOCATIONS } from "@/lib/server/config/location-content";
import { locationsSchema } from "@/lib/server/config/definitions";
import { SCENES } from "@/lib/world/scenes";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const me = { staffId: "MS1001", unit: "cx", role: "player" as const };

async function goTo(scene: string) {
  await getOrCreatePlayer(me, NOW);
  await getStore().update<PlayerRecord>("players", me.staffId, (cur) => (cur ? { ...cur, scene, needs: { ...cur.needs, growth: 40, social: 40 } } : cur));
}

describe("location bar activities", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("ships valid activities for rooms that exist", () => {
    expect(locationsSchema.safeParse(DEFAULT_LOCATIONS).success).toBe(true);
    for (const r of DEFAULT_LOCATIONS.rooms) expect(SCENES[r.scene]).toBeDefined();
  });

  it("shows the zones of the room the person is in", async () => {
    await goTo("ikoyi-floor");
    const loc = await getLocation(me, NOW);
    expect(loc?.zones.map((z) => z.label)).toEqual(["Pantry", "Reading corner", "Team area"]);
    expect(loc?.running).toBeNull();
  });

  it("keeps the time on the server and pays when it is up, once", async () => {
    await goTo("ikoyi-floor");
    const s = await startActivity(me, "library-read", NOW);
    expect(s.ok && s.location.running?.id).toBe("library-read");
    expect((await completeActivity(me, NOW + 3_000)).ok).toBe(false); // 10 s activity
    const before = await getOrCreatePlayer(me, NOW);
    const done = await completeActivity(me, NOW + 10_500);
    expect(done.ok).toBe(true);
    const after = await getOrCreatePlayer(me, NOW + 10_500);
    expect(after.points - before.points).toBe(1);
    expect(after.needs.growth).toBeGreaterThan(before.needs.growth);
    expect(after.activity).toBeUndefined();
    expect((await completeActivity(me, NOW + 11_000)).ok).toBe(false);
  });

  it("will not repeat before the cooldown, start two at once, or use another room's activity", async () => {
    await goTo("ikoyi-floor");
    await startActivity(me, "library-read", NOW);
    expect((await startActivity(me, "pantry-water", NOW + 1000)).ok).toBe(false);
    await completeActivity(me, NOW + 11_000);
    expect((await startActivity(me, "library-read", NOW + 12_000)).ok).toBe(false);
    expect((await startActivity(me, "lobby-greet", NOW + 12_000)).ok).toBe(false);
    expect((await startActivity(me, "nonsense", NOW)).ok).toBe(false);
  });

  it("can be stopped without any reward", async () => {
    await goTo("ikoyi-floor");
    await startActivity(me, "team-huddle", NOW);
    const before = await getOrCreatePlayer(me, NOW);
    await cancelActivity(me, NOW + 1000);
    const after = await getOrCreatePlayer(me, NOW + 1000);
    expect(after.points).toBe(before.points);
    expect(after.activity).toBeUndefined();
  });
});
