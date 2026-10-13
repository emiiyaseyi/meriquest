import { beforeEach, describe, expect, it } from "vitest";
import { CONFIG, DEFAULT_PLACEMENT } from "@/lib/server/config/definitions";
import { retakeDecision, scoreAnswers, type PlacementConfig } from "@/lib/placement";
import { adminResetPlacement, adminSetPath, adminSetRetakeLock, getPlacement, retakeStatus, submitPlacement } from "@/lib/server/placement/service";
import { setConfig } from "@/lib/server/config/registry";
import { changePassword } from "@/lib/server/auth/service";
import { recentAudit } from "@/lib/server/audit";
import { DEFAULT_PW, dto, freshWorld, NEW_PW } from "./helpers";

const cfg: PlacementConfig = JSON.parse(JSON.stringify(DEFAULT_PLACEMENT));

const FRESH = { experience: "none", "meristem-time": "new", people: "no", regulated: "never", markets: "learning", mentoring: "no", "learn-first": "basics" };
const SEASONED = { experience: "y8-plus", "meristem-time": "y8-plus", people: "direct", regulated: "supervise", markets: "expert", mentoring: "regularly", "learn-first": "leading" };
const CHAPTER = { experience: "y3-8", "meristem-time": "new", people: "no", regulated: "regular", markets: "working", mentoring: "sometimes", "learn-first": "meristem" };

describe("scoreAnswers", () => {
  it("places the three typical profiles on the right paths", () => {
    expect(scoreAnswers(cfg, FRESH, 0)).toMatchObject({ ok: true, pathId: "fresh-start" });
    expect(scoreAnswers(cfg, CHAPTER, 0.2)).toMatchObject({ ok: true, pathId: "new-chapter" });
    expect(scoreAnswers(cfg, SEASONED, 10)).toMatchObject({ ok: true, pathId: "seasoned" });
  });

  it("is deterministic: same answers, same path", () => {
    const a = scoreAnswers(cfg, SEASONED, 10);
    for (let i = 0; i < 20; i++) expect(scoreAnswers(cfg, SEASONED, 10)).toEqual(a);
  });

  it("uses the staff directory as a cross-check (tenure hint)", () => {
    const without = scoreAnswers(cfg, SEASONED, 1);
    const withHint = scoreAnswers(cfg, SEASONED, 12);
    if (!without.ok || !withHint.ok) throw new Error("scoring failed");
    expect(withHint.scores.seasoned - without.scores.seasoned).toBe(2);
  });

  it("breaks ties in favour of the path listed first", () => {
    const tie: PlacementConfig = {
      ...cfg,
      hints: [],
      questions: [{ id: "q", text: "Pick one please", options: [{ id: "a", label: "A", scores: { "new-chapter": 2, seasoned: 2 } }, { id: "b", label: "B", scores: {} }] }],
    };
    expect(scoreAnswers(tie, { q: "a" }, 0)).toMatchObject({ ok: true, pathId: "new-chapter" });
  });

  it.each([
    ["missing answer", { ...FRESH, people: undefined }],
    ["unknown option", { ...FRESH, people: "all-of-them" }],
    ["unknown question", { ...FRESH, hacked: "yes" }],
    ["non-string answer", { ...FRESH, people: 5 }],
    ["array", []],
    ["null", null],
    ["string", "fresh-start"],
    ["empty", {}],
  ])("rejects %s", (_n, answers) => {
    expect(scoreAnswers(cfg, answers, 1)).toMatchObject({ ok: false });
  });

  it("ignores prototype tricks and inherited keys", () => {
    const evil = JSON.parse('{"__proto__": {"people":"leaders"}}');
    expect(scoreAnswers(cfg, evil, 1)).toMatchObject({ ok: false });
    expect(scoreAnswers(cfg, Object.create({ experience: "none" }), 1)).toMatchObject({ ok: false });
  });

  it("cannot be steered by a client-supplied path or score", () => {
    const r = scoreAnswers(cfg, { ...FRESH, pathId: "seasoned", scores: { seasoned: 99 } }, 1);
    expect(r).toMatchObject({ ok: false });
  });
});

