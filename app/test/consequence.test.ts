import { beforeEach, describe, expect, it } from "vitest";
import { answerShiftTask, getShift, startShift } from "@/lib/server/shift/service";
import { answerSim, startSim } from "@/lib/server/leadership/service";
import { listNotices, unreadCount } from "@/lib/server/notices/service";
import { setConfig } from "@/lib/server/config/registry";
import { shiftsSchema, leadershipSchema } from "@/lib/server/config/definitions";
import { DEFAULT_SHIFTS } from "@/lib/server/config/shift-content";
import { DEFAULT_LEADERSHIP } from "@/lib/server/config/leadership-content";
import { choiceOrder, drawTasks, type ShiftTaskDef } from "@/lib/shift";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-15T11:00:00+01:00");
const MIN = 60_000;
const me = { staffId: "MS1001", unit: "cx" };

const consequence = {
  headline: "The client leaves for a rival",
  timeline: [
    { when: "Today", text: "Nothing seems wrong." },
    { when: "This month", text: "The client moves their money elsewhere." },
  ],
  impact: [{ who: "Client" as const, tone: "bad" as const, text: "lost" }],
};

const choice = (text: string, verdict: "best" | "partly" | "wrong", extra: Record<string, unknown> = {}) => ({ text, verdict, feedback: `Feedback for ${text}`, ...extra });

/** A pool of one ordinary situation that can lead to a chained one, which can lead to another. */
const pool = (): Record<string, unknown> => ({
  ...DEFAULT_SHIFTS,
  settings: { ...DEFAULT_SHIFTS.settings, tasksPerShift: 1 },
  tasks: [
    { id: "a-start", units: ["*"], title: "Start", story: "The first situation.", chainOnly: false, reviewed: false, choices: [choice("Ignore it", "wrong", { consequence, next: "b-chained", followUp: { afterMinutes: 5, icon: "📞", text: "The client called to complain.", tone: "bad" } }), choice("Handle it", "best")] },
    { id: "b-chained", units: ["*"], title: "It comes back", story: "The follow-on situation.", chainOnly: true, reviewed: false, choices: [choice("Own it", "best", { next: "c-deeper" }), choice("Deny it", "wrong")] },
    { id: "c-deeper", units: ["*"], title: "Deeper", story: "And deeper still.", chainOnly: true, reviewed: false, choices: [choice("Escalate", "best", { next: "d-too-far" }), choice("Hide it", "wrong")] },
    { id: "d-too-far", units: ["*"], title: "Too far", story: "A fourth link.", chainOnly: true, reviewed: false, choices: [choice("Fix", "best"), choice("Leave", "wrong")] },
  ],
});

async function useShiftPool(raw: Record<string, unknown> = pool()) {
  const r = await setConfig("shifts", JSON.stringify(raw), "MS0001", NOW);
  if (!r.ok) throw new Error(r.errors.join("; "));
}

/** The position, in the order the person sees them, of the choice with this text. */
async function shownOf(taskId: string, text: string): Promise<number> {
  const defs = (pool().tasks as ShiftTaskDef[]).find((t) => t.id === taskId) as ShiftTaskDef;
  const order = choiceOrder(me.staffId, taskId, defs.choices.length);
  return order.findIndex((k) => defs.choices[k].text === text);
}

describe("consequence rules in the settings", () => {
  it("ships valid content with the new fields optional", () => {
    expect(shiftsSchema.safeParse(DEFAULT_SHIFTS).success).toBe(true);
    expect(leadershipSchema.safeParse(DEFAULT_LEADERSHIP).success).toBe(true);
  });

  it("accepts a chain and refuses one that leads nowhere, to itself, or leaves nothing to draw", () => {
    expect(shiftsSchema.safeParse(pool()).success).toBe(true);
    const tasks = pool().tasks as ShiftTaskDef[];
    const broken = { ...pool(), tasks: [{ ...tasks[0], choices: [choice("x", "best", { next: "missing" }), choice("y", "wrong")] }] };
    expect(shiftsSchema.safeParse(broken).success).toBe(false);
    const self = { ...pool(), tasks: [{ ...tasks[0], choices: [choice("x", "best", { next: "a-start" }), choice("y", "wrong")] }] };
    expect(shiftsSchema.safeParse(self).success).toBe(false);
    const nothing = { ...pool(), tasks: tasks.map((t) => ({ ...t, chainOnly: true })) };
    expect(shiftsSchema.safeParse(nothing).success).toBe(false);
  });

  it("never draws a chain-only situation at random", () => {
    const tasks = pool().tasks as ShiftTaskDef[];
    for (let i = 0; i < 20; i++) expect(drawTasks(tasks, "cx", 3, `seed${i}`)).toEqual(["a-start"]);
  });
});

