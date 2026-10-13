import { beforeEach, describe, expect, it } from "vitest";
import { CONFIG } from "@/lib/server/config/definitions";
import { EMPTY_USAGE, evaluate, type Usage, type WorkFirstPolicy } from "@/lib/workfirst";
import { playBeat } from "@/lib/server/workfirst/service";
import { setConfig } from "@/lib/server/config/registry";
import { changePassword } from "@/lib/server/auth/service";
import { getStore } from "@/lib/server/store";
import { DEFAULT_PW, dto, freshWorld, NEW_PW } from "./helpers";

/** Lagos is UTC+1 all year. 2026-10-13 is a Tuesday; 2026-10-17 is a Saturday. */
const lagos = (date: string, hm: string) => Date.parse(`${date}T${hm}:00+01:00`);
const TUE = "2026-10-13";
const SAT = "2026-10-17";
const DEFAULTS: WorkFirstPolicy = JSON.parse(JSON.stringify(CONFIG.workFirst.default));
const session = (usedSeconds: number, lastPlayAt: number | null) => ({ usedSeconds, lastPlayAt });
const play = (p: WorkFirstPolicy, now: number, s = session(0, null), usage: Usage = EMPTY_USAGE) =>
  evaluate(p, { unit: "cx", now, usage, assignedLearningSeconds: 0, session: s }, "world");
const learn = (p: WorkFirstPolicy, now: number, s = session(0, null)) => evaluate(p, { unit: "cx", now, usage: EMPTY_USAGE, assignedLearningSeconds: 0, session: s }, "learning");

/* ======================= the current rule: play in working hours, in sessions ======================= */

