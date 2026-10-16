import { beforeEach, describe, expect, it } from "vitest";
import { advance, afterNoShow, afterVisit, bookFor, planDay, relationshipBonus, relationshipText, type ArrivalDoc, type ArrivalSettings } from "@/lib/arrivals";
import { getArrivals, serveInternal, syncArrivals } from "@/lib/server/arrivals/service";
import { getBook } from "@/lib/server/arrivals/book";
import { answerClient, getClients, startClient } from "@/lib/server/clients/service";
import { listNotices, unreadCount } from "@/lib/server/notices/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { setConfig } from "@/lib/server/config/registry";
import { arrivalsSchema } from "@/lib/server/config/definitions";
import { DEFAULT_ARRIVALS } from "@/lib/server/config/arrivals-content";
import { DEFAULT_CLIENTS } from "@/lib/server/config/clients-content";
import { DEFAULT_SHIFTS } from "@/lib/server/config/shift-content";
import { choiceOrder, type ShiftTaskDef } from "@/lib/shift";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-15T11:00:00+01:00");
const S: ArrivalSettings = { ...DEFAULT_ARRIVALS.settings };

/** The person plays for `seconds`, checking in every 30 seconds like the game does. Returns the time they reach. */
async function playFor(u: Awaited<ReturnType<typeof dto>>, from: number, seconds: number): Promise<number> {
  let t = from;
  for (let s = 0; s < seconds; s += 30) {
    t += 30_000;
    await syncArrivals(u, t);
  }
  return t;
}

describe("the pacing rules", () => {
  const clients = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, name: `Client ${i}` }));
  const plan = () => planDay({ staffId: "MS1001", day: "2026-10-15", clients, book: new Set(["c0", "c1", "c2", "c3", "c4", "c5"]), internal: [{ id: "t1", name: "Chidi from IT" }], settings: S });
  const doc = (items = plan()): ArrivalDoc => ({ staffId: "MS1001", day: "2026-10-15", clock: 0, lastAt: 0, items });

  it("ships valid settings", () => {
    expect(arrivalsSchema.safeParse(DEFAULT_ARRIVALS).success).toBe(true);
  });

  it("plans every client once, with a share of them as appointments from the person's book, spread through the day", () => {
    const p = plan();
    expect(p.filter((i) => i.kind !== "internal")).toHaveLength(10);
    expect(p.filter((i) => i.kind === "appointment")).toHaveLength(4); // 40% of 10
    expect(p.every((i) => i.kind !== "appointment" || ["c0", "c1", "c2", "c3", "c4", "c5"].includes(i.ref))).toBe(true);
    const times = p.map((i) => i.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[times.length - 1]).toBeGreaterThan(times[0] + 300);
  });

  it("brings visitors in only as time is spent in the game, and never more than the limit at once", () => {
    let d = advance(doc(), 1_000, S).doc; // the first check only starts the clock
    expect(d.clock).toBe(0);
    d = advance(d, 1_000 + 60_000, S).doc;
    expect(d.items.filter((i) => i.status === "waiting").length).toBeGreaterThanOrEqual(1);
    let t = 61_000;
    for (let i = 0; i < 6; i++) {
      t += 60_000;
      d = advance(d, t, { ...S, patienceSeconds: 100_000 }).doc;
    }
    expect(d.items.filter((i) => i.status === "waiting").length).toBeLessThanOrEqual(S.maxWaiting);
  });

  it("counts nothing while the person is away", () => {
    let d = advance(doc(), 1_000, S).doc;
    d = advance(d, 31_000, S).doc;
    const before = d.clock;
    const away = advance(d, 31_000 + 3 * 3_600_000, S).doc; // three hours later
    expect(away.clock).toBe(before);
    expect(away.items.filter((i) => i.status === "left")).toHaveLength(0);
  });

  it("lets a visitor who has waited too long leave, and only while the person is playing", () => {
    let d = advance(doc(), 0, S).doc;
    let t = 0;
    for (let i = 0; i < 12; i++) {
      t += 30_000;
      d = advance(d, t, S).doc;
    }
    expect(d.items.some((i) => i.status === "left")).toBe(true);
  });

  it("keeps a steady client book, the same every day, of the size asked for", () => {
    const eligible = Array.from({ length: 30 }, (_, i) => ({ id: `x${i}` }));
    const a = bookFor("MS1001", eligible, 8);
    expect(a).toHaveLength(8);
    expect(bookFor("MS1001", eligible, 8)).toEqual(a);
    expect(bookFor("MS1002", eligible, 8)).not.toEqual(a);
    expect(bookFor("MS1001", eligible, 0)).toEqual([]);
  });

  it("brings everyone at once when pacing is switched off", () => {
    const off = { ...S, enabled: false };
    const d = advance({ ...doc(planDay({ staffId: "MS1001", day: "2026-10-15", clients, book: new Set(), internal: [], settings: off })) }, 5_000, off).doc;
    expect(d.items.every((i) => i.status === "waiting")).toBe(true);
  });
});

