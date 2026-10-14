import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { getStore } from "../store";
import { getConfig } from "../config/registry";
import type { UserDTO } from "../types";
import { notify } from "../notices/service";
import { recordEvent } from "../game/missions";
import type { PlayerRecord } from "../world/service";
import { applyEffects, dayKey } from "@/lib/game";
import { hashString, seeded } from "@/lib/iso/geometry";
import { parseVideo } from "@/lib/academy-video";
import { listMyAssignments } from "../manager/service";
import { requiredFor } from "../leadership/service";
import { getCourseDoc, listCourseMeta, type CourseDoc, type CourseMeta } from "./content";
import type { AcademyHome, AcademyResult, CaseView, CourseCard, CourseView, Level, LessonNotes, LessonRow, QuizResult, QuizSet, ScenarioOutcome, ScenarioPlay, ScenarioRow } from "@/lib/academy";

/**
 * Meristem Academy. The server runs the whole flow: a class takes real time before the notes open, the notes
 * are only sent once the class is over, the quiz questions are drawn and marked here, and the right answers
 * never leave the server. People work through each course three times, Easy then Medium then Hard: passing
 * every lesson at a level unlocks the next level, and the certificate comes with Hard.
 */
type Verdict = "best" | "partly" | "wrong";

interface Served {
  lessonId: string;
  level: Level;
  /** What was asked: the question id, and how its options were shuffled (shown position to real position). */
  items: { id: string; order: number[] }[];
  at: number;
}

interface CourseProgress {
  /** Highest level passed for each lesson (0 or missing means none). */
  best: Record<string, number>;
  /** Lessons whose class is over, so their notes and quizzes are open. */
  classed: string[];
  attending: { lessonId: string; startedAt: number; endsAt: number } | null;
  /** When a failed quiz can be tried again, by lesson and level ("lesson:2"). */
  retryAt: Record<string, number>;
  served: Served | null;
  scenarios: Record<string, Verdict>;
}

interface Certificate {
  courseId: string;
  title: string;
  icon: string;
  at: number;
}

interface LearningRecord {
  id: string; // staffId
  staffId: string;
  courses: Record<string, CourseProgress>;
  day: string;
  classesToday: number;
  certificates: Certificate[];
}

type Academy = Awaited<ReturnType<typeof getConfig<"academy">>>;
type CourseDef = CourseDoc;

/** What a course card needs: a full course, or just the index entry for the course list. */
interface CardSource {
  id: string;
  group: string;
  title: string;
  kicker: string;
  icon: string;
  intro: string;
  units: string[];
  rewardPoints: number;
  certificate: string;
  lessons: { id: string; title: string }[];
  scenarios: number;
  cases: number;
}

const fromMeta = (m: CourseMeta): CardSource => ({ ...m, lessons: m.lessonIds.map((id) => ({ id, title: "" })) });
const fromDoc = (c: CourseDef): CardSource => ({ ...c, lessons: c.lessons, scenarios: c.scenarios.length, cases: c.cases.length });

const blank = (staffId: string): LearningRecord => ({ id: staffId, staffId, courses: {}, day: "", classesToday: 0, certificates: [] });
const fresh = (): CourseProgress => ({ best: {}, classed: [], attending: null, retryAt: {}, served: null, scenarios: {} });
const asLevel = (n: number): Level => (n <= 1 ? 1 : n === 2 ? 2 : 3);

async function today(now: number): Promise<string> {
  return dayKey(now, (await getConfig("workFirst")).timezone);
}

/** Load someone's record; if a class has ended, open its notes and tell them once. */
async function load(user: Pick<UserDTO, "staffId">, now: number): Promise<{ rec: LearningRecord; academy: Academy }> {
  const academy = await getConfig("academy");
  const day = await today(now);
  const ended: { courseId: string; lessonId: string }[] = [];
  const saved = await getStore().update<LearningRecord>("learning", user.staffId, (cur) => {
    const rec: LearningRecord = cur ? { ...cur, courses: { ...cur.courses } } : blank(user.staffId);
    if (rec.day !== day) {
      rec.day = day;
      rec.classesToday = 0;
    }
    for (const [courseId, raw] of Object.entries(rec.courses)) {
      const p = { ...fresh(), ...raw };
      rec.courses[courseId] = p;
      if (p.attending && p.attending.endsAt <= now) {
        ended.push({ courseId, lessonId: p.attending.lessonId });
        rec.courses[courseId] = { ...p, attending: null, classed: [...new Set([...p.classed, p.attending.lessonId])] };
      }
    }
    return rec;
  });
  for (const e of ended) {
    const course = await getCourseDoc(e.courseId);
    const idx = course ? course.lessons.findIndex((l) => l.id === e.lessonId) : -1;
    if (course && idx >= 0) await notify(user.staffId, { icon: "📖", text: `Class over! ${course.icon} ${course.title}, lesson ${idx + 1}: "${course.lessons[idx].title}". Your notes are ready: read them and pass the quiz in Courses.`, tone: "good" }, now);
  }
  return { rec: saved as LearningRecord, academy };
}

