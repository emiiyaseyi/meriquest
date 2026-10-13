import "server-only";
import { getStore } from "../store";
import { audit } from "../audit";
import { BUILTIN_COURSES } from "../config/academy-content";
import { courseSchema } from "../config/definitions";
import { getConfig } from "../config/registry";
import type { UserDTO } from "../types";
import type { z } from "zod";

/**
 * The Academy's courses, one record each. They are copied from the built-in content the first time the
 * Academy is used, after which the admin owns them: edits, moves and deletions stay, and the built-in copy
 * never overwrites them. A small index record per course keeps the course list fast.
 */
export type CourseDoc = z.infer<typeof courseSchema>;

/** What the course list needs, without the lessons' text or questions. */
export interface CourseMeta {
  id: string;
  group: string;
  title: string;
  kicker: string;
  icon: string;
  intro: string;
  units: string[];
  rewardPoints: number;
  certificate: string;
  lessonIds: string[];
  scenarios: number;
  cases: number;
  order: number;
  updatedAt: number;
}

interface Stored {
  id: string;
  course: CourseDoc;
  order: number;
  updatedAt: number;
  updatedBy: string;
}

export const MAX_COURSE_JSON_BYTES = 600_000;

const metaOf = (c: CourseDoc, order: number, updatedAt: number): CourseMeta => ({
  id: c.id,
  group: c.group,
  title: c.title,
  kicker: c.kicker,
  icon: c.icon,
  intro: c.intro,
  units: c.units,
  rewardPoints: c.rewardPoints,
  certificate: c.certificate,
  lessonIds: c.lessons.map((l) => l.id),
  scenarios: c.scenarios.length,
  cases: c.cases.length,
  order,
  updatedAt,
});

async function put(course: CourseDoc, order: number, by: string, now: number): Promise<void> {
  const store = getStore();
  await store.put<Stored>("academy_courses", course.id, { id: course.id, course, order, updatedAt: now, updatedBy: by });
  await store.put<CourseMeta>("academy_index", course.id, metaOf(course, order, now));
}

let seeding: Promise<void> | null = null;

/** Copy the built-in courses in, once. Safe to call on every read. */
export async function ensureCourses(now: number = Date.now()): Promise<void> {
  const store = getStore();
  if (await store.get("academy_meta", "seeded")) return;
  seeding ??= (async () => {
    // Only the first caller seeds; others wait for it. A second process racing is harmless: it writes the same values.
    const existing = new Set((await store.list<CourseMeta>("academy_index")).map((m) => m.id));
    for (const [i, c] of BUILTIN_COURSES.entries()) {
      if (!existing.has(c.id)) await put(c as CourseDoc, i, "built-in", now);
    }
    await store.put("academy_meta", "seeded", { id: "seeded", at: now, count: BUILTIN_COURSES.length });
  })().finally(() => {
    seeding = null;
  });
  await seeding;
}

export async function listCourseMeta(): Promise<CourseMeta[]> {
  await ensureCourses();
  return (await getStore().list<CourseMeta>("academy_index")).sort((a, b) => a.order - b.order);
}

export async function getCourseDoc(id: unknown): Promise<CourseDoc | null> {
  if (typeof id !== "string" || !/^[a-z][a-z0-9-]{0,40}$/.test(id)) return null;
  await ensureCourses();
  return (await getStore().get<Stored>("academy_courses", id))?.course ?? null;
}

function assertAdmin(actor: Pick<UserDTO, "role">): void {
  if (actor.role !== "admin") throw new Error("Forbidden");
}

export type CourseResult = { ok: true } | { ok: false; errors: string[] };

