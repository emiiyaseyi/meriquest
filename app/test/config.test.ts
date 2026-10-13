import { beforeEach, describe, expect, it } from "vitest";
import { CONFIG, CONFIG_KEYS, isConfigKey } from "@/lib/server/config/definitions";
import { getConfig, resetConfigToDefault, setConfig } from "@/lib/server/config/registry";
import { getStore } from "@/lib/server/store";
import { freshWorld } from "./helpers";

beforeEach(freshWorld);

describe("config definitions", () => {
  it.each(CONFIG_KEYS)("default for %s satisfies its own schema", (key) => {
    expect(CONFIG[key].schema.safeParse(CONFIG[key].default).success).toBe(true);
  });

  it("only accepts registry keys (no prototype keys)", () => {
    expect(isConfigKey("workFirst")).toBe(true);
    for (const bad of ["__proto__", "constructor", "toString", "hasOwnProperty", "", "nope"]) expect(isConfigKey(bad)).toBe(false);
  });

  it("regulator defaults contain no pension or insurance regulators (RULEBOOK §2.9)", () => {
    const ids = CONFIG.regulators.default.map((r) => r.id);
    expect(ids).not.toContain("pencom");
    expect(ids).not.toContain("naicom");
  });

  it("build 1 is Lagos only", () => {
    const enabled = CONFIG.offices.default.filter((o) => o.enabled).map((o) => o.id);
    expect(enabled).toEqual(["ikoyi-hq", "yaba"]);
  });

  it("work-first defaults match the approved policy", () => {
    const w = CONFIG.workFirst.default;
    expect(w.coreHours).toEqual({ days: [1, 2, 3, 4, 5], start: "08:00", end: "17:00" });
    expect(w.dailyCapWorkdayMinutes).toBe(45);
    expect(w.dailyCapWeekendMinutes).toBe(90);
    expect(w.weeklySoftCapMinutes).toBe(240);
    expect(w.assignedLearningMinutesPerWeek).toBe(120);
    expect(w.learningAllowedOutsideCoreHours).toBe(true);
  });
});

describe("getConfig", () => {
  it("returns the default when nothing is saved", async () => {
    expect((await getConfig("levels"))[0].name).toBe("Seed");
  });

  it("falls back to the default when the stored value is invalid", async () => {
    await getStore().put("config", "levels", { value: [{ name: "Bad" }], version: 1, updatedAt: 1, updatedBy: "x" });
    expect((await getConfig("levels"))[0].name).toBe("Seed");
  });
});

describe("setConfig validation", () => {
  const good = JSON.stringify([
    { name: "A", xp: 0 },
    { name: "B", xp: 10 },
  ]);

  it("saves a valid value, bumps the version and keeps history", async () => {
    expect(await setConfig("levels", good, "MS0001", 5)).toEqual({ ok: true, version: 1 });
    expect(await setConfig("levels", good, "MS0001", 6)).toEqual({ ok: true, version: 2 });
    expect((await getConfig("levels")).map((l) => l.name)).toEqual(["A", "B"]);
    expect(await getStore().get("config_history", "levels@1")).not.toBeNull();
  });

  it("rejects unknown keys, bad JSON and oversized input", async () => {
    expect(await setConfig("nope", good, "MS0001")).toMatchObject({ ok: false });
    expect(await setConfig("__proto__", good, "MS0001")).toMatchObject({ ok: false });
    expect(await setConfig("levels", "{not json", "MS0001")).toMatchObject({ ok: false });
    expect(await setConfig("levels", " ".repeat(100_001), "MS0001")).toMatchObject({ ok: false });
  });

  it("rejects schema violations and never stores them", async () => {
    const bad = JSON.stringify([{ name: "A", xp: 5 }, { name: "B", xp: 5 }]); // xp must increase
    expect(await setConfig("levels", bad, "MS0001")).toMatchObject({ ok: false });
    expect(await getStore().get("config", "levels")).toBeNull();
  });

  it("rejects extra properties (strict schemas)", async () => {
    const wf = JSON.parse(JSON.stringify(CONFIG.workFirst.default));
    wf.sneaky = true;
    expect(await setConfig("workFirst", JSON.stringify(wf), "MS0001")).toMatchObject({ ok: false });
  });

  it("rejects out-of-range and malformed work-first values", async () => {
    const wf = JSON.parse(JSON.stringify(CONFIG.workFirst.default));
    wf.coreHours.start = "25:99";
    expect(await setConfig("workFirst", JSON.stringify(wf), "MS0001")).toMatchObject({ ok: false });
    const wf2 = JSON.parse(JSON.stringify(CONFIG.workFirst.default));
    wf2.dailyCapWorkdayMinutes = 100000;
    expect(await setConfig("workFirst", JSON.stringify(wf2), "MS0001")).toMatchObject({ ok: false });
  });

  it("does not allow staff-ID patterns that could be a regex bomb (structured fields only)", async () => {
    const a = JSON.parse(JSON.stringify(CONFIG.auth.default));
    a.staffIdPrefix = "(a+)+$";
    expect(await setConfig("auth", JSON.stringify(a), "MS0001")).toMatchObject({ ok: false });
  });

  it("can restore the default as a new version", async () => {
    await setConfig("levels", good, "MS0001");
    const r = await resetConfigToDefault("levels", "MS0001");
    expect(r).toEqual({ ok: true, version: 2 });
    expect((await getConfig("levels"))[0].name).toBe("Seed");
  });
});
