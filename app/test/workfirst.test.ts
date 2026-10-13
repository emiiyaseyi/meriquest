import { beforeEach, describe, expect, it } from "vitest";
import { CONFIG } from "@/lib/server/config/definitions";
import { EMPTY_USAGE, effectivePolicy, evaluate, localTime, type Usage, type WorkFirstPolicy } from "@/lib/workfirst";
import { assignLearning, MAX_BEAT_GAP_MS, playBeat, playStatus, weekStartOf } from "@/lib/server/workfirst/service";
import { setConfig } from "@/lib/server/config/registry";
import { changePassword } from "@/lib/server/auth/service";
import { getStore } from "@/lib/server/store";
import { recentAudit } from "@/lib/server/audit";
import { DEFAULT_PW, dto, freshWorld, NEW_PW } from "./helpers";

/** Lagos is UTC+1 all year (no daylight saving). 2026-10-13 is a Tuesday. */
const lagos = (date: string, hm: string) => Date.parse(`${date}T${hm}:00+01:00`);
const TUE = "2026-10-13";
const SAT = "2026-10-17";
const POLICY: WorkFirstPolicy = JSON.parse(JSON.stringify(CONFIG.workFirst.default));
const withPolicy = (patch: Partial<WorkFirstPolicy>): WorkFirstPolicy => ({ ...POLICY, ...patch });
const world = (p: WorkFirstPolicy, now: number, usage: Usage = EMPTY_USAGE, unit = "cx") => evaluate(p, { unit, now, usage, assignedLearningSeconds: 0 }, "world");
const learn = (p: WorkFirstPolicy, now: number, assigned = 0, usage: Usage = EMPTY_USAGE) => evaluate(p, { unit: "cx", now, usage, assignedLearningSeconds: assigned }, "learning");

describe("localTime", () => {
  it("converts to the policy time zone and rolls the date over", () => {
    expect(localTime(Date.parse("2026-10-13T23:30:00Z"), "Africa/Lagos")).toEqual({ date: "2026-10-14", dow: 3, minutes: 30 });
    expect(localTime(lagos(TUE, "07:05"), "Africa/Lagos")).toEqual({ date: TUE, dow: 2, minutes: 425 });
  });
  it("treats midnight as 00:00, not 24:00", () => {
    expect(localTime(lagos("2026-10-14", "00:00"), "Africa/Lagos").minutes).toBe(0);
  });
});

