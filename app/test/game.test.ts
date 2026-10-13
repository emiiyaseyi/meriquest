import { beforeEach, describe, expect, it } from "vitest";
import { applyEffects, cleanProgress, dayKey, decayNeeds, effectTags, pickMissions, skillStanding } from "@/lib/game";
import { CONFIG } from "@/lib/server/config/definitions";
import { setConfig } from "@/lib/server/config/registry";
import { getStore } from "@/lib/server/store";
import { claimDailyBonus, claimMission, getGameState, interact, takeCoffee } from "@/lib/server/game/service";
import { getOrCreatePlayer, travelByPortal } from "@/lib/server/world/service";
import type { PlayerRecord } from "@/lib/server/world/service";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const GP = CONFIG.gameplay.default;
const HOUR = 3_600_000;

describe("needs rules", () => {
  const needs = { energy: 80, focus: 70, mood: 60, social: 50 };
  it("fall by the hourly rate for the time passed, and never below zero", () => {
    expect(decayNeeds(needs, HOUR / 2, GP.decayPerHour)).toEqual({ energy: 76, focus: 65, mood: 58, social: 47 });
    expect(decayNeeds({ energy: 3, focus: 3, mood: 3, social: 3 }, HOUR, GP.decayPerHour)).toEqual({ energy: 0, focus: 0, mood: 0, social: 0 });
  });
  it("count at most one hour away, and ignore negative time", () => {
    expect(decayNeeds(needs, 100 * HOUR, GP.decayPerHour)).toEqual(decayNeeds(needs, HOUR, GP.decayPerHour));
    expect(decayNeeds(needs, -5 * HOUR, GP.decayPerHour)).toEqual(needs);
  });
  it("rise with effects, capped at 100", () => {
    expect(applyEffects(needs, { social: 5, energy: 50 })).toEqual({ energy: 100, focus: 70, mood: 60, social: 55 });
    expect(applyEffects(needs, {})).toEqual(needs);
  });
  it("name the bars an effect raises", () => {
    expect(effectTags({ mood: 8, social: 8, energy: 4 })).toEqual(["+Energy", "+Mood", "+Social"]);
    expect(effectTags({ focus: -3 })).toEqual([]);
  });
});

describe("skills and missions rules", () => {
  const def = { id: "communication", label: "Communication", icon: "💬", xpPerLevel: 10, maxLevel: 10 };
  it("turn experience into levels, up to a maximum", () => {
    expect(skillStanding(def, 0)).toMatchObject({ level: 0, progress: 0 });
    expect(skillStanding(def, 25)).toMatchObject({ level: 2, progress: 0.5 });
    expect(skillStanding(def, 9999)).toMatchObject({ level: 10, progress: 1 });
    expect(skillStanding(def, -4).level).toBe(0);
  });
  it("use the Lagos date, not the server's", () => {
    expect(dayKey(Date.parse("2026-10-13T23:30:00+01:00"), "Africa/Lagos")).toBe("2026-10-13");
    expect(dayKey(Date.parse("2026-10-13T23:30:00Z"), "Africa/Lagos")).toBe("2026-10-14");
  });
  it("pick the same missions for a person all day, without repeats", () => {
    const a = pickMissions(GP.missions, 3, "MS1", "2026-10-13");
    expect(pickMissions(GP.missions, 3, "MS1", "2026-10-13")).toEqual(a);
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
    expect(pickMissions(GP.missions, 99, "MS1", "2026-10-13")).toHaveLength(GP.missions.length);
    expect(pickMissions([], 3, "MS1", "x")).toEqual([]);
  });
  it("clean stored game fields", () => {
    const c = cleanProgress({ feelings: [{ at: 1, label: "x".repeat(99) }, null, "bad", { at: "no" }], skillXp: { communication: 5, bad: -1, worse: "x", __proto__: 9 }, cooldowns: [1, 2], needsAt: "soon" });
    expect(c.feelings).toHaveLength(1);
    expect(c.feelings[0].label).toHaveLength(30);
    expect(c.skillXp).toEqual({ communication: 5 });
    expect(c.cooldowns).toEqual({});
    expect(c.needsAt).toBeUndefined();
  });
});

