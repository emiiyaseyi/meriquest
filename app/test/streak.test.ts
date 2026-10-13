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