/** Where someone is in a course: the level being worked on, and each lesson's state at that level. */
function standing(c: { lessons: { id: string; title: string }[] }, p: CourseProgress | undefined): { level: Level | null; rows: LessonRow[]; passedNow: number } {
  const best = p?.best ?? {};
  const floor = Math.min(...c.lessons.map((l) => best[l.id] ?? 0));
  if (floor >= 3) {
    return { level: null, rows: c.lessons.map((l, i) => ({ id: l.id, number: i + 1, title: l.title, status: "passed" as const, best: best[l.id] ?? 3 })), passedNow: c.lessons.length };
  }
  const level = asLevel(floor + 1);
  let nextFound = false;
  let passedNow = 0;
  const rows = c.lessons.map((l, i): LessonRow => {
    const b = best[l.id] ?? 0;
    let status: LessonRow["status"];
    if (b >= level) {
      status = "passed";
      passedNow++;
    } else if (!nextFound) {
      nextFound = true;
      if (p?.attending?.lessonId === l.id) status = "attending";
      else if ((p?.classed ?? []).includes(l.id)) status = "notes";
      else status = "next";
    } else status = "locked";
    return { id: l.id, number: i + 1, title: l.title, status, best: b };
  });
  return { level, rows, passedNow };
}

function audience(units: string[]): string {
  return units.includes("*") ? "For everyone" : `For ${units.join(", ")}`;
}

function card(c: CardSource, p: CourseProgress | undefined, rec: LearningRecord, unit: string): CourseCard {
  const st = standing(c, p);
  const next = st.rows.find((r) => r.status !== "passed");
  return {
    id: c.id,
    group: c.group,
    title: c.title,
    kicker: c.kicker,
    icon: c.icon,
    intro: c.intro,
    lessons: c.lessons.length,
    passed: st.passedNow,
    level: st.level,
    certified: st.level === null || rec.certificates.some((x) => x.courseId === c.id),
    recommended: c.units.includes("*") || c.units.includes(unit),
    audience: audience(c.units),
    rewardPoints: c.rewardPoints,
    certificate: c.certificate,
    next: next ? next.number : null,
    scenarios: c.scenarios,
    cases: c.cases,
  };
}

export async function getAcademy(user: Pick<UserDTO, "staffId" | "unit"> & Partial<Pick<UserDTO, "isLineManager">>, now: number = Date.now()): Promise<AcademyHome> {
  const { rec, academy } = await load(user, now);
  const metas = await listCourseMeta();
  let attending: AcademyHome["attending"] = null;
  for (const m of metas) {
    const a = rec.courses[m.id]?.attending;
    if (!a) continue;
    const doc = await getCourseDoc(m.id);
    const l = doc?.lessons.find((x) => x.id === a.lessonId);
    if (doc && l) attending = { courseId: m.id, courseTitle: doc.title, lessonTitle: l.title, endsAt: a.endsAt };
  }
  const groupOrder = new Map(academy.groups.map((g, i) => [g.id, i]));
  // Your own unit's courses first, then the ones for everyone, then the rest
  const rank = new Map(metas.map((c) => [c.id, c.units.includes(user.unit) ? 0 : c.units.includes("*") ? 1 : 2]));
  const cards = metas.map((m) => card(fromMeta(m), rec.courses[m.id], rec, user.unit));
  // Groups in the order set in settings, courses for your unit first, then the rest in the order set by the admin
  const order = new Map(metas.map((c, i) => [c.id, i]));
  cards.sort((x, y) => (groupOrder.get(x.group) ?? 999) - (groupOrder.get(y.group) ?? 999) || (rank.get(x.id) as number) - (rank.get(y.id) as number) || (order.get(x.id) as number) - (order.get(y.id) as number));
  return {
    groups: academy.groups,
    courses: cards,
    classesToday: rec.classesToday,
    classesPerDay: academy.settings.classesPerDay,
    classMinutes: academy.settings.classMinutes,
    classSeconds: academy.settings.classSeconds,
    quizSize: academy.settings.quizSize,
    passCorrect: academy.settings.passCorrect,
    retryMinutes: academy.settings.retryMinutes,
    attending,
    required: await requiredFor(user, now),
    assigned: (await listMyAssignments(user.staffId)).filter((a) => !(rec.certificates ?? []).some((c) => c.courseId === a.courseId)),
  };
}