describe("default rule: play during working hours with a session limit (owner, 13 Oct 2026)", () => {
  it("ships as: working hours not enforced, 30 minutes per session, 2 hour pause, no daily cap", () => {
    expect(DEFAULTS).toMatchObject({ restrictToWindows: false, dailyCapEnabled: false, sessionLimit: { enabled: true, maxMinutes: 30, pauseMinutes: 120 }, adminsExempt: true });
  });

  it("lets people play in working hours, at night and at weekends, up to the session length", () => {
    for (const when of [lagos(TUE, "10:00"), lagos(TUE, "13:45"), lagos(TUE, "22:30"), lagos(SAT, "11:00")]) {
      expect(play(DEFAULTS, when)).toMatchObject({ allowed: true, code: "ok", remainingSeconds: 1800 });
    }
  });

  it("counts down the session and then asks for a break until the pause is over", () => {
    const start = lagos(TUE, "10:00");
    expect(play(DEFAULTS, start, session(1700, start - 5000)).remainingSeconds).toBe(100);
    const lastPlay = lagos(TUE, "09:55"); // the session ended five minutes ago
    const done = play(DEFAULTS, start, session(1800, lastPlay));
    expect(done).toMatchObject({ allowed: false, code: "session_pause", remainingSeconds: 0 });
    expect(done.resumeAt).toBe(lastPlay + 120 * 60_000);
    expect(done.message).toMatch(/30 minutes/);
    expect(done.message).toMatch(/11:55/); // 09:55 + 2 hours, shown in Lagos time
  });

  it("reopens with a fresh allowance once the pause is over, and never before", () => {
    const end = lagos(TUE, "10:00");
    expect(play(DEFAULTS, end + 119 * 60_000, session(1800, end)).allowed).toBe(false);
    expect(play(DEFAULTS, end + 120 * 60_000, session(1800, end))).toMatchObject({ allowed: true, remainingSeconds: 1800 });
    expect(play(DEFAULTS, end + 9 * 3_600_000, session(1800, end)).remainingSeconds).toBe(1800);
  });

  it("keeps unused time when someone stops early and comes back within the pause length", () => {
    const t = lagos(TUE, "11:00");
    expect(play(DEFAULTS, t + 60 * 60_000, session(600, t)).remainingSeconds).toBe(1200); // 10 min used, back an hour later
    expect(play(DEFAULTS, t + 121 * 60_000, session(600, t)).remainingSeconds).toBe(1800); // away 2 h: starts fresh
  });

  it("uses whatever length and pause the admin sets", () => {
    const p = { ...DEFAULTS, sessionLimit: { enabled: true, maxMinutes: 10, pauseMinutes: 60 } };
    const t = lagos(TUE, "10:00");
    expect(play(p, t).remainingSeconds).toBe(600);
    expect(play(p, t + 59 * 60_000, session(600, t)).allowed).toBe(false);
    expect(play(p, t + 60 * 60_000, session(600, t))).toMatchObject({ allowed: true, remainingSeconds: 600 });
  });

  it("has no session limit at all when the admin turns it off", () => {
    const p = { ...DEFAULTS, sessionLimit: { enabled: false, maxMinutes: 30, pauseMinutes: 120 } };
    expect(play(p, lagos(TUE, "10:00"), session(99999, lagos(TUE, "09:59")))).toMatchObject({ allowed: true, remainingSeconds: null });
  });

  it("applies the daily cap only when the admin switches it on", () => {
    const used: Usage = { ...EMPTY_USAGE, todaySeconds: 2700 };
    expect(play(DEFAULTS, lagos(TUE, "18:00"), session(0, null), used).allowed).toBe(true);
    const capped = { ...DEFAULTS, dailyCapEnabled: true };
    expect(play(capped, lagos(TUE, "18:00"), session(0, null), used)).toMatchObject({ allowed: false, code: "daily_cap" });
    expect(play(capped, lagos(TUE, "18:00"), session(0, null), { ...EMPTY_USAGE, todaySeconds: 1800 }).remainingSeconds).toBe(900);
  });

  it("still honours blackout periods", () => {
    const p = { ...DEFAULTS, blackoutPeriods: [{ id: "b", label: "Audit", from: TUE, to: TUE }] };
    expect(play(p, lagos(TUE, "10:00"))).toMatchObject({ allowed: false, code: "blackout" });
  });

  it("opens learning at any time when working hours are not enforced, and the session limit does not apply to it", () => {
    expect(learn(DEFAULTS, lagos(TUE, "10:00"))).toMatchObject({ allowed: true, remainingSeconds: null });
    expect(learn(DEFAULTS, lagos(TUE, "10:00"), session(1800, lagos(TUE, "09:50"))).allowed).toBe(true);
  });

  it("brings the older rule back when restrictToWindows is switched on", () => {
    expect(play({ ...DEFAULTS, restrictToWindows: true }, lagos(TUE, "10:00"))).toMatchObject({ allowed: false, code: "core_hours" });
  });

  it("accepts older saved settings that do not have the new fields (they get the safe defaults)", () => {
    const old = JSON.parse(JSON.stringify(CONFIG.workFirst.default));
    delete old.restrictToWindows;
    delete old.sessionLimit;
    delete old.dailyCapEnabled;
    delete old.adminsExempt;
    delete old.publicHolidays;
    const parsed = CONFIG.workFirst.schema.safeParse(old);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toMatchObject({ restrictToWindows: false, sessionLimit: { enabled: true, maxMinutes: 30, pauseMinutes: 120 }, dailyCapEnabled: false });
  });
});

