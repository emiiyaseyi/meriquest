import { beforeEach, describe, expect, it } from "vitest";
import { CONFIG, academySchema, courseSchema } from "@/lib/server/config/definitions";
import { BUILTIN_COURSES } from "@/lib/server/config/academy-content";
import { getConfig, setConfig } from "@/lib/server/config/registry";
import { answerScenario, attendLesson, getAcademy, getCase, getCourse, getQuiz, getScenario, readNotes, submitQuiz } from "@/lib/server/academy/service";
import { blankCourseJson, deleteCourse, getCourseDoc, getCourseJson, listCourseMeta, moveCourse, restoreBuiltIns, saveCourse } from "@/lib/server/academy/content";
import { getStore } from "@/lib/server/store";
import { listNotices } from "@/lib/server/notices/service";
import type { PlayerRecord } from "@/lib/server/world/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { freshWorld } from "./helpers";

const DAY = 24 * 3_600_000;
const T0 = Date.parse("2026-10-13T11:00:00+01:00");
const user = { staffId: "MS1001", unit: "cx" };
const admin = { staffId: "MS0001", role: "admin" as const };
const player = { staffId: "MS1001", role: "player" as const };

/* ------------------------------ the built-in content ------------------------------ */

describe("built-in Academy content", () => {
  it("settings and groups are valid under their schema", () => {
    const r = academySchema.safeParse(CONFIG.academy.default);
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues.slice(0, 6))).toBe(true);
  });
  it("every built-in course is valid under the course schema", () => {
    for (const c of BUILTIN_COURSES) {
      const r = courseSchema.safeParse(c);
      expect(r.success, `${c.id}: ${r.success ? "" : JSON.stringify(r.error.issues.slice(0, 4))}`).toBe(true);
    }
  });
  it("puts every course in a real group, with real units", () => {
    const groups = new Set(CONFIG.academy.default.groups.map((g) => g.id));
    for (const c of BUILTIN_COURSES) {
      expect(groups.has(c.group), `${c.id} group`).toBe(true);
      for (const u of c.units) expect(["*", "cx", "wealth", "invest"]).toContain(u);
    }
  });
  it("gives every lesson enough questions at each of the three levels, with sensible options", () => {
    for (const c of BUILTIN_COURSES) {
      expect(c.lessons.length, c.id).toBeGreaterThanOrEqual(3);
      for (const l of c.lessons) {
        for (const level of [1, 2, 3] as const) {
          const n = l.questions.filter((q) => q.level === level).length;
          expect(n, `${c.id}/${l.id} level ${level}`).toBeGreaterThanOrEqual(6);
        }
        const texts = new Set<string>();
        for (const q of l.questions) {
          expect(texts.has(q.question), `${c.id}/${l.id} repeats "${q.question}"`).toBe(false);
          texts.add(q.question);
          expect(new Set(q.options).size, `${l.id}/${q.id} has repeated options`).toBe(q.options.length);
          expect(q.answer).toBeLessThan(q.options.length);
        }
      }
    }
  });
  it("never repeats a course or lesson id", () => {
    expect(new Set(BUILTIN_COURSES.map((c) => c.id)).size).toBe(BUILTIN_COURSES.length);
  });
});

/* ------------------------------ the flow ------------------------------ */

const q = (id: string, level: 1 | 2 | 3, answer = 0) => ({ id, level, question: `Question ${id}: pick the right one`, options: ["Right", "Wrong A", "Wrong B", "Wrong C"], answer });
const pool = (prefix: string) => [1, 2, 3].flatMap((lv) => Array.from({ length: 8 }, (_, i) => q(`${prefix}-${lv}-${i}`, lv as 1 | 2 | 3)));

const SETTINGS = { classSeconds: 0, classMinutes: 45, quizSize: 7, passCorrect: 5, retryMinutes: 5, classesPerDay: 2, lessonPoints: [2, 4, 6], scenarioPoints: 3 };
const GROUPS = [{ id: "g1", label: "Group one", icon: "📚" }, { id: "g2", label: "Group two", icon: "📘" }];