describe("playing: interactions, coffee, missions", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  const rec = (staffId: string) => getStore().get<PlayerRecord>("players", staffId);

  it("saying hello raises Social, gives a feeling and skill experience, and starts a cooldown", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, NOW);
    const before = (await rec("MS1001"))!.needs;
    const r = await interact(user, "hello", "rec1", NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.needs.social).toBe(before.social + 5);
    expect(r.state.feelings[0]).toMatchObject({ label: "Friendly hello", change: "+Social" });
    expect(r.state.skills.find((s) => s.id === "communication")?.progress).toBeCloseTo(0.2, 5);
    expect(r.state.cooldowns["hello:rec1"]).toBe(NOW + 30 * 60_000);
    // again straight away: refused, with a time
    const again = await interact(user, "hello", "rec1", NOW + 60_000);
    expect(again).toMatchObject({ ok: false });
    if (!again.ok) expect(again.error).toMatch(/29 minutes/);
    // a different person is fine, and so is the same one after the cooldown
    expect((await interact(user, "hello", "rec2", NOW + 60_000)).ok).toBe(true);
    expect((await interact(user, "hello", "rec1", NOW + 31 * 60_000)).ok).toBe(true);
  });

  it("refuses people who are not in the room, unknown interactions and non-strings", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, NOW);
    for (const [i, n] of [["hello", "col1"], ["hello", "nobody"], ["nonsense", "rec1"], [5, "rec1"], ["hello", {}], ["x".repeat(100), "rec1"], ["__proto__", "rec1"]] as [unknown, unknown][]) {
      expect(await interact(user, i, n, NOW)).toMatchObject({ ok: false });
    }
  });

  it("charges Merit points for a drink, and refuses when there are not enough", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, NOW);
    const broke = await interact(user, "drink", "rec1", NOW);
    expect(broke).toMatchObject({ ok: false });
    await getStore().update<PlayerRecord>("players", "MS1001", (c) => (c ? { ...c, points: 12 } : c));
    const ok = await interact(user, "drink", "rec1", NOW);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.state.points).toBe(7);
    // cooldown means no double charge
    expect((await interact(user, "drink", "rec1", NOW + 1000)).ok).toBe(false);
    expect((await rec("MS1001"))!.points).toBe(7);
  });

  it("call for support builds Client care", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, NOW);
    const r = await interact(user, "support", "rec1", NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.skills.find((s) => s.id === "client-care")?.progress).toBeCloseTo(0.5, 5);
  });

  it("coffee needs a coffee point in the room", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, NOW);
    expect(await takeCoffee(user, NOW)).toMatchObject({ ok: false, error: expect.stringMatching(/no coffee point/) });
    await travelByPortal(user, "to-floor", NOW);
    const r = await takeCoffee(user, NOW + 10);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.feelings[0].label).toBe("Fresh coffee");
    expect((await takeCoffee(user, NOW + 20)).ok).toBe(false); // cooldown
  });

  it("needs fall with time on the server", async () => {
    const user = await dto("MS1001");
    const first = await getGameState(user, NOW);
    const later = await getGameState(user, NOW + HOUR / 2);
    expect(later.needs.energy).toBe(first.needs.energy - 4);
    expect(later.needs.focus).toBe(first.needs.focus - 5);
  });

  it("gives three missions a day, counts progress, pays rewards once, and pays the bonus once", async () => {
    const user = await dto("MS1001");
    const set = await setConfig(
      "gameplay",
      JSON.stringify({ ...GP, missionsPerDay: 2, missions: [{ id: "greet", title: "Greet", description: "Say hello twice", event: "hello", target: 2, rewardPoints: 5 }, { id: "tour", title: "Explore", description: "Visit a room", event: "visit", target: 1, rewardPoints: 3 }] }),
      "MS0001",
    );
    expect(set.ok).toBe(true);
    await getOrCreatePlayer(user, NOW);
    const s0 = await getGameState(user, NOW);
    expect(s0.plan.missions.map((m) => m.id).sort()).toEqual(["greet", "tour"]);
    expect(await claimMission(user, "greet", NOW)).toMatchObject({ ok: false }); // not done yet
    await interact(user, "hello", "rec1", NOW);
    await interact(user, "hello", "rec2", NOW);
    await travelByPortal(user, "to-floor", NOW);
    const s1 = await getGameState(user, NOW);
    expect(s1.plan.missions.every((m) => m.done)).toBe(true);
    expect(s1.plan.allDone).toBe(true);
    const c1 = await claimMission(user, "greet", NOW);
    expect(c1.ok && c1.state.points).toBe(5);
    expect(await claimMission(user, "greet", NOW)).toMatchObject({ ok: false }); // only once
    expect((await claimMission(user, "tour", NOW)).ok).toBe(true);
    const b = await claimDailyBonus(user, NOW);
    expect(b.ok && b.state.points).toBe(5 + 3 + GP.dailyBonusPoints);
    expect(await claimDailyBonus(user, NOW)).toMatchObject({ ok: false });
    // a new day brings a fresh plan
    const tomorrow = await getGameState(user, NOW + 24 * HOUR);
    expect(tomorrow.plan.day).not.toBe(s0.plan.day);
    expect(tomorrow.plan.bonusClaimed).toBe(false);
  });

  it("refuses to claim things that are not in today's plan", async () => {
    const user = await dto("MS1001");
    for (const bad of ["nonsense", "", 5, null, "x".repeat(100)]) expect(await claimMission(user, bad, NOW)).toMatchObject({ ok: false });
    expect(await claimDailyBonus(user, NOW)).toMatchObject({ ok: false });
  });

  it("two claims at the same moment still pay once", async () => {
    const user = await dto("MS1001");
    expect((await setConfig("gameplay", JSON.stringify({ ...GP, missionsPerDay: 1, missions: [{ id: "tour", title: "Explore", description: "Visit a room", event: "visit", target: 1, rewardPoints: 7 }] }), "MS0001")).ok).toBe(true);
    await getOrCreatePlayer(user, NOW);
    await travelByPortal(user, "to-floor", NOW);
    await Promise.all([claimMission(user, "tour", NOW), claimMission(user, "tour", NOW)]);
    expect((await rec("MS1001"))!.points).toBe(7);
  });

  it("settings that make no sense are rejected", async () => {
    expect((await setConfig("gameplay", JSON.stringify(GP), "MS0001")).ok).toBe(true);
    expect((await setConfig("gameplay", JSON.stringify({ ...GP, decayPerHour: { ...GP.decayPerHour, energy: -5 } }), "MS0001")).ok).toBe(false);
    expect((await setConfig("gameplay", JSON.stringify({ ...GP, interactions: [{ ...GP.interactions[0], cost: -1 }] }), "MS0001")).ok).toBe(false);
    expect((await setConfig("gameplay", JSON.stringify({ ...GP, extra: true }), "MS0001")).ok).toBe(false);
  });
});
