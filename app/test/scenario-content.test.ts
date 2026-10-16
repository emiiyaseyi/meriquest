import { describe, expect, it } from "vitest";
import { shiftsSchema } from "@/lib/server/config/definitions";
import { DEFAULT_SHIFTS } from "@/lib/server/config/shift-content";
import { RICH_SHIFT_TASKS } from "@/lib/server/config/scenarios";
import { drawTasks, type ShiftTaskDef } from "@/lib/shift";

/**
 * The scenarios written with consequences must all meet the same standard: a real-life story behind every choice, serious things coming back
 * later, chains that lead somewhere, and no claims about specific rules, fines or timeframes (those are for Compliance to add).
 */
const rich = RICH_SHIFT_TASKS as unknown as (ShiftTaskDef & { reviewed: boolean; internal: boolean })[];
const all = DEFAULT_SHIFTS.tasks as unknown as ShiftTaskDef[];
const ids = new Set(all.map((t) => t.id));

describe("scenarios with consequences", () => {
  it("are part of the starting situations, and the whole list is valid", () => {
    expect(rich.length).toBeGreaterThan(0);
    expect(rich.every((r) => ids.has(r.id))).toBe(true);
    expect(shiftsSchema.safeParse(DEFAULT_SHIFTS).success).toBe(true);
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
  });

  it("start as drafts for Compliance to review", () => {
    expect(rich.every((r) => r.reviewed === false)).toBe(true);
  });

  it("give every choice a consequence with a timeline and someone affected", () => {
    for (const t of rich) {
      for (const c of t.choices) {
        expect(c.consequence, `${t.id}: ${c.text}`).toBeDefined();
        expect(c.consequence!.timeline.length, `${t.id} timeline`).toBeGreaterThanOrEqual(2);
        expect(c.consequence!.impact.length, `${t.id} impact`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("have a best choice that hurts nobody, and a wrong choice that hurts someone", () => {
    for (const t of rich) {
      const best = t.choices.filter((c) => c.verdict === "best");
      const wrong = t.choices.filter((c) => c.verdict === "wrong");
      expect(best.length, t.id).toBeGreaterThanOrEqual(1);
      for (const b of best) expect(b.consequence!.impact.every((m) => m.tone !== "bad"), `${t.id} the best choice should not hurt anyone`).toBe(true);
      for (const b of best) expect(b.consequence!.impact.some((m) => m.tone === "good" || m.tone === "mixed"), `${t.id} best should help someone`).toBe(true);
      for (const w of wrong) expect(w.consequence!.impact.some((m) => m.tone === "bad"), `${t.id} wrong should hurt someone`).toBe(true);
    }
  });

  it("send most serious consequences back later, so people feel the delay", () => {
    const wrongs = rich.flatMap((t) => t.choices.filter((c) => c.verdict === "wrong"));
    const later = wrongs.filter((c) => c.followUp);
    expect(later.length / Math.max(1, wrongs.length)).toBeGreaterThanOrEqual(0.5);
    for (const c of rich.flatMap((t) => t.choices)) if (c.followUp) expect(c.followUp.text.length).toBeLessThanOrEqual(300);
  });

  it("only chain to situations that exist and are chain-only, and every chain-only situation can be reached", () => {
    const byId = new Map(all.map((t) => [t.id, t]));
    const reached = new Set<string>();
    for (const t of rich) {
      for (const c of t.choices) {
        if (!c.next) continue;
        const target = byId.get(c.next);
        expect(target, `${t.id} leads to ${c.next}`).toBeDefined();
        expect(target?.chainOnly, `${c.next} should be chain-only`).toBe(true);
        reached.add(c.next);
      }
    }
    for (const t of rich.filter((r) => r.chainOnly)) expect(reached.has(t.id), `${t.id} is never reached`).toBe(true);
  });

  it("make no claims about specific fines, penalties or legal deadlines in numbers of days or naira", () => {
    const text = rich.flatMap((t) => t.choices.flatMap((c) => [c.feedback, c.consequence!.headline, ...c.consequence!.timeline.map((x) => x.text), ...c.consequence!.impact.map((x) => x.text)])).join(" ");
    expect(text).not.toMatch(/fine of|fined|penalty of|₦\s?\d[\d,]*\s?(million|m)\s+fine|within \d+ (working )?days|within \d+ hours of/i);
  });

  it("never deal a chain-only situation at random", () => {
    const pool = all;
    for (let i = 0; i < 25; i++) {
      for (const id of drawTasks(pool, "cx", 4, `seed-${i}`)) expect(pool.find((t) => t.id === id)?.chainOnly, id).toBeFalsy();
    }
  });
});

describe("how much is written for each track", () => {
  const count = (unit: string) => rich.filter((t) => t.units.includes(unit)).length;
  it("has written at least 25 Wealth Advisory scenarios, with chains and colleague requests", () => {
    expect(count("wealth")).toBeGreaterThanOrEqual(25);
    expect(rich.filter((t) => t.units.includes("wealth") && t.internal).length).toBeGreaterThanOrEqual(5);
    expect(rich.filter((t) => t.units.includes("wealth") && t.chainOnly).length).toBeGreaterThanOrEqual(3);
  });

  it("has written at least 25 Investment Advisory scenarios, with chains and colleague requests", () => {
    expect(count("invest")).toBeGreaterThanOrEqual(25);
    expect(rich.filter((t) => t.units.includes("invest") && t.internal).length).toBeGreaterThanOrEqual(5);
    expect(rich.filter((t) => t.units.includes("invest") && t.chainOnly).length).toBeGreaterThanOrEqual(3);
  });

  it("has written at least 25 Customer Experience scenarios, with some that come to the person as visitors", () => {
    expect(count("cx")).toBeGreaterThanOrEqual(25);
    expect(rich.filter((t) => t.units.includes("cx") && t.internal).length).toBeGreaterThanOrEqual(5);
    expect(rich.filter((t) => t.units.includes("cx") && t.chainOnly).length).toBeGreaterThanOrEqual(4);
  });
});