describe("default rule: the server counts and enforces sessions", () => {
  beforeEach(freshWorld);
  const staff = { staffId: "MS1001", unit: "cx" };
  const T0 = lagos(TUE, "10:00"); // working hours
  const used = async () => (await getStore().get<{ used: number }>("play_sessions", "MS1001"))?.used ?? 0;
  const dayTotal = async () => (await getStore().get<{ seconds: number }>("playtime", `MS1001:${TUE}`))?.seconds ?? 0;

  it("lets a player play in working hours and stops them at exactly 30 minutes", async () => {
    let last = await playBeat(staff, "world", T0);
    expect(last.allowed).toBe(true);
    for (let i = 1; i <= 80 && last.allowed; i++) last = await playBeat(staff, "world", T0 + i * 30_000);
    expect(last).toMatchObject({ allowed: false, code: "session_pause" });
    expect(await used()).toBe(1800);
    expect(last.resumeAt).toBe(T0 + 60 * 30_000 + 120 * 60_000);
    // Beats during the pause credit nothing and change nothing
    for (let i = 0; i < 10; i++) expect((await playBeat(staff, "world", T0 + 61 * 30_000 + i * 30_000)).allowed).toBe(false);
    expect(await used()).toBe(1800);
    expect(await dayTotal()).toBe(1800);
  });

  it("opens the next session two hours after the first one ended", async () => {
    let last = await playBeat(staff, "world", T0);
    for (let i = 1; i <= 80 && last.allowed; i++) last = await playBeat(staff, "world", T0 + i * 30_000);
    const resume = last.resumeAt as number;
    expect((await playBeat(staff, "world", resume - 1000)).allowed).toBe(false);
    const first = await playBeat(staff, "world", resume + 1000);
    expect(first).toMatchObject({ allowed: true, remainingSeconds: 1800 });
    expect(await used()).toBe(0); // a fresh allowance; the first beat after a long gap credits nothing
    await playBeat(staff, "world", resume + 31_000);
    expect(await used()).toBe(30);
  });

  it("two open tabs cannot double-count time or dodge the pause", async () => {
    // Two tabs each beat every 30 seconds, offset by 15 seconds: one beat every 15 seconds in total
    for (let i = 0; i < 60; i++) await Promise.all([playBeat(staff, "world", T0 + i * 30_000), playBeat(staff, "world", T0 + i * 30_000 + 15_000)]);
    const u = await used();
    expect(u).toBeLessThanOrEqual(1800);
    expect(u).toBeGreaterThan(1700); // about the real elapsed 30 minutes, not double
  });

  it("keeps unused time for someone who leaves early and returns within the pause length", async () => {
    await playBeat(staff, "world", T0);
    for (let i = 1; i <= 20; i++) await playBeat(staff, "world", T0 + i * 30_000); // 10 minutes
    expect(await used()).toBe(600);
    const back = await playBeat(staff, "world", T0 + 3_600_000); // an hour later
    expect(back).toMatchObject({ allowed: true, remainingSeconds: 1200 });
    const fresh = await playBeat(staff, "world", T0 + 3 * 3_600_000); // away more than 2 hours since the last play
    expect(fresh.remainingSeconds).toBe(1800);
  });

  it("does not use up the session with learning", async () => {
    await playBeat(staff, "learning", T0);
    for (let i = 1; i <= 40; i++) await playBeat(staff, "learning", T0 + i * 30_000);
    expect(await used()).toBe(0);
    expect((await playBeat(staff, "world", T0 + 41 * 30_000)).remainingSeconds).toBe(1800);
  });

  it("follows a changed setting straight away", async () => {
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
    await setConfig("workFirst", JSON.stringify({ ...DEFAULTS, sessionLimit: { enabled: true, maxMinutes: 5, pauseMinutes: 30 } }), "MS0001");
    let last = await playBeat(staff, "world", T0);
    for (let i = 1; i <= 20 && last.allowed; i++) last = await playBeat(staff, "world", T0 + i * 30_000);
    expect(await used()).toBe(300);
    expect(last).toMatchObject({ allowed: false, code: "session_pause" });
    expect(last.resumeAt).toBe(T0 + 10 * 30_000 + 30 * 60_000);
  });

  it("also records the day's play time for reports", async () => {
    await playBeat(staff, "world", T0);
    await playBeat(staff, "world", T0 + 30_000);
    await playBeat(staff, "world", T0 + 60_000);
    expect(await dayTotal()).toBe(60);
  });

  it("an admin preview neither uses up nor is stopped by the session", async () => {
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
    const admin = await dto("MS0001");
    for (let i = 0; i < 80; i++) await playBeat(admin, "world", T0 + i * 30_000);
    expect((await playBeat(admin, "world", T0 + 90 * 30_000)).code).toBe("admin_preview");
    expect(await getStore().list("play_sessions")).toHaveLength(0);
  });

  it("a refused beat leaves no record behind", async () => {
    await getStore().put("play_sessions", "MS1001", { staffId: "MS1001", used: 1800, lastPlayAt: T0 - 1000, lastBeat: T0 - 1000, lastActivity: "world" });
    const before = JSON.stringify(await getStore().get("play_sessions", "MS1001"));
    expect((await playBeat(staff, "world", T0)).code).toBe("session_pause");
    expect(JSON.stringify(await getStore().get("play_sessions", "MS1001"))).toBe(before);
    expect(await getStore().list("playtime")).toHaveLength(0);
  });
});
