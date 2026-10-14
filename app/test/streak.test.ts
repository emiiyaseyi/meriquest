import { beforeEach, describe, expect, it } from "vitest";
import { nextStreak, streakDay, missionLevel } from "@/lib/game";
import { getGameState, swapMission } from "@/lib/server/game/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { freshWorld } from "./helpers";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const me = { staffId: "MS1001" };

describe("streak and mission swaps", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("grows by a day when yesterday was checked in, and starts again after a gap", () => {
    const a = nextStreak(undefined, "2026-10-13", "2026-10-12");
    expect(a).toEqual({ last: "2026-10-13", count: 1, best: 1 });
    expect(nextStreak(a, "2026-10-13", "2026-10-12")).toBe(a);
    const b = nextStreak(a, "2026-10-14", "2026-10-13");
    expect(b.count).toBe(2);
    const c = nextStreak(b, "2026-10-17", "2026-10-16");
    expect(c).toEqual({ last: "2026-10-17", count: 1, best: 2 });
  });

  it("wraps the 7-day track and labels missions by what they pay", () => {
    expect([1, 7, 8, 14, 15].map(streakDay)).toEqual([1, 7, 1, 7, 1]);
    expect([2, 5, 8].map(missionLevel)).toEqual(["Easy", "Medium", "Hard"]);
  });

  it("checks in once a day, pays the reward day once, and keeps the streak over days", async () => {
    await getOrCreatePlayer(me, NOW);
    const first = await getGameState(me, NOW);
    expect(first.streak).toMatchObject({ count: 1, checkedInToday: true, day: 1 });
    const again = await getGameState(me, NOW + 1000);
    expect(again.streak.count).toBe(1);
    expect(again.points).toBe(first.points);
    await getGameState(me, NOW + DAY);
    const third = await getGameState(me, NOW + 2 * DAY); // day 3 pays +5
    expect(third.streak).toMatchObject({ count: 3, day: 3 });
    expect(third.points).toBe(first.points + 5);
    expect(third.streak.track.filter((t) => t.done)).toHaveLength(3);
    const missed = await getGameState(me, NOW + 5 * DAY);
    expect(missed.streak).toMatchObject({ count: 1, best: 3 });
  });

  it("lets a mission that is not started be swapped once a day", async () => {
    const s = await getGameState(me, NOW);
    const target = s.plan.missions[0];
    expect(target.canSwap).toBe(true);
    const r = await swapMission(me, target.id, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.plan.missions.map((m) => m.id)).not.toContain(target.id);
      expect(r.state.plan.swapsLeft).toBe(0);
      expect(r.state.plan.missions.every((m) => !m.canSwap)).toBe(true);
    }
    expect((await swapMission(me, s.plan.missions[1].id, NOW)).ok).toBe(false);
    expect((await swapMission(me, "nonsense", NOW)).ok).toBe(false);
  });
});

describe("swap preview", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("shows exactly the mission the server then swaps to", async () => {
    const s = await getGameState(me, NOW);
    const target = s.plan.missions[1];
    expect(target.swapTo).toBeDefined();
    const r = await swapMission(me, target.id, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.plan.missions[1].id).toBe(target.swapTo?.id);
      expect(r.state.plan.missions[1].title).toBe(target.swapTo?.title);
      expect(r.state.plan.missions.every((m) => m.swapTo === undefined)).toBe(true); // no swaps left
    }
  });
});

describe("showing a result at once", () => {
  const base = { needs: { energy: 50, focus: 50, mood: 50, social: 50, hunger: 50, hydration: 50, growth: 50, recognition: 50 }, points: 10, cooldowns: {} as Record<string, number> };

  it("applies the effects, the cost and the cooldown, never past the limits", async () => {
    const { predictAction } = await import("@/lib/game");
    const r = predictAction(base, { key: "hello:a", effects: { social: 70, mood: -80 }, cost: 4, gain: 1, cooldownMinutes: 30 }, 1000);
    expect(typeof r).not.toBe("string");
    if (typeof r !== "string") {
      expect(r.needs.social).toBe(100);
      expect(r.needs.mood).toBe(0);
      expect(r.points).toBe(7);
      expect(r.cooldowns["hello:a"]).toBe(1000 + 30 * 60_000);
    }
  });

  it("refuses what would be refused: a running cooldown or not enough points", async () => {
    const { predictAction } = await import("@/lib/game");
    expect(predictAction({ ...base, cooldowns: { k: 5000 } }, { key: "k", effects: {}, cooldownMinutes: 1 }, 1000)).toMatch(/Not just yet/);
    expect(predictAction(base, { key: "k", effects: {}, cost: 50, cooldownMinutes: 0 }, 1000)).toMatch(/need 50/);
  });
});
