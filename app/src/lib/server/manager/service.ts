import "server-only";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { getUser } from "../auth/users";
import { listCourseMeta } from "../academy/content";
import { notify } from "../notices/service";
import { buildReport, type PersonRow } from "../reports/service";
import { assignLearning, weekStartOf } from "../workfirst/service";
import { localTime } from "@/lib/workfirst";
import type { UserDTO, UserRecord } from "../types";

/**
 * The manager screen: a line manager sees how their own unit is getting on, assigns learning time (as before) and
 * assigns an Academy course with an optional due date. Managers only ever see and change people in their own unit;
 * admins may pick any unit.
 */
export interface CourseAssignment {
  id: string; // staffId:courseId
  staffId: string;
  courseId: string;
  assignedBy: string;
  at: number;
  /** YYYY-MM-DD, or null for no due date. */
  due: string | null;
  note: string;
}

export interface TeamRow extends Pick<PersonRow, "staffId" | "name" | "title" | "points" | "lessonsPassed" | "certificates" | "lastSeen"> {
  assignedMinutes: number;
  courses: { courseId: string; title: string; due: string | null; done: boolean; note: string }[];
}

export interface Team {
  unit: string;
  isAdmin: boolean;
  weeklyLimit: number;
  people: TeamRow[];
  courseOptions: { id: string; title: string }[];
}

/** Active, signed-in-and-ready people who may manage a team: line managers and admins. */
async function managerRecord(actor: Pick<UserDTO, "staffId">): Promise<UserRecord | null> {
  if (!actor || typeof actor.staffId !== "string") return null;
  const rec = await getUser(actor.staffId);
  if (!rec || rec.status !== "active" || rec.mustChangePassword) return null;
  return rec.role === "admin" || rec.role === "manager" || rec.isLineManager ? rec : null;
}

const DUE = /^\d{4}-\d{2}-\d{2}$/;

export async function getTeam(actor: Pick<UserDTO, "staffId">, unitParam?: string, now: number = Date.now()): Promise<Team | null> {
  const me = await managerRecord(actor);
  if (!me) return null;
  const isAdmin = me.role === "admin";
  const unit = isAdmin && unitParam ? unitParam.slice(0, 30) : me.unit;
  const [report, assignments, courses, policy, courseAssignments] = await Promise.all([
    buildReport(now),
    getStore().list<{ staffId: string; weekStart: string; minutes: number }>("learning_assignments"),
    listCourseMeta(),
    getConfig("workFirst"),
    getStore().list<CourseAssignment>("course_assignments"),
  ]);
  const title = new Map(courses.map((c) => [c.id, c.title]));
  const weekStart = weekStartOf(localTime(now, policy.timezone).date);
  const certified = new Set<string>();
  for (const l of await getStore().list<{ staffId: string; certificates?: { courseId: string }[] }>("learning")) for (const c of l.certificates ?? []) certified.add(`${l.staffId}:${c.courseId}`);
  const people: TeamRow[] = report.people
    .filter((p) => p.unit === unit && p.staffId !== me.staffId && p.status === "active")
    .map((p) => ({
      staffId: p.staffId,
      name: p.name,
      title: p.title,
      points: p.points,
      lessonsPassed: p.lessonsPassed,
      certificates: p.certificates,
      lastSeen: p.lastSeen,
      assignedMinutes: assignments.filter((a) => a.staffId === p.staffId && a.weekStart === weekStart).reduce((n, a) => n + a.minutes, 0),
      courses: courseAssignments
        .filter((a) => a.staffId === p.staffId && title.has(a.courseId))
        .map((a) => ({ courseId: a.courseId, title: title.get(a.courseId) as string, due: a.due, done: certified.has(`${a.staffId}:${a.courseId}`), note: a.note })),
    }));
  return { unit, isAdmin, weeklyLimit: policy.assignedLearningMinutesPerWeek, people, courseOptions: courses.map((c) => ({ id: c.id, title: c.title })) };
}

export type AssignCourseResult = { ok: true } | { ok: false; error: string };

export async function assignCourse(actor: Pick<UserDTO, "staffId">, staffId: unknown, courseId: unknown, due: unknown, note: unknown, now: number = Date.now()): Promise<AssignCourseResult> {
  const me = await managerRecord(actor);
  if (!me) return { ok: false, error: "Not allowed" };
  if (typeof staffId !== "string" || typeof courseId !== "string") return { ok: false, error: "Choose a person and a course" };
  const target = await getUser(staffId.trim());
  if (!target || target.status !== "active") return { ok: false, error: "Staff member not found" };
  if (me.role !== "admin" && (target.unit !== me.unit || target.staffId === me.staffId)) return { ok: false, error: "You can only assign courses to people in your own unit" };
  const course = (await listCourseMeta()).find((c) => c.id === courseId);
  if (!course) return { ok: false, error: "That course does not exist" };
  let dueDay: string | null = null;
  if (typeof due === "string" && due.trim() !== "") {
    if (!DUE.test(due) || Number.isNaN(Date.parse(`${due}T00:00:00Z`))) return { ok: false, error: "Use a valid due date" };
    dueDay = due;
  }
  const text = typeof note === "string" ? note.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 200) : "";
  const id = `${target.staffId}:${course.id}`;
  await getStore().put<CourseAssignment>("course_assignments", id, { id, staffId: target.staffId, courseId: course.id, assignedBy: me.staffId, at: now, due: dueDay, note: text });
  await audit(me.staffId, "course_assigned", target.staffId, { courseId: course.id, due: dueDay }, now);
  await notify(target.staffId, { icon: "📌", text: `${me.name} assigned you the course "${course.title}"${dueDay ? `, due ${dueDay}` : ""}.`, tone: "info" }, now);
  return { ok: true };
}

export async function unassignCourse(actor: Pick<UserDTO, "staffId">, staffId: unknown, courseId: unknown): Promise<AssignCourseResult> {
  const me = await managerRecord(actor);
  if (!me) return { ok: false, error: "Not allowed" };
  if (typeof staffId !== "string" || typeof courseId !== "string") return { ok: false, error: "Choose a person and a course" };
  const target = await getUser(staffId.trim());
  if (!target) return { ok: false, error: "Staff member not found" };
  if (me.role !== "admin" && target.unit !== me.unit) return { ok: false, error: "You can only change people in your own unit" };
  await getStore().delete("course_assignments", `${target.staffId}:${courseId}`);
  await audit(me.staffId, "course_unassigned", target.staffId, { courseId });
  return { ok: true };
}

/** What a person has been asked to learn, for their Academy home. */
export async function listMyAssignments(staffId: string): Promise<{ courseId: string; title: string; due: string | null; note: string; by: string }[]> {
  const [all, courses] = await Promise.all([getStore().list<CourseAssignment>("course_assignments"), listCourseMeta()]);
  const title = new Map(courses.map((c) => [c.id, c.title]));
  const mine = all.filter((a) => a.staffId === staffId && title.has(a.courseId));
  const out = [];
  for (const a of mine) out.push({ courseId: a.courseId, title: title.get(a.courseId) as string, due: a.due, note: a.note, by: (await getUser(a.assignedBy))?.name ?? "Your manager" });
  return out.sort((x, y) => (x.due ?? "9999").localeCompare(y.due ?? "9999"));
}

export { assignLearning };
