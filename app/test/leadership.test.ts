import { beforeEach, describe, expect, it } from "vitest";
import { applyChoice, order, rate, startMeters } from "@/lib/leadership";
import { answerLead, getLead, startLead } from "@/lib/server/leadership/service";
import { DEFAULT_LEADERSHIP } from "@/lib/server/config/leadership-content";
import { leadershipSchema } from "@/lib/server/config/definitions";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const me = { staffId: "MS1001" };

describe("leadership simulator rules", () => {
  it("ships valid content", () => {
    expect(leadershipSchema.safeParse(DEFAULT_LEADERSHIP).success).toBe(true);
  });

  it("keeps meters between 0 and 100", () => {
    const m = startMeters(["a", "b"], 95);
    expect(applyChoice(m, { a: 20, b: -200 })).toEqual({ a: 100, b: 0 });
  });

  it("rates a run by the average and the weakest meter", () => {
    const t = { great: 70, good: 58, floor: 35 };
    expect(rate({ a: 80, b: 75 }, t)).toBe("great");
    expect(rate({ a: 95, b: 40 }, t)).toBe("good"); // a great average but one weak meter
    expect(rate({ a: 70, b: 50 }, t)).toBe("good");
    expect(rate({ a: 90, b: 20 }, t)).toBe("learning"); // a meter in the red
    expect(rate({}, t)).toBe("learning");
  });

  it("shuffles the same way for the same seed and always keeps every choice", () => {
    expect(order(5, 4)).toEqual(order(5, 4));
    expect([...order(9, 5)].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("leadership simulator run", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("walks through the decisions, scores on the server and pays once at the end", async () => {
    await getOrCreatePlayer(me, NOW);
    const s = await startLead(me, NOW);
    expect(s.ok).toBe(true);
    expect((await startLead(me, NOW)).ok).toBe(false); // already in a run
    const before = (await getOrCreatePlayer(me, NOW)).points;
    if (!s.ok) throw new Error(s.error);
    let view = s.view;
    let last = null as Awaited<ReturnType<typeof answerLead>> | null;
    expect(JSON.stringify(view)).not.toContain("effects");
    for (let i = 0; i < DEFAULT_LEADERSHIP.settings.rounds; i++) {
      expect(view.run?.round).toBe(i + 1);
      last = await answerLead(me, 0, NOW);
      expect(last.ok).toBe(true);
      if (last.ok) view = last.view;
    }
    expect(last?.ok && last.finished?.points).toBeGreaterThan(0);
    const after = (await getOrCreatePlayer(me, NOW)).points;
    expect(after - before).toBe(last?.ok && last.finished ? last.finished.points : -1);
    expect((await getLead(me, NOW)).run).toBeNull();
    expect((await answerLead(me, 0, NOW)).ok).toBe(false); // nothing left to answer
  });

  it("limits runs per day and refuses a choice that is not offered", async () => {
    await startLead(me, NOW);
    expect((await answerLead(me, 99, NOW)).ok).toBe(false);
    expect((await answerLead(me, "x", NOW)).ok).toBe(false);
    for (let r = 0; r < DEFAULT_LEADERSHIP.settings.rounds; r++) await answerLead(me, 0, NOW);
    await startLead(me, NOW + 1000);
    for (let r = 0; r < DEFAULT_LEADERSHIP.settings.rounds; r++) await answerLead(me, 0, NOW + 1000);
    expect((await startLead(me, NOW + 2000)).ok).toBe(false);
    expect((await startLead(me, NOW + 24 * 3_600_000)).ok).toBe(true);
  });
});