export async function getCourse(user: Pick<UserDTO, "staffId" | "unit">, courseId: unknown, now: number = Date.now()): Promise<AcademyResult<CourseView>> {
  if (typeof courseId !== "string" || courseId.length > 41) return { ok: false, error: "That course does not exist." };
  const { rec, academy } = await load(user, now);
  const c = await getCourseDoc(courseId);
  if (!c) return { ok: false, error: "That course does not exist." };
  const p = rec.courses[c.id];
  const st = standing(c, p);
  const running = Object.values(rec.courses).some((x) => x.attending);
  const due = st.rows.find((r) => r.status === "next");
  let blocked: string | null = null;
  if (st.level === null) blocked = "You have finished this course at every level.";
  else if (!due) blocked = st.rows.some((r) => r.status === "notes") ? "Your notes are ready. Read them and take the quiz." : "A class is already running for this course.";
  else if (running) blocked = "A class is already running. Wait for it to finish.";
  else if (rec.classesToday >= academy.settings.classesPerDay) blocked = `You have taken ${academy.settings.classesPerDay} classes today. Come back tomorrow for more.`;
  const dueQuiz = st.rows.find((r) => r.status === "notes");
  const retry = dueQuiz && st.level ? p?.retryAt?.[`${dueQuiz.id}:${st.level}`] : undefined;
  const scenarios: ScenarioRow[] = c.scenarios.map((s) => ({ id: s.id, title: s.title, level: s.level, done: p?.scenarios?.[s.id] ?? null }));
  return {
    ok: true,
    value: {
      card: card(fromDoc(c), p, rec, user.unit),
      lessons: st.rows,
      scenarios,
      cases: c.cases.map((x) => ({ id: x.id, title: x.title })),
      canAttend: blocked === null,
      blocked,
      classMinutes: academy.settings.classMinutes,
      classSeconds: academy.settings.classSeconds,
      classesToday: rec.classesToday,
      classesPerDay: academy.settings.classesPerDay,
      retryAt: retry && retry > now ? retry : null,
    },
  };
}

/** Start the next class of a course (only the first time through a lesson needs a class). */
export async function attendLesson(user: Pick<UserDTO, "staffId" | "unit">, courseId: unknown, now: number = Date.now()): Promise<AcademyResult<CourseView>> {
  const first = await getCourse(user, courseId, now);
  if (!first.ok) return first;
  if (!first.value.canAttend) return { ok: false, error: first.value.blocked ?? "You cannot attend a class right now." };
  const academy = await getConfig("academy");
  const c = await getCourseDoc(courseId);
  const next = first.value.lessons.find((r) => r.status === "next");
  if (!c || !next) return { ok: false, error: "There is no lesson to attend." };
  let started = false;
  await getStore().update<LearningRecord>("learning", user.staffId, (cur) => {
    if (!cur) return cur;
    // Check again inside the update, so two quick clicks cannot start two classes
    const running = Object.values(cur.courses).some((x) => x.attending);
    if (running || cur.classesToday >= academy.settings.classesPerDay) return cur;
    started = true;
    const p = { ...fresh(), ...cur.courses[c.id] };
    return { ...cur, classesToday: cur.classesToday + 1, courses: { ...cur.courses, [c.id]: { ...p, attending: { lessonId: next.id, startedAt: now, endsAt: now + academy.settings.classSeconds * 1000 } } } };
  });
  if (!started) return { ok: false, error: "A class is already running, or you have reached today's limit." };
  return getCourse(user, courseId, now);
}