describe("world access", () => {
  it("is closed during core working hours", () => {
    const d = world(POLICY, lagos(TUE, "10:00"));
    expect(d).toMatchObject({ allowed: false, code: "core_hours", isWorkday: true });
    expect(world(POLICY, lagos(TUE, "08:00")).code).toBe("core_hours"); // boundary: core starts at 08:00
    expect(world(POLICY, lagos(TUE, "16:59")).code).toBe("core_hours");
  });

  it("opens before work, limited to the window end", () => {
    const d = world(POLICY, lagos(TUE, "07:30"));
    expect(d).toMatchObject({ allowed: true, code: "ok", windowId: "before-work", remainingSeconds: 30 * 60 });
  });

  it("is closed outside every window", () => {
    expect(world(POLICY, lagos(TUE, "06:00")).code).toBe("outside_window");
    expect(world(POLICY, lagos(TUE, "17:15")).code).toBe("outside_window");
    expect(world(POLICY, lagos(TUE, "22:00")).code).toBe("outside_window");
  });

  it("applies the lunch allowance (30 min max inside a 60 min window)", () => {
    expect(world(POLICY, lagos(TUE, "12:35"))).toMatchObject({ allowed: true, windowId: "lunch", remainingSeconds: 30 * 60 });
    const used: Usage = { ...EMPTY_USAGE, todaySeconds: 1800, windowSeconds: { lunch: 1800 } };
    expect(world(POLICY, lagos(TUE, "13:00"), used).code).toBe("window_cap");
  });

  it("enforces the 45 minute weekday cap and nudges at 30", () => {
    const at30: Usage = { ...EMPTY_USAGE, todaySeconds: 1800 };
    expect(world(POLICY, lagos(TUE, "18:00"), at30)).toMatchObject({ allowed: true, nudge: true, remainingSeconds: 900 });
    expect(world(POLICY, lagos(TUE, "18:00"), { ...EMPTY_USAGE, todaySeconds: 2700 }).code).toBe("daily_cap");
    expect(world(POLICY, lagos(TUE, "18:00"), { ...EMPTY_USAGE, todaySeconds: 99999 }).allowed).toBe(false);
  });

  it("uses the weekend window and the 90 minute weekend cap", () => {
    expect(world(POLICY, lagos(SAT, "10:00"))).toMatchObject({ allowed: true, windowId: "weekend", isWorkday: false, remainingSeconds: 90 * 60 });
    expect(world(POLICY, lagos(SAT, "10:00"), { ...EMPTY_USAGE, todaySeconds: 5400 }).code).toBe("daily_cap");
    expect(world(POLICY, lagos(SAT, "20:30")).code).toBe("outside_window");
  });

  it("treats a public holiday like a weekend", () => {
    const p = withPolicy({ publicHolidays: [TUE] });
    expect(world(p, lagos(TUE, "10:00"))).toMatchObject({ allowed: true, windowId: "weekend", isWorkday: false });
  });

  it("is closed for the whole of a blackout period, even inside a window", () => {
    const p = withPolicy({ blackoutPeriods: [{ id: "year-end", label: "Year-end close", from: "2026-10-12", to: "2026-10-14" }] });
    expect(world(p, lagos(TUE, "18:00"))).toMatchObject({ allowed: false, code: "blackout" });
    expect(world(p, lagos("2026-10-15", "18:00")).allowed).toBe(true); // day after
  });

  it("a weekly soft cap warns but never blocks", () => {
    const d = world(POLICY, lagos(TUE, "18:00"), { ...EMPTY_USAGE, weekSeconds: 999999 });
    expect(d).toMatchObject({ allowed: true, weeklySoftCapReached: true });
  });

  it("a cap of zero closes play; a disabled policy removes every restriction", () => {
    expect(world(withPolicy({ dailyCapWorkdayMinutes: 0 }), lagos(TUE, "18:00")).allowed).toBe(false);
    expect(world(withPolicy({ enabled: false }), lagos(TUE, "10:00"))).toMatchObject({ allowed: true, code: "disabled", remainingSeconds: null });
  });

  it("applies unit overrides (e.g. a trading floor starting at 06:00)", () => {
    const p = withPolicy({ unitOverrides: { trading: { coreHours: { days: [1, 2, 3, 4, 5], start: "06:00", end: "15:00" } } } });
    expect(world(p, lagos(TUE, "07:30"), EMPTY_USAGE, "trading").code).toBe("core_hours");
    expect(world(p, lagos(TUE, "07:30"), EMPTY_USAGE, "cx").allowed).toBe(true);
    expect(world(p, lagos(TUE, "16:00"), EMPTY_USAGE, "trading").code).toBe("outside_window");
  });

  it("a window opens inside core hours only when it is flagged duringCoreHours", () => {
    const noFlag = withPolicy({ windows: POLICY.windows.map((w) => ({ ...w, duringCoreHours: undefined })) });
    expect(world(noFlag, lagos(TUE, "12:35")).code).toBe("core_hours"); // lunch not flagged: closed
    const flagged = withPolicy({ windows: [{ id: "morning", label: "Morning", days: [1, 2, 3, 4, 5], start: "09:00", end: "09:30", duringCoreHours: true }] });
    expect(world(flagged, lagos(TUE, "09:10"))).toMatchObject({ allowed: true, windowId: "morning" });
  });

  it("learning at lunch is allowed without assigned time because the lunch window is open", () => {
    expect(learn(POLICY, lagos(TUE, "12:35"))).toMatchObject({ allowed: true, windowId: "lunch" });
    expect(learn(POLICY, lagos(TUE, "14:00")).code).toBe("learning_not_assigned");
  });

  it("ignores prototype-key unit names", () => {
    for (const unit of ["__proto__", "constructor", "toString"]) expect(effectivePolicy(POLICY, unit)).toBe(POLICY);
  });
});

