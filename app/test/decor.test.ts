import { beforeEach, describe, expect, it } from "vitest";
import { buyAndPlace, buyItem, getDecor, moveItem, placeItem, ratesFor, removeItem, setDecorMode } from "@/lib/server/decor/service";
import { getConfig, setConfig } from "@/lib/server/config/registry";
import { getStore } from "@/lib/server/store";
import { getOrCreatePlayer, type PlayerRecord } from "@/lib/server/world/service";
import { DEFAULT_DECOR } from "@/lib/server/config/decor-content";
import { decorSchema } from "@/lib/server/config/definitions";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const me = { staffId: "MS1001", title: "Officer", tenureYears: 0, isLineManager: false };

/** The earlier tests were written for one 8 by 6 area, so they run with a single layout of that size. */
async function oneLayout8x6() {
  const only = { ...DEFAULT_DECOR.layouts[DEFAULT_DECOR.layouts.length - 1], id: "all", label: "Workspace", gridW: 8, gridD: 6, maxPlaced: 30 };
  const r = await setConfig("decor", JSON.stringify({ ...DEFAULT_DECOR, layouts: [only] }), "MS0001", NOW);
  if (!r.ok) throw new Error(r.errors.join(", "));
}

async function withPoints(n: number) {
  await getOrCreatePlayer(me, NOW);
  await getStore().update<PlayerRecord>("players", me.staffId, (cur) => (cur ? { ...cur, points: n } : cur));
}