function course(over: Record<string, unknown> = {}) {
  return {
    id: "c1",
    group: "g1",
    title: "Course one",
    kicker: "Test",
    icon: "🧪",
    intro: "A test course",
    units: ["cx"],
    rewardPoints: 20,
    certificate: "Test certificate",
    skill: { id: "compliance", xp: 3 },
    lessons: [
      { id: "l1", title: "Lesson 1", paragraphs: ["Notes for lesson one."], questions: pool("a") },
      { id: "l2", title: "Lesson 2", paragraphs: ["Notes for lesson two."], questions: pool("b") },
    ],
    scenarios: [{ id: "s1", title: "A scenario", story: "Something happens at work.", level: 1, choices: [{ text: "Do the right thing", verdict: "best", feedback: "Good." }, { text: "Half right", verdict: "partly", feedback: "Nearly." }, { text: "Do the wrong thing", verdict: "wrong", feedback: "No." }] }],
    cases: [{ id: "k1", title: "A case", story: "A client asks something hard to answer.", keyPoints: ["Check the facts", "Escalate"] }],
    ...over,
  };
}

async function setUp(settings: Record<string, unknown> = {}, courses: Record<string, unknown>[] = [course()]) {
  await freshWorld();
  expect((await setConfig("academy", JSON.stringify({ settings: { ...SETTINGS, ...settings }, groups: GROUPS }), "MS0001")).ok).toBe(true);
  // Replace the built-in courses with the fixture ones
  for (const m of await listCourseMeta()) await deleteCourse(admin, m.id);
  for (const c of courses) expect((await saveCourse(admin, JSON.stringify(c))).ok).toBe(true);
}

/** Answer a served quiz: the options are shuffled, so find the right option by its text. */
async function takeQuiz(u: typeof user, lessonId: string, t: number, right: boolean) {
  const served = await getQuiz(u, "c1", lessonId, t);
  if (!served.ok) throw new Error(served.error);
  const answers = served.value.questions.map((qn) => (right ? qn.options.indexOf("Right") : qn.options.indexOf("Wrong A")));
  return submitQuiz(u, "c1", lessonId, answers, t);
}