describe("a person's day of visitors", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  const me = () => dto("MS1001");

  it("starts empty, then clients arrive while the person plays, with appointments among them", async () => {
    const u = await me();
    expect((await getArrivals(u, NOW)).waiting).toHaveLength(0);
    const t = await playFor(u, NOW, 8 * 60);
    const v = await getArrivals(u, t);
    const total = v.waiting.length + v.served + v.left + v.later;
    expect(total).toBe(v.total);
    expect(v.waiting.length).toBeGreaterThan(0);
    expect(v.waiting.length).toBeLessThanOrEqual(DEFAULT_ARRIVALS.settings.maxWaiting);
    expect(v.later).toBeGreaterThan(0); // the day is not over
    // the whole day: customer experience gets about 10 clients plus colleagues
    expect(v.total).toBeGreaterThanOrEqual(DEFAULT_CLIENTS.settings.perDayByUnit.cx);
  });

  it("only lets the person see a client who has arrived, and marks them as served afterwards", async () => {
    const u = await me();
    expect((await startClient(u, "c-saver-1", NOW)).ok).toBe(false);
    const t = await playFor(u, NOW, 3 * 60);
    const waiting = (await getClients(u, t)).queue.filter((q) => q.status === "waiting");
    expect(waiting.length).toBeGreaterThan(0);
    const first = waiting[0];
    expect(["appointment", "walkin"]).toContain(first.kind);
    const s = await startClient(u, first.id, t);
    expect(s.ok).toBe(true);
    const seen = (await getClients(u, t)).queue.find((q) => q.id === first.id);
    expect(seen?.status).toBe("serving");
    const steps = DEFAULT_CLIENTS.clients.find((c) => c.id === first.id)!.flow;
    let last;
    for (const stepId of steps) {
      const st = DEFAULT_CLIENTS.steps.find((x) => x.id === stepId)!;
      last = await answerClient(u, st.recommend ? "money" : st.options[0].id, t);
    }
    expect(last?.ok && last.finished).toBeTruthy();
    expect((await getClients(u, t)).queue.find((q) => q.id === first.id)?.status).toBe("served");
  });

  it("makes a visitor leave if nobody sees them, and sends a follow-up later", async () => {
    const u = await me();
    const t = await playFor(u, NOW, 20 * 60);
    const v = await getArrivals(u, t);
    expect(v.left).toBeGreaterThan(0);
    const later = await listNotices(u, t + 10 * 60_000);
    expect(later.some((n) => /left|without being seen|gave up/i.test(n.text))).toBe(true);
    expect(await unreadCount(u, t + 10 * 60_000)).toBeGreaterThan(0);
  });

  it("does nothing while the person is away", async () => {
    const u = await me();
    const t = await playFor(u, NOW, 90);
    const before = await getArrivals(u, t);
    const afterAway = await getArrivals(u, t + 6 * 3_600_000);
    expect(afterAway.waiting.map((w) => w.id)).toEqual(before.waiting.map((w) => w.id));
    expect(afterAway.left).toBe(before.left);
  });

  it("starts a fresh list each day", async () => {
    const u = await me();
    const t = await playFor(u, NOW, 120);
    const day1 = await getArrivals(u, t);
    const day2 = await getArrivals(u, NOW + 24 * 3_600_000);
    expect(day2.waiting).toHaveLength(0);
    expect(day2.total).toBeGreaterThan(0);
    expect(day1.total).toBeGreaterThan(0);
  });
});

describe("colleagues who come with a request", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  const me = () => dto("MS1001");

  async function waitForColleague(u: Awaited<ReturnType<typeof dto>>) {
    let t = NOW;
    for (let i = 0; i < 40; i++) {
      t = await playFor(u, t, 60);
      const v = await getArrivals(u, t);
      const c = v.waiting.find((w) => w.kind === "internal");
      if (c) return { t, c, v };
    }
    throw new Error("no colleague came");
  }

  it("shows the request without any answers, and pays for handling it well", async () => {
    const u = await me();
    const { t, c } = await waitForColleague(u);
    expect(c.situation?.choices.length).toBeGreaterThan(1);
    expect(JSON.stringify(c)).not.toContain("verdict");
    const defs = DEFAULT_SHIFTS.tasks as ShiftTaskDef[];
    const def = defs.find((d) => d.title === c.situation?.title) as ShiftTaskDef;
    const order = choiceOrder(u.staffId, def.id, def.choices.length);
    const shown = order.findIndex((k) => def.choices[k].verdict === "best");
    const before = (await getOrCreatePlayer(u, t)).points;
    const r = await serveInternal(u, c.id, shown, t);
    expect(r.ok && r.verdict).toBe("best");
    expect(r.ok && r.points).toBe(DEFAULT_ARRIVALS.settings.internalPointsBest);
    expect((await getOrCreatePlayer(u, t)).points).toBe(before + DEFAULT_ARRIVALS.settings.internalPointsBest);
    // the same visitor cannot be seen twice, and a made-up visitor is refused
    expect((await serveInternal(u, c.id, shown, t)).ok).toBe(false);
    expect((await serveInternal(u, "nonsense", 0, t)).ok).toBe(false);
  });

  it("refuses a choice that is not offered", async () => {
    const u = await me();
    const { t, c } = await waitForColleague(u);
    for (const bad of [-1, 99, 1.5, "0", null]) expect((await serveInternal(u, c.id, bad as never, t)).ok).toBe(false);
    expect((await getArrivals(u, t)).waiting.some((w) => w.id === c.id)).toBe(true);
  });
});

