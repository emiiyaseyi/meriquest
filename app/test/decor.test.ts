import { beforeEach, describe, expect, it } from "vitest";
import { buyItem, getDecor, moveItem, placeItem, ratesFor, removeItem, setDecorMode } from "@/lib/server/decor/service";
import { getConfig } from "@/lib/server/config/registry";
import { getStore } from "@/lib/server/store";
import { getOrCreatePlayer, type PlayerRecord } from "@/lib/server/world/service";
import { DEFAULT_DECOR } from "@/lib/server/config/decor-content";
import { decorSchema } from "@/lib/server/config/definitions";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const me = { staffId: "MS1001" };

async function withPoints(n: number) {
  await getOrCreatePlayer(me, NOW);
  await getStore().update<PlayerRecord>("players", me.staffId, (cur) => (cur ? { ...cur, points: n } : cur));
}

describe("Workspace decoration", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("ships a valid catalogue", () => {
    expect(decorSchema.safeParse(DEFAULT_DECOR).success).toBe(true);
  });

  it("charges Merit points and refuses when there are not enough", async () => {
    await withPoints(5);
    const no = await buyItem(me, "standing-desk", NOW);
    expect(no.ok).toBe(false);
    const yes = await buyItem(me, "pen-tray", NOW);
    expect(yes.ok && yes.view.points).toBe(2);
    expect(yes.ok && yes.view.decor.owned["pen-tray"]).toBe(1);
  });

  it("lets the person place, move and put away, and keeps things in the room and apart", async () => {
    await withPoints(100);
    await buyItem(me, "plain-desk", NOW);
    await buyItem(me, "small-plant", NOW);
    const bad = await placeItem(me, "plain-desk", 7, 0, NOW); // 2 wide, would leave the room
    expect(bad.ok).toBe(false);
    const placed = await placeItem(me, "plain-desk", 0, 0, NOW);
    expect(placed.ok).toBe(true);
    expect((await placeItem(me, "small-plant", 1, 0, NOW)).ok).toBe(false); // on the desk
    const plant = await placeItem(me, "small-plant", 2, 0, NOW);
    expect(plant.ok).toBe(true);
    const uid = (await getDecor(me)).decor.placed.find((p) => p.item === "small-plant")?.uid as string;
    expect((await moveItem(me, uid, 0, 0, NOW)).ok).toBe(false);
    expect((await moveItem(me, uid, 3, 3, NOW)).ok).toBe(true);
    const away = await removeItem(me, uid, NOW);
    expect(away.ok && away.view.decor.placed.some((p) => p.uid === uid)).toBe(false);
    expect(away.ok && away.view.decor.owned["small-plant"]).toBe(1);
  });

  it("will not place what is not owned, or more than owned", async () => {
    await withPoints(100);
    expect((await placeItem(me, "rug", 0, 0, NOW)).ok).toBe(false);
    await buyItem(me, "rug", NOW);
    expect((await placeItem(me, "rug", 0, 0, NOW)).ok).toBe(true);
    expect((await placeItem(me, "rug", 4, 0, NOW)).ok).toBe(false);
  });

  it("places new things for the person in automatic mode", async () => {
    await withPoints(100);
    await setDecorMode(me, "auto", NOW);
    const r = await buyItem(me, "fern", NOW);
    expect(r.ok && r.view.decor.placed).toHaveLength(1);
    expect((await setDecorMode(me, "nonsense", NOW)).ok).toBe(false);
  });

  it("slows the fall of a need for things that help, within the cap", async () => {
    await withPoints(500);
    await setDecorMode(me, "auto", NOW);
    for (let i = 0; i < 8; i++) await buyItem(me, "palm", NOW); // 0.08 each, capped at 0.5
    const [gameplay, cfg, view] = await Promise.all([getConfig("gameplay"), getConfig("decor"), getDecor(me)]);
    const slowed = ratesFor(gameplay.decayPerHour, view.decor, cfg);
    expect(slowed.mood).toBeCloseTo(gameplay.decayPerHour.mood * 0.5, 5);
    expect(slowed.energy).toBe(gameplay.decayPerHour.energy);
  });

  it("ignores a tampered record", async () => {
    await withPoints(0);
    await getStore().update<PlayerRecord>("players", me.staffId, (cur) => (cur ? ({ ...cur, decor: { owned: { palm: -3, ghost: 5 }, placed: [{ uid: "x", item: "palm", x: 0, y: 0 }], mode: "evil" } } as unknown as PlayerRecord) : cur));
    const v = await getDecor(me);
    expect(v.decor).toEqual({ owned: {}, placed: [], mode: "grid" });
  });
});