describe("retakeDecision", () => {
  const ctx = { unit: "cx", attempts: 1, retakeLocked: false };
  it("allows within the limit and counts down", () => {
    expect(retakeDecision(cfg, ctx)).toEqual({ allowed: true, retakesLeft: 2 });
    expect(retakeDecision(cfg, { ...ctx, attempts: 3 })).toMatchObject({ allowed: false });
  });
  it("honours the global switch, unit lock and person lock", () => {
    expect(retakeDecision({ ...cfg, retakeEnabled: false }, ctx).allowed).toBe(false);
    expect(retakeDecision({ ...cfg, retakeDisabledUnits: ["cx"] }, ctx).allowed).toBe(false);
    expect(retakeDecision(cfg, { ...ctx, retakeLocked: true }).allowed).toBe(false);
    expect(retakeDecision({ ...cfg, retakeDisabledUnits: ["wealth"] }, ctx).allowed).toBe(true);
  });
});

describe("placement service", () => {
  beforeEach(freshWorld);

  it("places a user, saves the result and audits it", async () => {
    const u = await dto("MS2001"); // intern, 0 yrs
    expect(await submitPlacement(u, FRESH, "")).toEqual({ ok: true, pathId: "fresh-start" });
    const rec = await getPlacement("MS2001");
    expect(rec).toMatchObject({ pathId: "fresh-start", attempts: 1, source: "questionnaire", retakeLocked: false });
    expect((await recentAudit()).some((e) => e.action === "placement_created" && e.target === "MS2001")).toBe(true);
  });

  it("lets a user dispute and retake, keeping the history and the note", async () => {
    const u = await dto("MS2001");
    await submitPlacement(u, FRESH, "");
    const r = await submitPlacement(u, CHAPTER, "I worked at a bank for four years");
    expect(r).toMatchObject({ ok: true });
    const rec = await getPlacement("MS2001");
    expect(rec?.attempts).toBe(2);
    expect(rec?.history.map((h) => h.pathId)).toEqual(["fresh-start", "new-chapter"]);
    expect(rec?.history[1].note).toMatch(/bank/);
    expect((await recentAudit()).some((e) => e.action === "placement_retaken")).toBe(true);
  });

  it("truncates a very long dispute note", async () => {
    const u = await dto("MS2001");
    await submitPlacement(u, FRESH, "");
    await submitPlacement(u, CHAPTER, "x".repeat(5000));
    expect((await getPlacement("MS2001"))?.history[1].note?.length).toBe(300);
  });

  it("stops at the retake limit, even when many requests arrive at once", async () => {
    const u = await dto("MS2001");
    await submitPlacement(u, FRESH, "");
    const results = await Promise.all(Array.from({ length: 8 }, () => submitPlacement(u, CHAPTER, "")));
    expect(results.filter((r) => r.ok)).toHaveLength(2); // maxRetakes
    expect((await getPlacement("MS2001"))?.attempts).toBe(3);
    expect(await retakeStatus(u, await getPlacement("MS2001"))).toMatchObject({ allowed: false });
  });

  it("refuses retakes when the admin turns them off (globally, per unit)", async () => {
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
    const u = await dto("MS2001");
    await submitPlacement(u, FRESH, "");
    await setConfig("placement", JSON.stringify({ ...cfg, retakeEnabled: false }), "MS0001");
    expect(await submitPlacement(u, CHAPTER, "")).toMatchObject({ ok: false });
    await setConfig("placement", JSON.stringify({ ...cfg, retakeDisabledUnits: ["wealth"] }), "MS0001");
    expect(await submitPlacement(u, CHAPTER, "")).toMatchObject({ ok: false });
    expect((await getPlacement("MS2001"))?.pathId).toBe("fresh-start"); // unchanged
  });

  it("does nothing when placement is switched off", async () => {
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
    await setConfig("placement", JSON.stringify({ ...cfg, enabled: false }), "MS0001");
    expect(await submitPlacement(await dto("MS2001"), FRESH, "")).toMatchObject({ ok: false });
    expect(await getPlacement("MS2001")).toBeNull();
  });

  it("rejects bad answers without saving anything", async () => {
    expect(await submitPlacement(await dto("MS2001"), { ...FRESH, people: "x" }, "")).toMatchObject({ ok: false });
    expect(await getPlacement("MS2001")).toBeNull();
  });

  describe("admin controls", () => {
    let admin: Awaited<ReturnType<typeof dto>>;
    beforeEach(async () => {
      await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
      admin = await dto("MS0001");
    });

    it("overrides a path and locks retakes so the override sticks", async () => {
      const u = await dto("MS2001");
      await submitPlacement(u, FRESH, "");
      expect(await adminSetPath(admin, "MS2001", "seasoned")).toEqual({ ok: true });
      expect(await getPlacement("MS2001")).toMatchObject({ pathId: "seasoned", source: "admin", retakeLocked: true });
      expect(await submitPlacement(u, FRESH, "")).toMatchObject({ ok: false });
      expect((await getPlacement("MS2001"))?.pathId).toBe("seasoned");
    });

    it("can place someone who has not answered yet, and rejects unknown paths and people", async () => {
      expect(await adminSetPath(admin, "MS3001", "new-chapter")).toEqual({ ok: true });
      expect(await adminSetPath(admin, "MS3001", "not-a-path")).toMatchObject({ ok: false });
      expect(await adminSetPath(admin, "MS9999", "seasoned")).toMatchObject({ ok: false });
    });

    it("can unlock retaking again, and reset a placement", async () => {
      const u = await dto("MS2001");
      await submitPlacement(u, FRESH, "");
      await adminSetPath(admin, "MS2001", "seasoned");
      expect(await adminSetRetakeLock(admin, "MS2001", false)).toEqual({ ok: true });
      expect(await submitPlacement(u, CHAPTER, "")).toMatchObject({ ok: true });
      expect(await adminSetRetakeLock(admin, "MS3003", true)).toMatchObject({ ok: false }); // nothing to lock
      expect(await adminResetPlacement(admin, "MS2001")).toEqual({ ok: true });
      expect(await getPlacement("MS2001")).toBeNull();
    });

    it("every admin operation refuses non-admins and forged admins", async () => {
      const player = await dto("MS2001");
      const forged = { ...player, role: "admin" as const, mustChangePassword: false };
      for (const actor of [player, forged]) {
        await expect(adminSetPath(actor, "MS2001", "seasoned")).rejects.toThrow();
        await expect(adminSetRetakeLock(actor, "MS2001", true)).rejects.toThrow();
        await expect(adminResetPlacement(actor, "MS2001")).rejects.toThrow();
      }
      expect(await getPlacement("MS2001")).toBeNull();
    });

    it("audits overrides and resets with the acting admin", async () => {
      await adminSetPath(admin, "MS3001", "new-chapter");
      await adminResetPlacement(admin, "MS3001");
      const ev = await recentAudit();
      expect(ev.find((e) => e.action === "placement_overridden")).toMatchObject({ actor: "MS0001", target: "MS3001" });
      expect(ev.find((e) => e.action === "placement_reset")).toMatchObject({ actor: "MS0001", target: "MS3001" });
    });
  });
});