/** The notes of a lesson, once its class is over. Passed lessons can always be read again. */
export async function readNotes(user: Pick<UserDTO, "staffId" | "unit">, courseId: unknown, lessonId: unknown, now: number = Date.now()): Promise<AcademyResult<LessonNotes>> {
  if (typeof courseId !== "string" || typeof lessonId !== "string") return { ok: false, error: "That lesson does not exist." };
  const { rec, academy } = await load(user, now);
  const c = await getCourseDoc(courseId);
  const idx = c ? c.lessons.findIndex((l) => l.id === lessonId) : -1;
  if (!c || idx < 0) return { ok: false, error: "That lesson does not exist." };
  const p = rec.courses[c.id];
  const l = c.lessons[idx];
  const opened = (p?.classed ?? []).includes(lessonId) || (p?.best?.[lessonId] ?? 0) >= 1;
  if (!opened) return { ok: false, error: "Attend the class first. The notes open when it ends." };
  const st = standing(c, p);
  const level = st.level ?? 3;
  const row = st.rows[idx];
  const quizDue = st.level !== null && row.status === "notes";
  const draw = quizSizeFor(l.questions.length, academy, level, l);
  const retry = p?.retryAt?.[`${lessonId}:${level}`];
  return {
    ok: true,
    value: { courseTitle: c.title, number: idx + 1, total: c.lessons.length, title: l.title, paragraphs: l.paragraphs, video: parseVideo(l.video), level, quizDue, quizCount: draw.n, passCorrect: draw.need, retryMinutes: academy.settings.retryMinutes, retryAt: retry && retry > now ? retry : null },
  };
}

type LessonDef = CourseDef["lessons"][number];

/** How many questions a quiz at this level has, and how many must be right. */
function quizSizeFor(_total: number, academy: Academy, level: Level, lesson: LessonDef): { n: number; need: number; pool: LessonDef["questions"] } {
  let pool = lesson.questions.filter((q) => q.level === level);
  if (pool.length < 3) pool = lesson.questions; // a thin level borrows from the others rather than leaving a person stuck
  const n = Math.min(academy.settings.quizSize, pool.length);
  const need = Math.max(1, n === academy.settings.quizSize ? academy.settings.passCorrect : Math.ceil((academy.settings.passCorrect / academy.settings.quizSize) * n));
  return { n, need: Math.min(need, n), pool };
}

