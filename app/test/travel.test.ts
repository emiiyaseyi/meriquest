import { beforeEach, describe, expect, it } from "vitest";
import { finishTrip, getTravel, startTrip, turnBack } from "@/lib/server/travel/service";
import { travelByMap, getOrCreatePlayer } from "@/lib/server/world/service";
import { getStore } from "@/lib/server/store";
import { setConfig } from "@/lib/server/config/registry";
import { travelSchema, transportSchema } from "@/lib/server/config/definitions";
import { SCENES, BUILDINGS } from "@/lib/world/scenes";
import { dto, freshWorld } from "./helpers";
import type { PlayerRecord } from "@/lib/server/world/service";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");

async function withPoints(n: number) {
  await getOrCreatePlayer({ staffId: "MS1001" }, NOW);
  await getStore().update<PlayerRecord>("players", "MS1001", (c) => (c ? { ...c, points: n } : c));
}

describe("travel between offices", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("has a Yaba office room and valid travel settings", async () => {
    expect(BUILDINGS.some((b) => b.id === "yaba-office")).toBe(true);
    expect(SCENES["yaba-lobby"]?.building).toBe("yaba-office");
    const t = await getTravel({ staffId: "MS1001" }, NOW);
    expect(t.modes.map((m) => m.id)).toEqual(["personal-car", "pool-car", "ride-hailing"]);
    expect(travelSchema.safeParse({ settings: { skipAllowed: true, turnBackAllowed: true }, events: [] }).success).toBe(true);
    expect(transportSchema.safeParse([{ id: "x", label: "X", costPoints: 0, minutes: 1, requiresBooking: false, enabled: true }]).success).toBe(true);
  });

  it("charges the cost, keeps the time on the server and arrives only when the ride is over", async () => {
    const user = await dto("MS1001");
    await withPoints(10);
    const r = await startTrip(user, "yaba-lobby", "ride-hailing", NOW);
    expect(r.ok && r.points).toBe(4);
    expect(r.ok && r.trip?.toName).toBe("Yaba office");
    const early = await finishTrip(user, false, NOW + 2000);
    expect(early.ok).toBe(false);
    const done = await finishTrip(user, false, NOW + 60_000);
    expect(done.ok && done.arrived?.scene).toBe("yaba-lobby");
    expect((await getOrCreatePlayer(user, NOW)).scene).toBe("yaba-lobby");
    expect((await getTravel(user, NOW)).active).toBeNull();
  });

  it("lets a ride be skipped when allowed, and refuses when not", async () => {
    const user = await dto("MS1001");
    await startTrip(user, "yaba-lobby", "pool-car", NOW);
    expect((await finishTrip(user, true, NOW + 1000)).ok).toBe(true);
    await travelByMap(user, "yaba-lobby", NOW); // same building now: allowed
    // switch skipping off
    await setConfig("travel", JSON.stringify({ settings: { skipAllowed: false, turnBackAllowed: true }, events: [] }), "MS0001");
    await getStore().update<PlayerRecord>("players", "MS1001", (c) => (c ? { ...c, scene: "ikoyi-lobby" } : c));
    await startTrip(user, "yaba-lobby", "pool-car", NOW + 5000);
    expect((await finishTrip(user, true, NOW + 5500)).ok).toBe(false);
  });

  it("can turn back to where it began, and the cost stays paid", async () => {
    const user = await dto("MS1001");
    await withPoints(10);
    await startTrip(user, "yaba-lobby", "personal-car", NOW);
    const back = await turnBack(user, NOW + 1000);
    expect(back.ok && back.arrived?.scene).toBe("ikoyi-lobby");
    const p = await getOrCreatePlayer(user, NOW);
    expect(p.trip).toBeUndefined();
    expect(p.points).toBe(7);
  });

  it("refuses bad requests, not enough points, two rides, and moving about on a ride", async () => {
    const user = await dto("MS1001");
    await withPoints(2);
    expect((await startTrip(user, "yaba-lobby", "ride-hailing", NOW)).ok).toBe(false); // 6 points
    expect((await startTrip(user, "nowhere", "pool-car", NOW)).ok).toBe(false);
    expect((await startTrip(user, "yaba-lobby", "teleport", NOW)).ok).toBe(false);
    expect((await startTrip(user, "ikoyi-floor", "pool-car", NOW)).ok).toBe(false); // same building
    expect((await startTrip(user, "yaba-lobby", "pool-car", NOW)).ok).toBe(true);
    expect((await startTrip(user, "yaba-lobby", "pool-car", NOW + 1)).ok).toBe(false);
    expect((await travelByMap(user, "ikoyi-floor", NOW + 2)).ok).toBe(false);
    expect((await finishTrip(await dto("MS1003"), false, NOW)).ok).toBe(false); // someone else is not on a ride
  });
});
