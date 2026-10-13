import { describe, expect, it } from "vitest";
import { levelFor } from "@/lib/world/player";

const LEVELS = [
  { name: "Seed", xp: 0 },
  { name: "Sprout", xp: 80 },
  { name: "Stem", xp: 180 },
];

describe("growth level from points", () => {
  it("starts at the first level", () => {
    expect(levelFor(0, LEVELS)).toMatchObject({ index: 0, name: "Seed", next: { name: "Sprout", needed: 80 }, progress: 0 });
  });
  it("moves up exactly at a threshold", () => {
    expect(levelFor(80, LEVELS).name).toBe("Sprout");
    expect(levelFor(79, LEVELS).name).toBe("Seed");
  });
  it("reports progress through a level", () => {
    expect(levelFor(130, LEVELS).progress).toBeCloseTo(0.5, 5);
    expect(levelFor(130, LEVELS).next).toEqual({ name: "Stem", needed: 50 });
  });
  it("has no next level at the top, and ignores points beyond it", () => {
    expect(levelFor(99999, LEVELS)).toMatchObject({ index: 2, name: "Stem", next: null, progress: 1 });
  });
  it("copes with negative points", () => {
    expect(levelFor(-5, LEVELS).index).toBe(0);
  });
});