function shuffleOrder(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The quiz for a lesson at the person's level: a fresh draw from the pool, options shuffled, answers withheld. */
export async function getQuiz(user: Pick<UserDTO, "staffId" | "unit">, courseId: unknown, lessonId: unknown, now: number = Date.now()): Promise<AcademyResult<QuizSet>> {
  if (typeof courseId !== "string" || typeof lessonId !== "string") return { ok: false, error: "That lesson does not exist." };
  const { rec, academy } = await load(user, now);
  const c = await getCourseDoc(courseId);
  const l = c?.lessons.find((x) => x.id === lessonId);
  if (!c || !l) return { ok: false, error: "That lesson does not exist." };
  const p = rec.courses[c.id];
  const st = standing(c, p);
  const row = st.rows.find((r) => r.id === lessonId);
  if (st.level === null || !row || row.status !== "notes") return { ok: false, error: "The quiz opens after the class, one lesson at a time." };
  const level = st.level;
  const wait = p?.retryAt?.[`${lessonId}:${level}`] ?? 0;
  if (wait > now) return { ok: false, error: `Read the notes again. You can retry in ${Math.max(1, Math.ceil((wait - now) / 60_000))} minute(s).` };
  const { n, need, pool } = quizSizeFor(l.questions.length, academy, level, l);
  // Draw n questions from the pool at random
  const ids = shuffleOrder(pool.length).slice(0, n).map((i) => pool[i]);
  const served: Served = { lessonId, level, items: ids.map((q) => ({ id: q.id, order: shuffleOrder(q.options.length) })), at: now };
  await getStore().update<LearningRecord>("learning", user.staffId, (cur) => {
    if (!cur) return cur;
    const prog = { ...fresh(), ...cur.courses[c.id] };
    return { ...cur, courses: { ...cur.courses, [c.id]: { ...prog, served } } };
  });
  const questions = served.items.map((it) => {
    const q = l.questions.find((x) => x.id === it.id) as LessonDef["questions"][number];
    return { question: q.question, options: it.order.map((o) => q.options[o]) };
  });
  return { ok: true, value: { level, questions, need } };
}

/** Mark the quiz that was served. Passing moves the person on; failing starts the retry wait. */
export async function submitQuiz(user: Pick<UserDTO, "staffId" | "unit">, courseId: unknown, lessonId: unknown, answers: unknown, now: number = Date.now()): Promise<AcademyResult<QuizResult>> {
  if (typeof courseId !== "string" || typeof lessonId !== "string") return { ok: false, error: "That lesson does not exist." };
  const { rec, academy } = await load(user, now);
  const c = await getCourseDoc(courseId);
  const l = c?.lessons.find((x) => x.id === lessonId);
  const p = rec.courses[courseId];
  if (!c || !l) return { ok: false, error: "That lesson does not exist." };
  const served = p?.served;
  if (!served || served.lessonId !== lessonId) return { ok: false, error: "Open the quiz first." };
  const st = standing(c, p);
  if (st.level === null || st.level !== served.level || st.rows.find((r) => r.id === lessonId)?.status !== "notes") return { ok: false, error: "That quiz is not open." };
  if (!Array.isArray(answers) || answers.length !== served.items.length || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 5)) return { ok: false, error: "Please answer every question." };
  const level = served.level;
  const wrong: number[] = [];
  served.items.forEach((it, i) => {
    const q = l.questions.find((x) => x.id === it.id);
    // The person picked a shown position; map it back to the real option
    const real = it.order[answers[i] as number];
    if (!q || real !== q.answer) wrong.push(i);
  });
  const total = served.items.length;
  const correct = total - wrong.length;
  const need = Math.max(1, total === academy.settings.quizSize ? academy.settings.passCorrect : Math.ceil((academy.settings.passCorrect / academy.settings.quizSize) * total));
  const passed = correct >= Math.min(need, total);
  const retryAt = passed ? null : now + academy.settings.retryMinutes * 60_000;
  const points = passed ? academy.settings.lessonPoints[level - 1] : 0;

  let accepted = false;
  let unlocked: Level | null = null;
  let finished: QuizResult["finished"] = null;
  await getStore().update<LearningRecord>("learning", user.staffId, (cur) => {
    const prog = cur ? { ...fresh(), ...cur.courses[c.id] } : null;
    if (!cur || !prog || !prog.served || prog.served.at !== served.at) return cur; // another click got there first
    accepted = true;
    if (!passed) return { ...cur, courses: { ...cur.courses, [c.id]: { ...prog, served: null, retryAt: { ...prog.retryAt, [`${lessonId}:${level}`]: retryAt as number } } } };
    const best = { ...prog.best, [lessonId]: Math.max(prog.best[lessonId] ?? 0, level) };
    const before = standing(c, prog);
    const after = standing(c, { ...prog, best });
    if (after.level === null && before.level !== null) finished = { points: c.rewardPoints, certificate: c.certificate };
    else if (after.level !== null && before.level !== null && after.level > before.level) unlocked = after.level;
    const certificates = finished && !cur.certificates.some((x) => x.courseId === c.id) ? [...cur.certificates, { courseId: c.id, title: c.certificate, icon: c.icon, at: now }] : cur.certificates;
    return { ...cur, certificates, courses: { ...cur.courses, [c.id]: { ...prog, best, served: null } } };
  });
  if (!accepted) return { ok: false, error: "That quiz is not open." };

  if (passed) {
    const fin = finished as QuizResult["finished"];
    await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
      if (!cur) return cur;
      const skillXp = { ...(cur.skillXp ?? {}) };
      skillXp[c.skill.id] = (skillXp[c.skill.id] ?? 0) + c.skill.xp * level;
      const feeling = { id: randomBytes(5).toString("hex"), label: "Learning", text: `You passed "${l.title}" (${["Easy", "Medium", "Hard"][level - 1]}).`, change: "+Growth", at: now };
      const needs = applyEffects(cur.needs, { growth: 8 + 4 * level, ...(fin ? { recognition: 10 } : {}) });
      return { ...cur, needs, skillXp, feelings: [feeling, ...(cur.feelings ?? [])].slice(0, 12), points: cur.points + points + (fin ? fin.points : 0), updatedAt: now };
    });
    await recordEvent(user.staffId, "lesson", now);
    const idx = c.lessons.findIndex((x) => x.id === lessonId) + 1;
    if (fin) await notify(user.staffId, { icon: "🎓", text: `Course complete: ${c.title}. You earned the "${fin.certificate}" certificate and ${fin.points} Merit points.`, tone: "good" }, now);
    else if (unlocked) await notify(user.staffId, { icon: "🔓", text: `${c.title}: every lesson passed. The ${["Easy", "Medium", "Hard"][(unlocked as Level) - 1]} questions are now unlocked.`, tone: "good" }, now);
    else await notify(user.staffId, { icon: "✅", text: `You passed lesson ${idx} of ${c.title} (${["Easy", "Medium", "Hard"][level - 1]}): "${l.title}". ${correct} of ${total} right.`, tone: "good" }, now);
  }
  return { ok: true, value: { passed, correct, total, need: Math.min(need, total), level, wrong, retryAt, points, unlocked, finished } };
}

