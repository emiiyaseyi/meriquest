import { beforeEach, describe, expect, it } from "vitest";
import { floorBlock, floorStatuses } from "@/lib/world/access";
import { BUILDINGS, SCENES } from "@/lib/world/scenes";
import { setConfig } from "@/lib/server/config/registry";
import { getOrCreatePlayer, travelByMap, travelByPortal } from "@/lib/server/world/service";
import { getStore } from "@/lib/server/store";
import type { PlayerRecord } from "@/lib/server/world/service";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const player = { unit: "wealth", role: "player" };

describe("floor access rules", () => {
  const rules = [
    { level: "floor-2", access: "closed" as const, units: [], note: "Floor 2 is restricted for now." },
    { level: "floor-5", access: "units" as const, units: ["it", "risk"], note: "" },
  ];
  it("lets everyone onto floors that are not listed", () => {
    expect(floorBlock(rules, "floor-1", player)).toBeNull();
    expect(floorBlock([], "floor-2", player)).toBeNull();
  });
  it("keeps everyone out of a closed floor, except admins previewing it", () => {
    expect(floorBlock(rules, "floor-2", player)).toBe("Floor 2 is restricted for now.");
    expect(floorBlock(rules, "floor-2", { unit: "it", role: "manager" })).not.toBeNull();
    expect(floorBlock(rules, "floor-2", { unit: "it", role: "admin" })).toBeNull();
  });
  it("lets only the listed units onto a unit floor", () => {
    expect(floorBlock(rules, "floor-5", { unit: "it", role: "player" })).toBeNull();
    expect(floorBlock(rules, "floor-5", player)).toMatch(/not open to your team/);
  });
  it("describes every level for one person", () => {
    const s = floorStatuses(rules, BUILDINGS[0].levels, player);
    expect(Object.keys(s)).toHaveLength(BUILDINGS[0].levels.length);
    expect(s["floor-2"]).toEqual({ blocked: true, note: "Floor 2 is restricted for now." });
    expect(s["ground"]).toEqual({ blocked: false, note: "" });
  });
});

describe("the lift and the server", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("marks the lifts, and only the lifts", () => {
    const lifts = Object.values(SCENES).flatMap((s) => s.portals.filter((p) => p.lift).map((p) => `${s.id}:${p.id}`));
    expect(lifts.sort()).toEqual(["ikoyi-floor:to-lobby", "ikoyi-lobby:to-floor"]);
  });

  it("floor 2 is closed by default and nothing is built there, so nobody is blocked from a real room", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, NOW);
    expect((await travelByPortal(user, "to-floor", NOW)).ok).toBe(true);
  });

  it("refuses a closed floor even if the browser asks for it directly", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, NOW);
    // Close the floor that the open-plan room is on
    expect((await setConfig("floors", JSON.stringify([{ level: "floor-1", access: "closed", units: [], note: "Closed for a fire drill." }]), "MS0001")).ok).toBe(true);
    const door = await travelByPortal(user, "to-floor", NOW);
    expect(door).toEqual({ ok: false, error: "Closed for a fire drill." });
    expect(await travelByMap(user, "ikoyi-floor", NOW)).toEqual({ ok: false, error: "Closed for a fire drill." });
    expect((await getStore().get<PlayerRecord>("players", "MS1001"))!.scene).toBe("ikoyi-lobby"); // never moved
  });

  it("lets the right unit through and an admin preview through", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, NOW);
    await setConfig("floors", JSON.stringify([{ level: "floor-1", access: "units", units: ["not-your-unit"], note: "" }]), "MS0001");
    expect((await travelByMap(user, "ikoyi-floor", NOW)).ok).toBe(false);
    await setConfig("floors", JSON.stringify([{ level: "floor-1", access: "units", units: [user.unit], note: "" }]), "MS0001");
    expect((await travelByMap(user, "ikoyi-floor", NOW)).ok).toBe(true);
    await setConfig("floors", JSON.stringify([{ level: "floor-1", access: "closed", units: [], note: "" }]), "MS0001");
    expect((await travelByMap(user, "ikoyi-lobby", NOW)).ok).toBe(true); // ground floor is still open
    expect((await travelByMap({ ...user, role: "admin" }, "ikoyi-floor", NOW)).ok).toBe(true);
  });

  it("rejects settings that make no sense", async () => {
    for (const bad of [[{ level: "floor-2", access: "maybe", units: [], note: "" }], [{ level: "floor-2", access: "closed", units: [], note: "" }, { level: "floor-2", access: "open", units: [], note: "" }], [{ level: "Floor 2", access: "closed", units: [], note: "" }]]) {
      expect((await setConfig("floors", JSON.stringify(bad), "MS0001")).ok).toBe(false);
    }
  });
});