describe("a shift with consequences", () => {
  beforeEach(async () => {
    await freshWorld();
    await useShiftPool();
  });

  it("returns what happens next for the choice, and leads to the next situation, which opens shortly after", async () => {
    await startShift(me, NOW);
    const r = await answerShiftTask(me, "a-start", await shownOf("a-start", "Ignore it"), NOW + 1000);
    expect(r.ok && r.consequence?.headline).toBe("The client leaves for a rival");
    expect(r.ok && r.nextTitle).toBe("It comes back");
    expect(r.ok && r.comesBack).toBe(true);
    const v = await getShift(me, NOW + 2000);
    expect(v.active?.tasks.map((t) => t.id)).toEqual(["a-start", "b-chained"]);
    expect(v.active?.tasks[1].state).toBe("locked"); // opens about 15 seconds later
    expect((await getShift(me, NOW + 20_000)).active?.tasks[1].state).toBe("open");
  });

  it("adds no chain after a choice that has none, and shows no consequence where none was written", async () => {
    await startShift(me, NOW);
    const r = await answerShiftTask(me, "a-start", await shownOf("a-start", "Handle it"), NOW + 1000);
    expect(r.ok && r.consequence).toBeUndefined();
    expect(r.ok && r.nextTitle).toBeUndefined();
    expect((await getShift(me, NOW + 2000)).active?.tasks).toHaveLength(1);
  });

  it("limits a chain to three extra situations, and never adds one too late to answer", async () => {
    await startShift(me, NOW);
    await answerShiftTask(me, "a-start", await shownOf("a-start", "Ignore it"), NOW + 1000);
    await answerShiftTask(me, "b-chained", await shownOf("b-chained", "Own it"), NOW + 30_000);
    const third = await answerShiftTask(me, "c-deeper", await shownOf("c-deeper", "Escalate"), NOW + 60_000);
    expect(third.ok && third.nextTitle).toBe("Too far");
    const v = await getShift(me, NOW + 70_000);
    expect(v.active?.tasks.map((t) => t.id)).toEqual(["a-start", "b-chained", "c-deeper", "d-too-far"]);
    // a shift in its last minute adds nothing
    await freshWorld();
    await useShiftPool();
    await startShift(me, NOW);
    const late = await answerShiftTask(me, "a-start", await shownOf("a-start", "Ignore it"), NOW + 7.5 * MIN);
    expect(late.ok && late.nextTitle).toBeUndefined();
  });

  it("delivers the follow-up to Updates later, not at once", async () => {
    await startShift(me, NOW);
    await answerShiftTask(me, "a-start", await shownOf("a-start", "Ignore it"), NOW + 1000);
    expect((await listNotices(me, NOW + 2 * MIN)).some((n) => n.text.includes("complain"))).toBe(false);
    expect(await unreadCount(me, NOW + 2 * MIN)).toBe(0);
    expect(await unreadCount(me, NOW + 7 * MIN)).toBe(1);
    const later = await listNotices(me, NOW + 7 * MIN);
    expect(later[0]).toMatchObject({ icon: "📞", tone: "bad", read: false });
    expect(later[0].text).toContain("complain");
    // it stays after it has arrived, and does not arrive twice
    expect((await listNotices(me, NOW + 60 * MIN)).filter((n) => n.text.includes("complain"))).toHaveLength(1);
  });
});

describe("a leadership run with consequences", () => {
  const lead = (raw: Record<string, unknown>) => setConfig("leadership", JSON.stringify(raw), "MS0001", NOW);
  const meters = DEFAULT_LEADERSHIP.meters;
  const eff = { morale: 5, delivery: 0, trust: 0, compliance: 0 };
  const sc = (id: string, chainOnly: boolean, choices: unknown[]) => ({ id, title: id, story: `Story of ${id}`, chainOnly, reviewed: false, choices });
  const ch = (text: string, extra: Record<string, unknown> = {}) => ({ text, effects: eff, feedback: `Fb ${text}`, ...extra });

  beforeEach(async () => {
    await freshWorld();
  });

  it("shows the consequence, leads to a chained scenario in place of the next one planned, and schedules the follow-up", async () => {
    const r = await lead({
      ...DEFAULT_LEADERSHIP,
      settings: { ...DEFAULT_LEADERSHIP.settings, rounds: 2 },
      meters,
      scenarios: [
        sc("s1", false, [ch("Dodge", { consequence, next: "s-chain", followUp: { afterMinutes: 3, icon: "👥", text: "A colleague handed in their notice.", tone: "bad" } }), ch("Face it")]),
        sc("s-chain", true, [ch("Own it"), ch("Blame them")]),
      ],
    });
    expect(r.ok).toBe(true);
    const started = await startSim(me, "leadership", NOW);
    expect(started.ok).toBe(true);
    const first = started.ok ? started.view.run?.scenario : undefined;
    expect(first?.id).toBe("s1"); // the only scenario that can be dealt at random
    expect(started.ok && started.view.run?.total).toBe(1);
    const shown = (first as { choices: string[] }).choices.indexOf("Dodge");
    const res = await answerSim(me, "leadership", shown, NOW + 1000);
    expect(res.ok && res.consequence?.headline).toBe("The client leaves for a rival");
    expect(res.ok && res.nextTitle).toBe("s-chain");
    expect(res.ok && res.view.run?.scenario.id).toBe("s-chain");
    expect(res.ok && res.view.run?.total).toBe(2); // the run grew by the chained scenario
    expect(await unreadCount(me, NOW + 5 * MIN)).toBe(1);
  });

  it("never deals a chain-only scenario at random", async () => {
    await lead({ ...DEFAULT_LEADERSHIP, settings: { ...DEFAULT_LEADERSHIP.settings, rounds: 1 }, meters, scenarios: [sc("only-chain", true, [ch("A"), ch("B")]), sc("normal", false, [ch("A"), ch("B")])] });
    for (let i = 0; i < 4; i++) {
      await freshWorld();
      await lead({ ...DEFAULT_LEADERSHIP, settings: { ...DEFAULT_LEADERSHIP.settings, rounds: 1 }, meters, scenarios: [sc("only-chain", true, [ch("A"), ch("B")]), sc("normal", false, [ch("A"), ch("B")])] });
      const s = await startSim({ staffId: `MS100${i + 1}` }, "leadership", NOW + i);
      expect(s.ok && s.view.run?.scenario.id).toBe("normal");
    }
  });
});