describe("learning access (owner: learning is allowed outside work hours)", () => {
  it("is open outside core hours with no cap", () => {
    expect(learn(POLICY, lagos(TUE, "21:30"))).toMatchObject({ allowed: true, remainingSeconds: null });
    expect(learn(POLICY, lagos(SAT, "23:00")).allowed).toBe(true);
  });

  it("is open outside core hours even in a blackout, but not inside core hours", () => {
    const p = withPolicy({ blackoutPeriods: [{ id: "audit", label: "Audit", from: TUE, to: TUE }] });
    expect(learn(p, lagos(TUE, "21:30")).allowed).toBe(true);
    expect(learn(p, lagos(TUE, "10:00")).code).toBe("learning_not_assigned");
  });

  it("inside core hours needs assigned time, and it runs out", () => {
    expect(learn(POLICY, lagos(TUE, "10:00")).code).toBe("learning_not_assigned");
    expect(learn(POLICY, lagos(TUE, "10:00"), 3600)).toMatchObject({ allowed: true, remainingSeconds: 3600 });
    expect(learn(POLICY, lagos(TUE, "10:00"), 3600, { ...EMPTY_USAGE, learningCoreSecondsWeek: 3000 }).remainingSeconds).toBe(600);
    expect(learn(POLICY, lagos(TUE, "10:00"), 3600, { ...EMPTY_USAGE, learningCoreSecondsWeek: 3600 }).allowed).toBe(false);
  });

  it("follows the play windows when the admin turns outside-hours learning off", () => {
    const p = withPolicy({ learningAllowedOutsideCoreHours: false });
    expect(learn(p, lagos(TUE, "22:00")).code).toBe("outside_window");
    expect(learn(p, lagos(TUE, "18:00")).allowed).toBe(true);
  });
});

describe("weekStartOf", () => {
  it("returns the Monday of the week", () => {
    expect(weekStartOf("2026-10-13")).toBe("2026-10-12");
    expect(weekStartOf("2026-10-12")).toBe("2026-10-12");
    expect(weekStartOf("2026-10-18")).toBe("2026-10-12"); // Sunday belongs to the week that began Monday
    expect(weekStartOf("2026-10-19")).toBe("2026-10-19");
  });
});

/* ------------------------- server-authoritative accrual ------------------------- */

const staff = { staffId: "MS1001", unit: "cx" };
const secondsToday = async (date = TUE) => (await getStore().get<{ seconds: number }>("playtime", `MS1001:${date}`))?.seconds ?? 0;

describe("playBeat", () => {
  beforeEach(freshWorld);

  it("credits only real elapsed time, starting from the second beat", async () => {
    const t = lagos(TUE, "18:00");
    await playBeat(staff, "world", t);
    expect(await secondsToday()).toBe(0);
    await playBeat(staff, "world", t + 30_000);
    await playBeat(staff, "world", t + 60_000);
    expect(await secondsToday()).toBe(60);
  });

  it("does not credit a gap bigger than the maximum (tab closed or device asleep)", async () => {
    const t = lagos(TUE, "18:00");
    await playBeat(staff, "world", t);
    await playBeat(staff, "world", t + MAX_BEAT_GAP_MS + 1);
    expect(await secondsToday()).toBe(0);
  });

  it("does not let a flood of beats inflate time (credit follows the clock, not the request count)", async () => {
    const t = lagos(TUE, "18:00");
    for (let i = 0; i < 50; i++) await playBeat(staff, "world", t + i * 10); // 50 beats inside half a second
    expect(await secondsToday()).toBe(0);
  });

  it("credits nothing and creates no record for a refused beat", async () => {
    const d = await playBeat(staff, "world", lagos(TUE, "10:00"));
    expect(d).toMatchObject({ allowed: false, code: "core_hours" });
    expect(await getStore().list("playtime")).toHaveLength(0);
  });

  it("a clock that goes backwards credits nothing", async () => {
    const t = lagos(TUE, "18:00");
    await playBeat(staff, "world", t + 60_000);
    await playBeat(staff, "world", t);
    expect(await secondsToday()).toBe(0);
  });

  it("stops exactly at the daily cap and then refuses", async () => {
    const t = lagos(TUE, "18:00");
    let last = await playBeat(staff, "world", t);
    for (let i = 1; i <= 100 && last.allowed; i++) last = await playBeat(staff, "world", t + i * 30_000);
    expect(await secondsToday()).toBe(45 * 60);
    expect(last).toMatchObject({ allowed: false, code: "daily_cap" });
    expect((await playBeat(staff, "world", t + 200 * 30_000)).code).toBe("daily_cap");
    expect(await secondsToday()).toBe(45 * 60);
  });

  it("enforces the lunch allowance across beats", async () => {
    const t = lagos(TUE, "12:30");
    let last = await playBeat(staff, "world", t);
    for (let i = 1; i <= 80 && last.allowed; i++) last = await playBeat(staff, "world", t + i * 30_000);
    expect(last.code).toBe("window_cap");
    expect(await secondsToday()).toBe(30 * 60);
  });

  it("tracks each person separately and each day separately", async () => {
    const t = lagos(TUE, "18:00");
    await playBeat(staff, "world", t);
    await playBeat(staff, "world", t + 30_000);
    await playBeat({ staffId: "MS1002", unit: "cx" }, "world", t);
    expect(await secondsToday()).toBe(30);
    expect((await playStatus({ staffId: "MS1002", unit: "cx" }, "world", t + 1000)).remainingSeconds).toBeGreaterThan(2600);
    const next = lagos("2026-10-14", "18:00");
    expect((await playStatus(staff, "world", next)).remainingSeconds).toBe(2700); // a new day starts fresh
  });

  it("a Lagos evening and the UTC date change do not split a day", async () => {
    const t = lagos(TUE, "23:50"); // 22:50Z, still Tuesday in UTC; outside windows anyway
    expect((await playBeat(staff, "world", t)).code).toBe("outside_window");
  });

  it("picks up a policy change immediately", async () => {
    const t = lagos(TUE, "18:00");
    expect((await playStatus(staff, "world", t)).allowed).toBe(true);
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
    await setConfig("workFirst", JSON.stringify({ ...POLICY, blackoutPeriods: [{ id: "b", label: "Busy", from: TUE, to: TUE }] }), "MS0001");
    expect((await playStatus(staff, "world", t)).code).toBe("blackout");
  });
});

