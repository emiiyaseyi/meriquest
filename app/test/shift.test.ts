import { beforeEach, describe, expect, it } from "vitest";
import { answerShiftTask, finishShift, getShift, leaveShift, startShift } from "@/lib/server/shift/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { DEFAULT_SHIFTS } from "@/lib/server/config/shift-content";
import { shiftsSchema } from "@/lib/server/config/definitions";
import { choiceOrder, drawTasks, opensAt, type ShiftTaskDef } from "@/lib/shift";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const me = { staffId: "MS1001", unit: "cx" };
const MIN = 60_000;

describe("work shifts", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("ships valid situations, every one with a best choice", () => {
    expect(shiftsSchema.safeParse(DEFAULT_SHIFTS).success).toBe(true);
  });

  it("draws mostly the person's own unit's situations, without repeats", () => {
    const pool = DEFAULT_SHIFTS.tasks as ShiftTaskDef[];
    const ids = drawTasks(pool, "cx", 4, "seed");
    expect(new Set(ids).size).toBe(4);
    expect(ids.filter((id) => pool.find((t) => t.id === id)?.units.includes("cx")).length).toBeGreaterThanOrEqual(3);
    expect(drawTasks(pool, "cx", 4, "seed")).toEqual(ids);
  });

  it("spreads situations across the shift and hides ones that have not appeared", async () => {
    const r = await startShift(me, NOW);
    expect(r.ok).toBe(true);
    const v = await getShift(me, NOW);
    expect(v.active?.tasks[0].state).toBe("open");
    expect(v.active?.tasks[0].choices?.length).toBeGreaterThan(1);
    expect(v.active?.tasks[1].state).toBe("locked");
    expect(v.active?.tasks[1].story).toBeUndefined();
    const later = await getShift(me, NOW + 7 * MIN);
    expect(later.active?.tasks.every((t) => t.state !== "locked")).toBe(true);
    // no answers are ever sent to the browser before answering
    expect(JSON.stringify(v)).not.toContain("verdict");
  });

  it("will not start twice, or more than the daily limit", async () => {
    await startShift(me, NOW);
    expect((await startShift(me, NOW)).ok).toBe(false);
    await leaveShift(me, NOW);
    await startShift(me, NOW);
    await leaveShift(me, NOW);
    const third = await startShift(me, NOW);
    expect(third.ok).toBe(false);
    expect((await startShift(me, NOW + 24 * 60 * MIN)).ok).toBe(true);
  });

  it("scores answers on the server, once, and only for situations that have appeared", async () => {
    await startShift(me, NOW);
    const v = await getShift(me, NOW);
    const first = v.active!.tasks[0];
    expect((await answerShiftTask(me, v.active!.tasks[1].id, 0, NOW)).ok).toBe(false);
    expect((await answerShiftTask(me, first.id, 99, NOW)).ok).toBe(false);
    const a = await answerShiftTask(me, first.id, 0, NOW);
    expect(a.ok && a.verdict).toBeTruthy();
    expect((await answerShiftTask(me, first.id, 1, NOW)).ok).toBe(false);
  });

  it("pays only when the shift time is up, with points for good handling and a completion bonus", async () => {
    await startShift(me, NOW);
    const early = await finishShift(me, NOW + 2 * MIN);
    expect(early.ok).toBe(false);
    // answer every situation with its best choice
    const end = NOW + 9 * MIN;
    const v = await getShift(me, end);
    const cfgTasks = DEFAULT_SHIFTS.tasks as ShiftTaskDef[];
    for (const t of v.active!.tasks) {
      const def = cfgTasks.find((x) => x.id === t.id)!;
      const order = choiceOrder(me.staffId, t.id, def.choices.length);
      const shown = order.findIndex((k) => def.choices[k].verdict === "best");
      expect((await answerShiftTask(me, t.id, shown, end)).ok).toBe(true);
    }
    const before = (await getOrCreatePlayer(me, end)).points;
    const done = await finishShift(me, end);
    expect(done.ok).toBe(true);
    const after = await getOrCreatePlayer(me, end);
    expect(after.points - before).toBe(3 * 4 + 5);
    expect(after.shift).toBeUndefined();
    expect(after.stats).toMatchObject({ shifts: 1, shiftPoints: 17 });
    expect((await getShift(me, end)).active).toBeNull();
  });

  it("leaving early pays nothing", async () => {
    await startShift(me, NOW);
    const before = (await getOrCreatePlayer(me, NOW)).points;
    expect((await leaveShift(me, NOW + MIN)).ok).toBe(true);
    expect((await getOrCreatePlayer(me, NOW)).points).toBe(before);
  });

  it("opens the first situation at once and spaces the rest evenly", () => {
    const rec = { startedAt: 1000, minutes: 9, taskIds: ["a", "b", "c"] };
    expect([0, 1, 2].map((i) => opensAt(rec, i) - 1000)).toEqual([0, 3 * MIN, 6 * MIN]);
  });
});
