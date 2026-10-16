import { beforeEach, describe, expect, it } from "vitest";
import { scoreRun, type ClientArchetype, type ClientCase } from "@/lib/clients";
import { answerClient, getClients, perDayFor, startClient } from "@/lib/server/clients/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { unreadCount } from "@/lib/server/notices/service";
import { clientsSchema } from "@/lib/server/config/definitions";
import { DEFAULT_CLIENTS } from "@/lib/server/config/clients-content";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");
const rules = DEFAULT_CLIENTS.rules;
const esther = DEFAULT_CLIENTS.clients[0] as ClientCase;
const find = (id: string) => DEFAULT_CLIENTS.clients.find((c) => c.id === id) as ClientCase;
const arche = (id: string) => DEFAULT_CLIENTS.archetypes.find((a) => a.id === id) as ClientArchetype | undefined;

describe("client desk scoring", () => {
  it("ships valid content", () => {
    expect(clientsSchema.safeParse(DEFAULT_CLIENTS).success).toBe(true);
  });

  it("rewards good listening, a suitable product and a written close", () => {
    const r = scoreRun(rules, esther, arche(esther.archetype), { tags: ["rapport", "discover", "discover", "suitability", "followup", "risk-disclosure"], kind: "money" }, 0);
    expect(r.csat).toBe(5);
    expect(r.breaches).toHaveLength(0);
    expect(r.rating).toBe("great");
  });

  it("records a breach for an unsuitable product, a promise, and skipped document checks, and caps the rating", () => {
    const amaka = find("c-newcomer-1");
    const r = scoreRun(rules, amaka, arche(amaka.archetype), { tags: ["rapport", "discover", "suitability", "promise", "followup"], kind: "equity" }, 0);
    expect(r.breaches.length).toBe(3);
    expect(r.csat).toBeLessThanOrEqual(2);
    expect(r.rating).toBe("learning");
  });

  it("lets chance colour the result only a little", () => {
    const picks = { tags: ["rapport", "discover", "suitability"], kind: "money" };
    const a = scoreRun(rules, esther, arche(esther.archetype), picks, -1).score;
    const b = scoreRun(rules, esther, arche(esther.archetype), picks, 1).score;
    expect(b - a).toBeLessThanOrEqual(rules.randomness * 2);
  });
});