describe("assigned learning in core hours", () => {
  beforeEach(async () => {
    await freshWorld();
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
    await changePassword("MS1002", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 6);
  });
  const now = lagos(TUE, "10:00");

  it("is blocked until assigned, then limited to the assigned minutes", async () => {
    expect((await playBeat(staff, "learning", now)).code).toBe("learning_not_assigned");
    expect(await assignLearning(await dto("MS0001"), "MS1001", 30, now)).toMatchObject({ ok: true });
    let last = await playBeat(staff, "learning", now);
    expect(last.allowed).toBe(true);
    for (let i = 1; i <= 80 && last.allowed; i++) last = await playBeat(staff, "learning", now + i * 30_000);
    expect(last.code).toBe("learning_not_assigned");
    expect(await secondsToday()).toBe(0); // learning inside core hours never counts toward the play cap
    const doc = await getStore().get<{ learningCoreSeconds: number }>("playtime", "MS1001:2026-10-13");
    expect(doc?.learningCoreSeconds).toBe(30 * 60);
  });

  it("lets a line manager assign only within their own unit and never to themselves", async () => {
    const mgr = await dto("MS1002"); // cx team lead
    expect(await assignLearning(mgr, "MS1001", 30, now)).toMatchObject({ ok: true });
    expect(await assignLearning(mgr, "MS2001", 30, now)).toMatchObject({ ok: false }); // wealth unit
    expect(await assignLearning(mgr, "MS1002", 30, now)).toMatchObject({ ok: false }); // self
  });

  it("refuses players, forged actors, bad minutes and unknown or over-limit requests", async () => {
    const player = await dto("MS1003");
    expect(await assignLearning(player, "MS1001", 30, now)).toMatchObject({ ok: false });
    expect(await assignLearning({ ...player, role: "admin" }, "MS1001", 30, now)).toMatchObject({ ok: false });
    const admin = await dto("MS0001");
    for (const m of [0, 4, 601, 1.5, NaN, -30]) expect(await assignLearning(admin, "MS1001", m, now)).toMatchObject({ ok: false });
    expect(await assignLearning(admin, "MS9999", 30, now)).toMatchObject({ ok: false });
    expect(await assignLearning(admin, "MS1001", 100, now)).toMatchObject({ ok: true });
    const over = await assignLearning(admin, "MS1001", 30, now); // 100 + 30 > 120
    expect(over).toMatchObject({ ok: false });
    expect(await getStore().list("learning_assignments")).toHaveLength(1);
  });

  it("audits who assigned what to whom", async () => {
    await assignLearning(await dto("MS0001"), "MS1001", 30, now);
    expect((await recentAudit()).find((e) => e.action === "learning_assigned")).toMatchObject({ actor: "MS0001", target: "MS1001" });
  });
});