describe("settings can switch the pacing", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("lets an admin make visitors come faster", async () => {
    const r = await setConfig("arrivals", JSON.stringify({ ...DEFAULT_ARRIVALS, settings: { ...DEFAULT_ARRIVALS.settings, clientsEverySeconds: 5, internalPerDay: 0 } }), "MS0001", NOW);
    expect(r.ok).toBe(true);
    const u = await dto("MS1001");
    const t = await playFor(u, NOW, 60);
    const v = await getArrivals(u, t);
    expect(v.waiting.length).toBe(DEFAULT_ARRIVALS.settings.maxWaiting);
    expect(v.waiting.some((w) => w.kind === "internal")).toBe(false);
  });
});

describe("what a client remembers about the person", () => {
  it("warms after a good visit, cools after a poor one or a no-show, and never leaves 0 to 100", () => {
    const good = afterVisit(undefined, 5, "d1", false);
    expect(good.score).toBe(75);
    expect(good.met).toBe(1);
    expect(afterVisit(good, 5, "d2", false).score).toBe(88);
    const poor = afterVisit(undefined, 1, "d1", true); // a poor visit with a breach
    expect(poor.score).toBeLessThan(40);
    expect(afterNoShow(good, "d2").score).toBe(60);
    let r = afterVisit(undefined, 1, "d", true);
    for (let i = 0; i < 20; i++) r = afterVisit(r, 1, "d", true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    let h = afterVisit(undefined, 5, "d", false);
    for (let i = 0; i < 20; i++) h = afterVisit(h, 5, "d", false);
    expect(h.score).toBeLessThanOrEqual(100);
  });

  it("gives a head start to a client who trusts the person and a handicap to one who does not", () => {
    expect(relationshipBonus(undefined)).toBe(0);
    expect(relationshipBonus({ score: 100, met: 3, last: 5, lastDay: "d" })).toBe(10);
    expect(relationshipBonus({ score: 0, met: 3, last: 1, lastDay: "d" })).toBe(-10);
  });

  it("tells the person what the client remembers", () => {
    expect(relationshipText(undefined, "appointment")).toContain("Booked to see you");
    expect(relationshipText(undefined, "walkin")).toBe("A new face.");
    expect(relationshipText({ score: 90, met: 3, last: 5, lastDay: "d" }, "walkin")).toContain("trust you");
    expect(relationshipText({ score: 20, met: 2, last: 1, lastDay: "d" }, "walkin")).toContain("elsewhere");
    expect(relationshipText({ score: 35, met: 1, last: 0, lastDay: "d" }, "walkin")).toContain("gave up waiting");
  });
});

describe("the same client on a later day", () => {
  beforeEach(async () => {
    await freshWorld();
    const r = await setConfig("arrivals", JSON.stringify({ ...DEFAULT_ARRIVALS, settings: { ...DEFAULT_ARRIVALS.settings, enabled: false } }), "MS0001", NOW);
    if (!r.ok) throw new Error(r.errors.join(", "));
  });

  it("is remembered: a good visit warms them for next time, and the person is told", async () => {
    const u = await dto("MS1001");
    const first = (await getClients(u, NOW)).queue[0];
    const client = DEFAULT_CLIENTS.clients.find((c) => c.id === first.id)!;
    expect(first.history).toMatch(/new face|Booked/);
    await startClient(u, first.id, NOW);
    let last;
    for (const stepId of client.flow) {
      const st = DEFAULT_CLIENTS.steps.find((x) => x.id === stepId)!;
      const w = (tags: string[]) => tags.reduce((n, g) => n + ((DEFAULT_CLIENTS.rules.tagWeights as Record<string, number>)[g] ?? 0), 0);
      last = await answerClient(u, st.recommend ? client.suitable[0] : [...st.options].sort((a, b) => w(b.tags) - w(a.tags))[0].id, NOW);
    }
    expect(last?.ok && last.finished?.relationship).toContain("Seen 1 time");
    // the next day, the same client (if they come) is remembered
    const book = await getBook("MS1001");
    expect(book[first.id]).toMatchObject({ met: 1 });
    expect(book[first.id].score).toBeGreaterThan(50);
    expect(relationshipText(book[first.id], "walkin")).toContain("Seen 1 time");
  });
});

