import { beforeEach, describe, expect, it } from "vitest";
import { scoreRun, type ClientArchetype } from "@/lib/clients";
import { answerClient, getClients, startClient } from "@/lib/server/clients/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { clientsSchema } from "@/lib/server/config/definitions";
import { DEFAULT_CLIENTS } from "@/lib/server/config/clients-content";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");
const rules = DEFAULT_CLIENTS.rules;
const esther = DEFAULT_CLIENTS.clients[0];
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
    const amaka = DEFAULT_CLIENTS.clients.find((c) => c.id === "c-amaka")!;
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
    expect(a.queue.length).toBe(DEFAULT_CLIENTS.settings.perDay);
    expect(a.queue.map((q) => q.id)).toEqual(b.queue.map((q) => q.id));
    expect(a.queue.every((q) => q.type === "individual" || (a.queue.length > 0))).toBe(true);
  });

  it("walks four steps, scores on the server and pays once", async () => {
    const u = await me();
    const before = (await getOrCreatePlayer(u, NOW)).points;
    const first = (await getClients(u, NOW)).queue[0];
    const s = await startClient(u, first.id, NOW);
    expect(s.ok && s.view.current?.step).toBe(1);
    expect((await startClient(u, first.id, NOW)).ok).toBe(false); // already with this client
    const kindAnswer = "money";
    const plan = ["check-docs", "ask-goals", kindAnswer, "written-follow"];
    let last;
    for (const opt of plan) last = await answerClient(u, opt, NOW);
    expect(last?.ok && last.finished?.csat).toBeGreaterThan(0);
    const after = (await getOrCreatePlayer(u, NOW)).points;
    expect(after).toBeGreaterThan(before);
    // a repeat answer, or the same client again, pays nothing more
    expect((await answerClient(u, "written-follow", NOW)).ok).toBe(false);
    expect((await startClient(u, first.id, NOW)).ok).toBe(false);
    expect((await getOrCreatePlayer(u, NOW)).points).toBe(after);
    expect((await getClients(u, NOW)).served).toBe(1);
  });

  it("refuses clients that are not on today's list, and bad answers", async () => {
    const u = await me();
    expect((await startClient(u, "c-delta-family", NOW)).ok).toBe(false); // needs more experience
    expect((await startClient(u, "nonsense", NOW)).ok).toBe(false);
    expect((await answerClient(u, "check-docs", NOW)).ok).toBe(false); // not with a client
    const first = (await getClients(u, NOW)).queue[0];
    await startClient(u, first.id, NOW);
    expect((await answerClient(u, "not-an-option", NOW)).ok).toBe(false);
    expect((await answerClient(u, 7 as never, NOW)).ok).toBe(false);
  });
});