describe("the learning flow", () => {
  beforeEach(async () => {
    await setUp();
    await getOrCreatePlayer(user, T0);
  });

  it("shows courses in groups, with the person's own role first and everything open to everyone", async () => {
    for (const c of [course({ id: "c2", title: "For wealth", units: ["wealth"] }), course({ id: "c0", title: "For everyone", units: ["*"], group: "g2" })]) await saveCourse(admin, JSON.stringify(c));
    const home = await getAcademy(user, T0);
    expect(home.groups.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(home.courses.map((c) => c.id)).toEqual(["c1", "c2", "c0"]); // group one (cx course first), then group two
    expect(home.courses.find((c) => c.id === "c2")?.recommended).toBe(false);
    expect((await getAcademy({ staffId: "MS2001", unit: "wealth" }, T0)).courses[0].id).toBe("c2"); // wealth sees theirs first
  });

  it("does not open notes or the quiz before the class", async () => {
    expect((await readNotes(user, "c1", "l1", T0)).ok).toBe(false);
    expect((await getQuiz(user, "c1", "l1", T0)).ok).toBe(false);
  });

  it("a class takes time, then the notes open and an update arrives once", async () => {
    await setConfig("academy", JSON.stringify({ settings: { ...SETTINGS, classSeconds: 30 }, groups: GROUPS }), "MS0001");
    const started = await attendLesson(user, "c1", T0);
    expect(started.ok && started.value.lessons[0].status).toBe("attending");
    expect((await readNotes(user, "c1", "l1", T0 + 10_000)).ok).toBe(false); // still in class
    expect((await attendLesson(user, "c1", T0 + 10_000)).ok).toBe(false); // one class at a time
    const later = await readNotes(user, "c1", "l1", T0 + 31_000);
    expect(later.ok && later.value.quizDue).toBe(true);
    await readNotes(user, "c1", "l1", T0 + 40_000);
    expect((await listNotices(user)).filter((n) => n.text.startsWith("Class over")).length).toBe(1);
  });

  it("limits how many new classes a day, and only the first pass of a lesson needs a class", async () => {
    await setConfig("academy", JSON.stringify({ settings: { ...SETTINGS, classesPerDay: 1 }, groups: GROUPS }), "MS0001");
    expect((await attendLesson(user, "c1", T0)).ok).toBe(true);
    expect((await takeQuiz(user, "l1", T0, true)).ok).toBe(true);
    const second = await attendLesson(user, "c1", T0);
    expect(second.ok).toBe(false); // already one class today
    expect((await attendLesson(user, "c1", T0 + DAY)).ok).toBe(true); // tomorrow is fine
  });

  it("serves a quiz with no answers in it, drawn from the level's pool, with options shuffled", async () => {
    await attendLesson(user, "c1", T0);
    const quiz = await getQuiz(user, "c1", "l1", T0);
    expect(quiz.ok).toBe(true);
    if (!quiz.ok) return;
    expect(quiz.value.level).toBe(1);
    expect(quiz.value.questions).toHaveLength(7);
    expect(quiz.value.need).toBe(5);
    expect(JSON.stringify(quiz.value)).not.toMatch(/answer/);
    for (const qn of quiz.value.questions) expect([...qn.options].sort()).toEqual(["Right", "Wrong A", "Wrong B", "Wrong C"]);
    const firsts = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const again = await getQuiz(user, "c1", "l1", T0 + i);
      if (again.ok) firsts.add(again.value.questions[0].options[0]);
    }
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("marks a quiz on the server: a pass moves on, a fail waits to retry", async () => {
    await attendLesson(user, "c1", T0);
    const fail = await takeQuiz(user, "l1", T0, false);
    expect(fail.ok && fail.value).toMatchObject({ passed: false, correct: 0, total: 7, need: 5, level: 1, wrong: [0, 1, 2, 3, 4, 5, 6] });
    expect(fail.ok && fail.value.retryAt).toBe(T0 + 5 * 60_000);
    expect((await getQuiz(user, "c1", "l1", T0 + 60_000)).ok).toBe(false); // too soon
    const pass = await takeQuiz(user, "l1", T0 + 6 * 60_000, true);
    expect(pass.ok && pass.value).toMatchObject({ passed: true, correct: 7, points: 2 });
    const c = await getCourse(user, "c1", T0 + 7 * 60_000);
    expect(c.ok && c.value.lessons.map((l) => l.status)).toEqual(["passed", "next"]);
  });

  it("a wrong number of answers, odd values or a replay are refused", async () => {
    await attendLesson(user, "c1", T0);
    const served = await getQuiz(user, "c1", "l1", T0);
    expect(served.ok).toBe(true);
    for (const bad of [[], [0, 0, 0], Array(7).fill(9), Array(7).fill(-1), Array(7).fill("0"), Array(7).fill(1.5), null, "x"]) {
      expect(await submitQuiz(user, "c1", "l1", bad, T0)).toMatchObject({ ok: false });
    }
    expect(await submitQuiz(user, "c1", "l2", Array(7).fill(0), T0)).toMatchObject({ ok: false });
    expect(await submitQuiz(user, "nope", "l1", Array(7).fill(0), T0)).toMatchObject({ ok: false });
    const answers = served.ok ? served.value.questions.map((x) => x.options.indexOf("Right")) : [];
    expect((await submitQuiz(user, "c1", "l1", answers, T0)).ok).toBe(true);
    expect(await submitQuiz(user, "c1", "l1", answers, T0)).toMatchObject({ ok: false });
  });

  it("levels unlock as you pass, and the certificate comes with Hard", async () => {
    const t = T0;
    for (const lesson of ["l1", "l2"]) {
      expect((await attendLesson(user, "c1", t)).ok).toBe(true);
      expect((await takeQuiz(user, lesson, t, true)).ok).toBe(true);
    }
    let c = await getCourse(user, "c1", t);
    expect(c.ok && c.value.card).toMatchObject({ level: 2, passed: 0, certified: false });
    for (const lesson of ["l1", "l2"]) {
      const r = await takeQuiz(user, lesson, t, true);
      expect(r.ok && r.value.level).toBe(2);
    }
    c = await getCourse(user, "c1", t);
    expect(c.ok && c.value.card.level).toBe(3);
    const hard1 = await takeQuiz(user, "l1", t, true);
    expect(hard1.ok && hard1.value).toMatchObject({ level: 3, points: 6, finished: null });
    const hard2 = await takeQuiz(user, "l2", t, true);
    expect(hard2.ok && hard2.value.finished).toEqual({ points: 20, certificate: "Test certificate" });
    c = await getCourse(user, "c1", t);
    expect(c.ok && c.value.card).toMatchObject({ level: null, certified: true });
    const p = await getStore().get<PlayerRecord>("players", "MS1001");
    expect(p?.points).toBe(2 + 2 + 4 + 4 + 6 + 6 + 20);
    expect(p?.skillXp?.compliance).toBe(3 * 2 + 3 * 2 * 2 + 3 * 3 * 2);
    const texts = (await listNotices(user)).map((n) => n.text).join(" | ");
    expect(texts).toContain("Medium questions are now unlocked");
    expect(texts).toContain("Course complete");
  });

  it("scenarios: the best choice earns points once, and shuffled choices are stable per person", async () => {
    const play = await getScenario(user, "c1", "s1");
    expect(play.ok && play.value.choices).toHaveLength(3);
    expect(await getScenario(user, "c1", "s1")).toEqual(play);
    const best = play.ok ? play.value.choices.indexOf("Do the right thing") : -1;
    const wrong = play.ok ? play.value.choices.indexOf("Do the wrong thing") : -1;
    const w = await answerScenario(user, "c1", "s1", wrong);
    expect(w.ok && w.value).toMatchObject({ verdict: "wrong", points: 0, best: "Do the right thing" });
    const b = await answerScenario(user, "c1", "s1", best);
    expect(b.ok && b.value).toMatchObject({ verdict: "best", points: 3 });
    const again = await answerScenario(user, "c1", "s1", best);
    expect(again.ok && again.value.points).toBe(0);
    expect((await getStore().get<PlayerRecord>("players", "MS1001"))?.points).toBe(3);
    for (const bad of [-1, 3, 1.5, "0", null]) expect(await answerScenario(user, "c1", "s1", bad as number)).toMatchObject({ ok: false });
    expect(await getScenario(user, "c1", "nope")).toMatchObject({ ok: false });
    const c = await getCourse(user, "c1", T0);
    expect(c.ok && c.value.scenarios[0].done).toBe("best");
  });

  it("case studies return the story and key points; unknown ones are refused", async () => {
    const k = await getCase("c1", "k1");
    expect(k.ok && k.value.keyPoints).toEqual(["Check the facts", "Escalate"]);
    expect(await getCase("c1", "nope")).toMatchObject({ ok: false });
    expect(await getCase(5, "k1")).toMatchObject({ ok: false });
  });

  it("a thin level borrows questions rather than leaving someone stuck, and the pass mark scales", async () => {
    await saveCourse(admin, JSON.stringify(course({ lessons: [{ id: "l1", title: "Lesson 1", paragraphs: ["x"], questions: [q("t1", 1), q("t2", 1), q("t3", 1), q("t4", 1)] }] })));
    await attendLesson(user, "c1", T0);
    const quiz = await getQuiz(user, "c1", "l1", T0);
    expect(quiz.ok && quiz.value.questions).toHaveLength(4);
    expect(quiz.ok && quiz.value.need).toBe(3);
  });

  it("refuses ids that are not real", async () => {
    for (const bad of [5, null, "", "x".repeat(100), "__proto__"]) {
      expect(await getCourse(user, bad as string, T0)).toMatchObject({ ok: false });
      expect(await attendLesson(user, bad as string, T0)).toMatchObject({ ok: false });
    }
    expect(await readNotes(user, "c1", 7 as unknown as string, T0)).toMatchObject({ ok: false });
  });

  it("a new day starts with a fresh class allowance", async () => {
    await attendLesson(user, "c1", T0);
    await takeQuiz(user, "l1", T0, true);
    await attendLesson(user, "c1", T0);
    const today = await getCourse(user, "c1", T0);
    expect(today.ok && today.value.classesToday).toBe(2);
    const tomorrow = await getCourse(user, "c1", T0 + DAY);
    expect(tomorrow.ok && tomorrow.value.classesToday).toBe(0);
  });
});

/* ------------------------------ the admin side ------------------------------ */

describe("managing courses", () => {
  beforeEach(async () => {
    await setUp();
  });

  it("only an admin can save, move, delete or restore", async () => {
    await expect(saveCourse(player, JSON.stringify(course()))).rejects.toThrow("Forbidden");
    await expect(moveCourse(player, "c1", "g2")).rejects.toThrow("Forbidden");
    await expect(deleteCourse(player, "c1")).rejects.toThrow("Forbidden");
    await expect(restoreBuiltIns(player)).rejects.toThrow("Forbidden");
    await expect(getCourseJson(player, "c1")).rejects.toThrow("Forbidden");
  });

  it("moves a course to another group, or out of every group", async () => {
    expect((await moveCourse(admin, "c1", "g2")).ok).toBe(true);
    expect((await listCourseMeta())[0].group).toBe("g2");
    expect((await moveCourse(admin, "c1", "")).ok).toBe(true);
    expect((await getCourseDoc("c1"))?.group).toBe("");
    const home = await getAcademy(user, T0);
    expect(home.courses[0].group).toBe(""); // shown under "More courses"
    for (const bad of ["nope", 5, null, "x".repeat(60)]) expect((await moveCourse(admin, "c1", bad)).ok).toBe(false);
    expect((await moveCourse(admin, "nope", "g1")).ok).toBe(false);
  });

  it("saves edits, adds new courses, and rejects courses that are broken", async () => {
    const edited = course({ title: "Renamed course" });
    expect((await saveCourse(admin, JSON.stringify(edited))).ok).toBe(true);
    expect((await getCourseDoc("c1"))?.title).toBe("Renamed course");
    expect((await listCourseMeta()).find((m) => m.id === "c1")?.title).toBe("Renamed course");
    expect((await saveCourse(admin, blankCourseJson())).ok).toBe(true);
    expect((await listCourseMeta()).map((m) => m.id)).toEqual(["c1", "new-course"]);
    const bads = [
      "not json",
      JSON.stringify(course({ group: "unknown-group" })),
      JSON.stringify(course({ lessons: [] })),
      JSON.stringify(course({ lessons: [{ id: "l1", title: "x", paragraphs: ["y"], questions: [q("a", 1), q("a", 1), q("b", 1)] }] })),
      JSON.stringify(course({ lessons: [{ id: "l1", title: "x", paragraphs: ["y"], questions: [q("a", 1), q("b", 1), { ...q("c", 1), answer: 9 }] }] })),
      JSON.stringify(course({ scenarios: [{ id: "s", title: "t", story: "A story long enough", level: 1, choices: [{ text: "a", verdict: "wrong", feedback: "x" }, { text: "b", verdict: "wrong", feedback: "x" }] }] })),
      JSON.stringify({ ...course(), extra: true }),
      "x".repeat(700_000),
    ];
    for (const b of bads) expect((await saveCourse(admin, b)).ok).toBe(false);
    expect((await getCourseDoc("c1"))?.title).toBe("Renamed course"); // nothing broken was saved
  });

  it("deletes a course, and restoring built-ins brings missing ones back without touching edits", async () => {
    expect((await deleteCourse(admin, "c1")).ok).toBe(true);
    expect(await getCourseDoc("c1")).toBeNull();
    expect((await deleteCourse(admin, "c1")).ok).toBe(false);
    // edit one built-in-id course, then restore
    const first = BUILTIN_COURSES[0];
    await saveCourse(admin, JSON.stringify({ ...first, group: "g1", title: "My edited version" }));
    const { added } = await restoreBuiltIns(admin);
    expect(added).toHaveLength(BUILTIN_COURSES.length - 1);
    expect((await getCourseDoc(first.id))?.title).toBe("My edited version");
    expect((await restoreBuiltIns(admin)).added).toEqual([]);
  });

  it("seeds the built-in courses once for a fresh system, and an admin's deletions stay deleted", async () => {
    await freshWorld();
    const metas = await listCourseMeta();
    expect(metas.map((m) => m.id)).toEqual(BUILTIN_COURSES.map((c) => c.id));
    await deleteCourse(admin, metas[0].id);
    expect((await listCourseMeta()).map((m) => m.id)).not.toContain(metas[0].id);
  });

  it("the Academy setting no longer carries courses, and rejects any that are slipped in", async () => {
    const r = await setConfig("academy", JSON.stringify({ settings: SETTINGS, groups: GROUPS, courses: [] }), "MS0001");
    expect(r.ok).toBe(false);
    expect((await getConfig("academy")).groups.map((g) => g.id)).toEqual(["g1", "g2"]);
  });
});