describe("client desk day", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  const me = () => dto("MS1001");

  it("offers a few clients for the person's unit and experience, the same all day", async () => {
    const a = await getClients(await me(), NOW);
    const b = await getClients(await me(), NOW + 3_600_000);
    expect(a.queue.length).toBe(DEFAULT_CLIENTS.settings.perDayByUnit.cx);
    expect(a.queue.map((q) => q.id)).toEqual(b.queue.map((q) => q.id));
    expect(a.queue.length).toBeGreaterThanOrEqual(10);
  });

  /** The best answer to a step, worked out from the content so the test follows whatever flow the client has. */
  const best = (client: ClientCase, stepId: string): string => {
    const st = DEFAULT_CLIENTS.steps.find((s) => s.id === stepId)!;
    if (st.recommend) return client.suitable[0];
    const w = (tags: string[]) => tags.reduce((n, g) => n + (DEFAULT_CLIENTS.rules.tagWeights[g] ?? 0), 0);
    return [...st.options].sort((a, b) => w(b.tags) - w(a.tags))[0].id;
  };

  it("walks each client's own flow, scores on the server and pays once", async () => {
    const u = await me();
    const before = (await getOrCreatePlayer(u, NOW)).points;
    const first = (await getClients(u, NOW)).queue[0];
    const client = find(first.id);
    const s = await startClient(u, first.id, NOW);
    expect(s.ok && s.view.current?.step).toBe(1);
    expect(s.ok && s.view.current?.total).toBe(client.flow.length);
    expect((await startClient(u, first.id, NOW)).ok).toBe(false); // already with this client
    let last;
    for (const stepId of client.flow) last = await answerClient(u, best(client, stepId), NOW);
    expect(last?.ok && last.finished?.csat).toBeGreaterThan(0);
    expect(last?.ok && last.finished?.breaches).toHaveLength(0);
    const after = (await getOrCreatePlayer(u, NOW)).points;
    expect(after).toBeGreaterThanOrEqual(before);
    // a repeat answer, or the same client again, pays nothing more
    expect((await answerClient(u, "written-follow", NOW)).ok).toBe(false);
    expect((await startClient(u, first.id, NOW)).ok).toBe(false);
    expect((await getOrCreatePlayer(u, NOW)).points).toBe(after);
    expect((await getClients(u, NOW)).served).toBe(1);
  });

  it("gives clients different conversations: short, onboarding, presentation, improper, and long convincing", () => {
    const lengths = new Set(DEFAULT_CLIENTS.clients.map((c) => c.flow.length));
    expect(lengths.size).toBeGreaterThanOrEqual(5);
    expect(find("c-quick-1").flow).toEqual(["meet", "recommend", "close"]);
    expect(find("c-newcomer-1").flow).toContain("onboard-docs");
    expect(find("c-present-w-1").flow).toContain("present-prep");
    expect(find("c-split-1").flow).toContain("ask-improper");
    expect(find("c-long-haul-1").flow.filter((f) => f === "convince-again")).toHaveLength(2);
    expect(find("c-upset-1").flow).not.toContain("recommend");
  });

  it("offers 10 a day to customer experience and 15 to advisors, and the admin can change it", () => {
    const s = DEFAULT_CLIENTS.settings;
    expect(perDayFor(s, "cx")).toBe(10);
    expect(perDayFor(s, "wealth")).toBe(15);
    expect(perDayFor(s, "invest")).toBe(15);
    expect(perDayFor(s, "other")).toBe(s.perDay);
    expect(perDayFor({ ...s, perDayByUnit: { cx: 12 } }, "cx")).toBe(12);
  });

  it("has enough clients in the library to fill a day for each unit", () => {
    const s = DEFAULT_CLIENTS.settings;
    for (const unit of ["cx", "wealth", "invest"]) {
      const eligible = DEFAULT_CLIENTS.clients.filter((c) => (c.units.includes("*") || c.units.includes(unit)) && c.minTenure <= 5);
      expect(eligible.length).toBeGreaterThanOrEqual(perDayFor(s, unit));
    }
  });

  it("never lets a client who will not invest go ahead, even after a perfect conversation", () => {
    const browser = find("c-browser-1");
    const tags = ["rapport", "discover", "suitability", "fees", "clarity", "patience", "followup", "risk-disclosure"];
    const r = scoreRun(rules, browser, arche(browser.archetype), { tags, kind: "money" }, 0);
    expect(r.csat).toBe(5);
    expect(r.outcome).toBe("declines");
  });

  it("takes longer to convince some clients: the same conversation wins an easy client but not a hard one", () => {
    const easy = find("c-quick-1");
    const hard = find("c-long-haul-1");
    const picks = { tags: ["rapport", "discover"], kind: "fund" };
    const a = scoreRun(rules, { ...easy, suitable: ["fund"] }, undefined, picks, 0);
    const b = scoreRun(rules, { ...hard, suitable: ["fund"] }, undefined, picks, 0);
    expect(a.score).toBe(b.score);
    expect(a.outcome).toBe("invests");
    expect(b.outcome).not.toBe("invests");
  });

  it("records a breach when the person does what an improper client asks", () => {
    const c = find("c-split-1");
    const bad = scoreRun(rules, c, arche(c.archetype), { tags: ["rapport", "discover", "improper"], kind: "money" }, 0);
    expect(bad.breaches).toContain(rules.breachTags.improper);
    expect(bad.csat).toBeLessThanOrEqual(2);
    const good = scoreRun(rules, c, arche(c.archetype), { tags: ["rapport", "discover", "decline", "escalate", "honesty"], kind: "money" }, 0);
    expect(good.breaches).toHaveLength(0);
    expect(good.rating).not.toBe("learning");
  });

  it("refuses clients that are not on today's list, and bad answers", async () => {
    const u = await me();
    expect((await startClient(u, "c-present-i-1", NOW)).ok).toBe(false); // not for this unit or experience
    expect((await startClient(u, "nonsense", NOW)).ok).toBe(false);
    expect((await answerClient(u, "check-docs", NOW)).ok).toBe(false); // not with a client
    const first = (await getClients(u, NOW)).queue[0];
    await startClient(u, first.id, NOW);
    expect((await answerClient(u, "not-an-option", NOW)).ok).toBe(false);
    expect((await answerClient(u, 7 as never, NOW)).ok).toBe(false);
  });
});

describe("client desk aftermath", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("has a story for every outcome and every kind of breach, so no result is left without consequences", () => {
    const a = DEFAULT_CLIENTS.aftermath;
    for (const o of ["invests", "thinking", "declines", "stays", "leaves"]) expect(a.outcomes[o as keyof typeof a.outcomes]).toBeDefined();
    for (const k of [...Object.keys(DEFAULT_CLIENTS.rules.breachTags), "unsuitable", "kyc"]) expect(a.breaches[k as keyof typeof a.breaches], k).toBeDefined();
  });

  it("returns what happens next with the result, the decision first and then each breach, and brings a follow-up later", async () => {
    const u = await dto("MS1001");
    const first = (await getClients(u, NOW)).queue[0];
    const client = find(first.id);
    await startClient(u, first.id, NOW);
    // The worst answers: skip the checks, promise returns, do not suit the product
    const worst = (stepId: string) => {
      const st = DEFAULT_CLIENTS.steps.find((s) => s.id === stepId)!;
      if (st.recommend) return client.suitable.includes("equity") ? "bill" : "equity";
      const w = (tags: string[]) => tags.reduce((n, g) => n + (DEFAULT_CLIENTS.rules.tagWeights[g] ?? 0), 0);
      return [...st.options].sort((a, b) => w(a.tags) - w(b.tags))[0].id;
    };
    let last;
    for (const stepId of client.flow) last = await answerClient(u, worst(stepId), NOW);
    expect(last?.ok).toBe(true);
    const f = last?.ok ? last.finished : undefined;
    expect(f?.aftermath.length).toBeGreaterThanOrEqual(2);
    expect(f?.aftermath[0].headline).toBe(DEFAULT_CLIENTS.aftermath.outcomes[f!.outcome as keyof typeof DEFAULT_CLIENTS.aftermath.outcomes].consequence.headline);
    expect(f?.breaches.length).toBeGreaterThan(0);
    // a serious follow-up arrives in Updates later, not at once
    expect(await unreadCount(u, NOW + 1000)).toBe(1); // the result notice
    expect(await unreadCount(u, NOW + 12 * 60_000)).toBeGreaterThanOrEqual(2);
  });
});