describe("placement settings validation", () => {
  beforeEach(async () => {
    await freshWorld();
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
  });
  const save = (c: unknown) => setConfig("placement", JSON.stringify(c), "MS0001");

  it("accepts the default and rejects broken edits", async () => {
    expect(await save(cfg)).toMatchObject({ ok: true });
    const badScore = JSON.parse(JSON.stringify(cfg));
    badScore.questions[0].options[0].scores = { "no-such-path": 3 };
    expect(await save(badScore)).toMatchObject({ ok: false });
    const dupQ = JSON.parse(JSON.stringify(cfg));
    dupQ.questions[1].id = dupQ.questions[0].id;
    expect(await save(dupQ)).toMatchObject({ ok: false });
    const dupO = JSON.parse(JSON.stringify(cfg));
    dupO.questions[0].options[1].id = dupO.questions[0].options[0].id;
    expect(await save(dupO)).toMatchObject({ ok: false });
    const badHint = JSON.parse(JSON.stringify(cfg));
    badHint.hints = [{ pathId: "seasoned", minYears: 5, maxYears: 1, bonus: 1 }];
    expect(await save(badHint)).toMatchObject({ ok: false });
    const onePath = JSON.parse(JSON.stringify(cfg));
    onePath.paths = onePath.paths.slice(0, 1);
    expect(await save(onePath)).toMatchObject({ ok: false });
    const outOfRange = JSON.parse(JSON.stringify(cfg));
    outOfRange.questions[0].options[0].scores = { "fresh-start": 9999 };
    expect(await save(outOfRange)).toMatchObject({ ok: false });
  });

  it("the registry default matches the exported default", () => {
    expect(CONFIG.placement.default).toBe(DEFAULT_PLACEMENT);
  });
});