/** Validate and save a course (a new one or a changed one). Only admins. */
export async function saveCourse(actor: Pick<UserDTO, "staffId" | "role">, rawJson: unknown, now: number = Date.now()): Promise<CourseResult> {
  assertAdmin(actor);
  if (typeof rawJson !== "string" || rawJson.length > MAX_COURSE_JSON_BYTES) return { ok: false, errors: ["The course is too large."] };
  let candidate: unknown;
  try {
    candidate = JSON.parse(rawJson);
  } catch {
    return { ok: false, errors: ["That is not valid JSON."] };
  }
  const parsed = courseSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(course)"}: ${i.message}`) };
  const course = parsed.data;
  await ensureCourses(now);
  const groups = (await getConfig("academy")).groups;
  if (course.group !== "" && !groups.some((g) => g.id === course.group)) return { ok: false, errors: [`group: "${course.group}" is not one of the Academy groups.`] };
  const store = getStore();
  const prev = await store.get<Stored>("academy_courses", course.id);
  const order = prev?.order ?? (await listCourseMeta()).reduce((m, c) => Math.max(m, c.order + 1), 0);
  await put(course, order, actor.staffId, now);
  await audit(actor.staffId, prev ? "academy.course.saved" : "academy.course.added", course.id, { lessons: course.lessons.length }, now);
  return { ok: true };
}

/** Move a course to another group, or out of every group (an empty group id). */
export async function moveCourse(actor: Pick<UserDTO, "staffId" | "role">, id: unknown, group: unknown, now: number = Date.now()): Promise<CourseResult> {
  assertAdmin(actor);
  const course = await getCourseDoc(id);
  if (!course) return { ok: false, errors: ["That course does not exist."] };
  if (typeof group !== "string" || group.length > 41) return { ok: false, errors: ["That group does not exist."] };
  if (group !== "" && !(await getConfig("academy")).groups.some((g) => g.id === group)) return { ok: false, errors: ["That group does not exist."] };
  const order = (await getStore().get<Stored>("academy_courses", course.id))?.order ?? 0;
  await put({ ...course, group }, order, actor.staffId, now);
  await audit(actor.staffId, "academy.course.moved", course.id, { group }, now);
  return { ok: true };
}

export async function deleteCourse(actor: Pick<UserDTO, "staffId" | "role">, id: unknown, now: number = Date.now()): Promise<CourseResult> {
  assertAdmin(actor);
  const course = await getCourseDoc(id);
  if (!course) return { ok: false, errors: ["That course does not exist."] };
  await getStore().delete("academy_courses", course.id);
  await getStore().delete("academy_index", course.id);
  await audit(actor.staffId, "academy.course.deleted", course.id, undefined, now);
  return { ok: true };
}

/** Add any built-in courses that are missing (for example ones added in a later update). Never overwrites an existing course. */
export async function restoreBuiltIns(actor: Pick<UserDTO, "staffId" | "role">, now: number = Date.now()): Promise<{ added: string[] }> {
  assertAdmin(actor);
  await ensureCourses(now);
  const have = new Set((await listCourseMeta()).map((m) => m.id));
  const next = (await listCourseMeta()).reduce((m, c) => Math.max(m, c.order + 1), 0);
  const added: string[] = [];
  for (const c of BUILTIN_COURSES) {
    if (!have.has(c.id)) {
      await put(c as CourseDoc, next + added.length, actor.staffId, now);
      added.push(c.id);
    }
  }
  if (added.length > 0) await audit(actor.staffId, "academy.builtins.restored", undefined, { added: added.length }, now);
  return { added };
}

export async function getCourseJson(actor: Pick<UserDTO, "role">, id: unknown): Promise<string | null> {
  assertAdmin(actor);
  const c = await getCourseDoc(id);
  return c ? JSON.stringify(c, null, 2) : null;
}

export function blankCourseJson(): string {
  return JSON.stringify(
    {
      id: "new-course",
      group: "",
      title: "New course",
      kicker: "Topic",
      icon: "📘",
      intro: "What this course is about.",
      units: ["*"],
      rewardPoints: 20,
      certificate: "New course",
      skill: { id: "communication", xp: 3 },
      lessons: [
        {
          id: "lesson-one",
          title: "Lesson one",
          paragraphs: ["Write the notes here."],
          questions: [1, 2, 3].map((n) => ({ id: `lesson-one-${n}`, level: 1, question: `Question ${n}: write the question here`, options: ["Right answer", "Wrong answer", "Another wrong answer"], answer: 0 })),
        },
      ],
      scenarios: [],
      cases: [],
    },
    null,
    2,
  );
}