/* ---------------------------------- scenarios and cases ---------------------------------- */

/** The choices of a scenario are shuffled the same way every time for the same person, so the best choice is not always in the same place. */
function scenarioOrder(staffId: string, scenarioId: string, n: number): number[] {
  const rnd = seeded(hashString(`${staffId}|${scenarioId}`));
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getScenario(user: Pick<UserDTO, "staffId">, courseId: unknown, scenarioId: unknown): Promise<AcademyResult<ScenarioPlay>> {
  if (typeof courseId !== "string" || typeof scenarioId !== "string") return { ok: false, error: "That scenario does not exist." };
  const c = await getCourseDoc(courseId);
  const s = c?.scenarios.find((x) => x.id === scenarioId);
  if (!c || !s) return { ok: false, error: "That scenario does not exist." };
  const order = scenarioOrder(user.staffId, s.id, s.choices.length);
  return { ok: true, value: { id: s.id, title: s.title, story: s.story, level: s.level, choices: order.map((i) => s.choices[i].text) } };
}

const RANK: Record<Verdict, number> = { wrong: 0, partly: 1, best: 2 };

export async function answerScenario(user: Pick<UserDTO, "staffId">, courseId: unknown, scenarioId: unknown, choice: unknown, now: number = Date.now()): Promise<AcademyResult<ScenarioOutcome>> {
  if (typeof courseId !== "string" || typeof scenarioId !== "string" || !Number.isInteger(choice)) return { ok: false, error: "That scenario does not exist." };
  const academy = await getConfig("academy");
  const c = await getCourseDoc(courseId);
  const s = c?.scenarios.find((x) => x.id === scenarioId);
  if (!c || !s) return { ok: false, error: "That scenario does not exist." };
  const order = scenarioOrder(user.staffId, s.id, s.choices.length);
  const shown = choice as number;
  if (shown < 0 || shown >= order.length) return { ok: false, error: "Please pick one of the choices." };
  const picked = s.choices[order[shown]];
  const best = s.choices.find((x) => x.verdict === "best") as (typeof s.choices)[number];
  let firstBest = false;
  await getStore().update<LearningRecord>("learning", user.staffId, (cur) => {
    const rec: LearningRecord = cur ?? blank(user.staffId);
    const prog = { ...fresh(), ...rec.courses[c.id] };
    const had = prog.scenarios[s.id];
    if (picked.verdict === "best" && had !== "best") firstBest = true;
    if (had !== undefined && RANK[had] >= RANK[picked.verdict]) return rec;
    return { ...rec, courses: { ...rec.courses, [c.id]: { ...prog, scenarios: { ...prog.scenarios, [s.id]: picked.verdict } } } };
  });
  const points = firstBest ? academy.settings.scenarioPoints : 0;
  if (points > 0) await getStore().update<PlayerRecord>("players", user.staffId, (cur) => (cur ? { ...cur, points: cur.points + points, updatedAt: now } : cur));
  return { ok: true, value: { verdict: picked.verdict, feedback: picked.feedback, points, best: best.text } };
}

export async function getCase(courseId: unknown, caseId: unknown): Promise<AcademyResult<CaseView>> {
  if (typeof courseId !== "string" || typeof caseId !== "string") return { ok: false, error: "That case does not exist." };
  const c = await getCourseDoc(courseId);
  const k = c?.cases.find((x) => x.id === caseId);
  if (!c || !k) return { ok: false, error: "That case does not exist." };
  return { ok: true, value: { id: k.id, title: k.title, story: k.story, keyPoints: k.keyPoints } };
}

export async function listCertificates(user: Pick<UserDTO, "staffId">): Promise<Certificate[]> {
  const rec = await getStore().get<LearningRecord>("learning", user.staffId);
  return (rec?.certificates ?? []).slice(0, 50);
}

/** Settle a class that has ended, so the "Class over" update arrives even if nobody opens the Academy. */
export async function settleClasses(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<void> {
  await load(user, now);
}