describe("Workspace decoration", () => {
  beforeEach(async () => {
    await freshWorld();
    await oneLayout8x6();
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

describe("placing panel: buy and place, and turning", () => {
  beforeEach(async () => {
    await freshWorld();
    await oneLayout8x6();
  });

  it("buys and places in one step, only when the spot is free and the points are enough", async () => {
    await withPoints(10);
    expect((await buyAndPlace(me, "standing-desk", 0, 0, 0, NOW)).ok).toBe(false); // costs 24
    const r = await buyAndPlace(me, "plain-desk", 0, 0, 0, NOW);
    expect(r.ok && r.view.points).toBe(4);
    expect(r.ok && r.view.decor.placed).toHaveLength(1);
    expect((await buyAndPlace(me, "pen-tray", 1, 0, 0, NOW)).ok).toBe(false); // on the desk, and nothing is charged
    expect((await getDecor(me)).points).toBe(4);
  });

  it("uses a copy already owned instead of charging again", async () => {
    await withPoints(20);
    await buyItem(me, "rug", NOW);
    const before = (await getDecor(me)).points;
    const r = await buyAndPlace(me, "rug", 0, 0, 0, NOW);
    expect(r.ok && r.view.points).toBe(before);
  });

  it("swaps the footprint when turned, and keeps turned things apart", async () => {
    await withPoints(100);
    const a = await buyAndPlace(me, "plain-desk", 7, 0, 1, NOW); // 2x1 turned is 1x2: fits at the edge
    expect(a.ok).toBe(true);
    expect((await buyAndPlace(me, "plain-desk", 7, 0, 0, NOW)).ok).toBe(false); // 2 wide would leave the room
    expect((await buyAndPlace(me, "pen-tray", 7, 1, 0, NOW)).ok).toBe(false); // the turned desk covers (7,1)
    expect((await buyAndPlace(me, "pen-tray", 6, 1, 0, NOW)).ok).toBe(true);
    const uid = (await getDecor(me)).decor.placed[0].uid;
    expect((await moveItem(me, uid, 0, 0, NOW, 0)).ok).toBe(true); // turned back and moved
  });
});

describe("Workspace room", () => {
  it("draws only things the person has placed, inside the room, and leaves other rooms alone", async () => {
    const { SCENES, WORKSPACE_ID, WORKSPACE_OFFSET, withDecor } = await import("@/lib/world/scenes");
    const items = new Map([["plant", { w: 1, d: 1, icon: "🌱" }]]);
    const ws = SCENES[WORKSPACE_ID];
    const out = withDecor(ws, [{ item: "plant", x: 2, y: 3 }, { item: "ghost", x: 0, y: 0 }], items);
    expect(out.objects).toHaveLength(1);
    expect(out.objects[0]).toMatchObject({ kind: "decor", x: 2 + WORKSPACE_OFFSET.x, y: 3 + WORKSPACE_OFFSET.y, solid: false, icon: "🌱" });
    // the largest decoration area still fits inside the room
    expect(10 + WORKSPACE_OFFSET.x).toBeLessThanOrEqual(ws.cols);
    expect(8 + WORKSPACE_OFFSET.y).toBeLessThanOrEqual(ws.rows);
    expect(withDecor(SCENES["ikoyi-floor"], [{ item: "plant", x: 0, y: 0 }], items)).toBe(SCENES["ikoyi-floor"]);
  });
});

describe("Workspace layouts by role and experience", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  const person = (o: Partial<typeof me>) => ({ ...me, ...o });

  it("ships layouts that validate and end with one for everyone", () => {
    const last = DEFAULT_DECOR.layouts[DEFAULT_DECOR.layouts.length - 1];
    expect(last.titles).toHaveLength(0);
    expect(last.minTenure).toBe(0);
    expect(DEFAULT_DECOR.layouts.some((l) => l.kind === "office")).toBe(true);
  });

  it("gives a bigger desk with experience and for line managers, and an office to chosen titles only", async () => {
    expect((await getDecor(person({}))).layout.id).toBe("desk-standard");
    expect((await getDecor(person({ tenureYears: 4 }))).layout.id).toBe("desk-senior");
    expect((await getDecor(person({ isLineManager: true }))).layout.id).toBe("desk-lead");
    const ceo = await getDecor(person({ title: "Chief Operating Officer (COO)" }));
    expect(ceo.layout).toMatchObject({ id: "office", kind: "office" });
    expect(ceo.grid).toEqual({ w: 10, d: 8 });
    expect((await getDecor(person({ title: "Head of Business Unit, Wealth" }))).layout.kind).toBe("office");
    expect((await getDecor(person({ title: "Head of Client Service" }))).layout.kind).toBe("desk"); // not every "Head of"
    const small = await getDecor(person({}));
    expect(small.grid.w * small.grid.d).toBeLessThan(ceo.grid.w * ceo.grid.d);
    expect(small.maxPlaced).toBeLessThan(ceo.maxPlaced);
  });

  it("lets the admin name staff ids for an office, and checks placing against the person's own area", async () => {
    const layouts = [{ ...DEFAULT_DECOR.layouts[0], titles: [] as string[], staffIds: ["MS1001"] }, ...DEFAULT_DECOR.layouts.slice(1)];
    const r = await setConfig("decor", JSON.stringify({ ...DEFAULT_DECOR, layouts }), "MS0001", NOW);
    expect(r.ok).toBe(true);
    expect((await getDecor(person({}))).layout.kind).toBe("office");
    expect((await getDecor(person({ staffId: "MS1002" }))).layout.kind).toBe("desk");
    // a standard desk is 5 wide: a 2-wide item at x=4 does not fit, but it does in the office
    await getOrCreatePlayer(person({}), NOW);
    await getStore().update<PlayerRecord>("players", "MS1002", (cur) => (cur ? { ...cur, points: 100 } : cur));
    const desk = person({ staffId: "MS1002" });
    expect((await buyAndPlace(desk, "plain-desk", 4, 0, 0, NOW)).ok).toBe(false);
    await withPoints(100);
    expect((await buyAndPlace(person({}), "plain-desk", 8, 0, 0, NOW)).ok).toBe(true);
  });

  it("refuses a layout list whose last entry is not for everyone, or that repeats an id", async () => {
    const bad = [...DEFAULT_DECOR.layouts.slice(0, -1), { ...DEFAULT_DECOR.layouts[3], minTenure: 2 }];
    expect((await setConfig("decor", JSON.stringify({ ...DEFAULT_DECOR, layouts: bad }), "MS0001", NOW)).ok).toBe(false);
    const dup = [DEFAULT_DECOR.layouts[3], DEFAULT_DECOR.layouts[3]];
    expect((await setConfig("decor", JSON.stringify({ ...DEFAULT_DECOR, layouts: dup }), "MS0001", NOW)).ok).toBe(false);
  });
});

describe("Workspace scene for a layout", () => {
  it("is a small desk for a standard layout and a bigger office for the office layout, with the same way out", async () => {
    const { SCENES, WORKSPACE_ID, WORKSPACE_OFFSET, workspaceLayoutScene } = await import("@/lib/world/scenes");
    const base = SCENES[WORKSPACE_ID];
    const desk = workspaceLayoutScene(base, "desk", 5, 4);
    const office = workspaceLayoutScene(base, "office", 10, 8);
    expect(desk.name).toBe("My Desk");
    expect(office.name).toBe("My Office");
    expect(desk.cols * desk.rows).toBeLessThan(office.cols * office.rows);
    for (const [s, w, d] of [[desk, 5, 4], [office, 10, 8]] as const) {
      // the decoration area, the door, the hotspot and the entry all lie inside the room
      expect(w + WORKSPACE_OFFSET.x).toBeLessThanOrEqual(s.cols);
      expect(d + WORKSPACE_OFFSET.y).toBeLessThanOrEqual(s.rows);
      expect(s.spawn.x).toBeLessThan(s.cols);
      expect(s.spawn.y).toBeLessThan(s.rows);
      for (const p of s.portals) expect(p.x).toBeLessThan(s.cols);
      expect(s.portals.map((p) => p.to)).toEqual(base.portals.map((p) => p.to));
      expect(s.hotspots.map((h) => h.id)).toEqual(base.hotspots.map((h) => h.id));
    }
    expect(workspaceLayoutScene(SCENES["ikoyi-floor"], "desk", 5, 4)).toBe(SCENES["ikoyi-floor"]);
  });
});
