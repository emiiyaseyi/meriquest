import "server-only";
import { getStore } from "../store";
import { getConfig } from "../config/registry";
import { listCourseMeta } from "../academy/content";
import { levelFor } from "@/lib/world/player";
import type { Streak } from "@/lib/game";
import { withStats, type PersonStats } from "@/lib/stats";
import type { UserRecord } from "../types";

/** The parts of the stored records the reports read. */
interface PlayerDoc {
  staffId: string;
  points?: number;
  streak?: Streak;
  updatedAt?: number;
  stats?: Partial<PersonStats>;
}
interface BeatDoc {
  staffId: string;
  lastBeat?: number | null;
}
interface PlayDoc {
  staffId: string;
  seconds?: number;
}
interface LearningDoc {
  staffId: string;
  courses?: Record<string, { best?: Record<string, number>; scenarios?: Record<string, string> }>;
  certificates?: { courseId: string }[];
}

export interface PersonRow {
  staffId: string;
  name: string;
  unit: string;
  title: string;
  role: string;
  status: string;
  points: number;
  level: string;
  streak: number;
  bestStreak: number;
  lessonsPassed: number;
  hardLessons: number;
  coursesStarted: number;
  certificates: number;
  lastSeen: number | null;
  /** The game heard from them in the last two minutes. */
  online: boolean;
  /** Minutes played in the game, all time. */
  playMinutes: number;
  shifts: number;
  leadRuns: number;
  leadLast: string;
}

export interface UnitRow {
  unit: string;
  people: number;
  online: number;
  activeWeek: number;
  avgPoints: number;
  avgLessons: number;
  certificates: number;
}

export interface CourseRow {
  id: string;
  title: string;
  group: string;
  lessons: number;
  learners: number;
  completed: number;
  /** Average share of the course's lessons passed at any level, by people who started it. */
  avgProgress: number;
}

export interface Report {
  at: number;
  totals: { people: number; online: number; activeDay: number; activeWeek: number; activeMonth: number; signInsToday: number; playHours: number; shifts: number; leadRuns: number; lessonsPassed: number; certificates: number; avgPoints: number };
  units: UnitRow[];
  courses: CourseRow[];
  people: PersonRow[];
}

const DAY = 86_400_000;
const WEEK = 7 * DAY;
/** Someone counts as online when the game last heard from them in this time (the game sends a beat every 30 seconds). */
const ONLINE_MS = 2 * 60_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Progress and engagement for everyone, built from what is already stored. Admin-only: the caller checks the role. */
export async function buildReport(now: number = Date.now()): Promise<Report> {
  const store = getStore();
  const [users, players, learning, courses, levels, playtime, beats] = await Promise.all([store.list<UserRecord>("users"), store.list<PlayerDoc>("players"), store.list<LearningDoc>("learning"), listCourseMeta(), getConfig("levels"), store.list<PlayDoc>("playtime"), store.list<BeatDoc>("play_sessions")]);
  const beatBy = new Map(beats.map((b) => [b.staffId, b.lastBeat ?? 0]));
  const playSeconds = new Map<string, number>();
  for (const d of playtime) playSeconds.set(d.staffId, (playSeconds.get(d.staffId) ?? 0) + (Number.isFinite(d.seconds) ? (d.seconds as number) : 0));
  const playerBy = new Map(players.map((p) => [p.staffId, p]));
  const learnBy = new Map(learning.map((l) => [l.staffId, l]));
  const lessonCount = new Map(courses.map((c) => [c.id, c.lessonIds.length]));

  const people: PersonRow[] = users
    .map((u) => {
      const p = playerBy.get(u.staffId);
      const l = learnBy.get(u.staffId);
      let lessonsPassed = 0;
      let hardLessons = 0;
      let started = 0;
      for (const [cid, prog] of Object.entries(l?.courses ?? {})) {
        if (!lessonCount.has(cid)) continue;
        const passed = Object.values(prog.best ?? {}).filter((v) => v >= 1);
        if (passed.length > 0) started++;
        lessonsPassed += passed.length;
        hardLessons += passed.filter((v) => v >= 3).length;
      }
      const points = Number.isFinite(p?.points) ? Math.floor(p?.points as number) : 0;
      const seen = Math.max(u.lastLoginAt ?? 0, p?.updatedAt ?? 0);
      return {
        staffId: u.staffId,
        name: u.name,
        unit: u.unit,
        title: u.title,
        role: u.role,
        status: u.status,
        points,
        level: levelFor(points, levels).name,
        streak: p?.streak?.count ?? 0,
        bestStreak: p?.streak?.best ?? 0,
        lessonsPassed,
        hardLessons,
        coursesStarted: started,
        certificates: (l?.certificates ?? []).filter((c) => lessonCount.has(c.courseId)).length,
        lastSeen: seen > 0 ? seen : null,
        online: now - Math.max(beatBy.get(u.staffId) ?? 0, p?.updatedAt ?? 0) <= ONLINE_MS,
        playMinutes: Math.round((playSeconds.get(u.staffId) ?? 0) / 60),
        shifts: withStats(p?.stats).shifts,
        leadRuns: withStats(p?.stats).leadRuns,
        leadLast: withStats(p?.stats).leadLast ?? "",
      };
    })
    .sort((a, b) => a.staffId.localeCompare(b.staffId));

  const active = (r: PersonRow) => r.lastSeen !== null && now - r.lastSeen <= WEEK;
  const byUnit = new Map<string, PersonRow[]>();
  for (const r of people) byUnit.set(r.unit, [...(byUnit.get(r.unit) ?? []), r]);
  const units: UnitRow[] = [...byUnit.entries()]
    .map(([unit, rows]) => ({
      unit,
      people: rows.length,
      online: rows.filter((r) => r.online).length,
      activeWeek: rows.filter(active).length,
      avgPoints: Math.round(rows.reduce((n, r) => n + r.points, 0) / rows.length),
      avgLessons: round1(rows.reduce((n, r) => n + r.lessonsPassed, 0) / rows.length),
      certificates: rows.reduce((n, r) => n + r.certificates, 0),
    }))
    .sort((a, b) => a.unit.localeCompare(b.unit));

  const courseRows: CourseRow[] = courses.map((c) => {
    let learners = 0;
    let completed = 0;
    let shares = 0;
    for (const l of learning) {
      const prog = l.courses?.[c.id];
      const passed = Object.values(prog?.best ?? {}).filter((v) => v >= 1).length;
      if (passed > 0) {
        learners++;
        shares += passed / Math.max(1, c.lessonIds.length);
      }
      if ((l.certificates ?? []).some((x) => x.courseId === c.id)) completed++;
    }
    return { id: c.id, title: c.title, group: c.group, lessons: c.lessonIds.length, learners, completed, avgProgress: learners ? Math.round((shares / learners) * 100) : 0 };
  });

  return {
    at: now,
    totals: {
      people: people.length,
      online: people.filter((r) => r.online).length,
      activeDay: people.filter((r) => r.lastSeen !== null && now - r.lastSeen <= DAY).length,
      activeWeek: people.filter(active).length,
      activeMonth: people.filter((r) => r.lastSeen !== null && now - r.lastSeen <= 30 * DAY).length,
      signInsToday: users.filter((u) => (u.lastLoginAt ?? 0) > 0 && now - (u.lastLoginAt as number) <= DAY).length,
      playHours: Math.round((people.reduce((n, r) => n + r.playMinutes, 0) / 60) * 10) / 10,
      shifts: people.reduce((n, r) => n + r.shifts, 0),
      leadRuns: people.reduce((n, r) => n + r.leadRuns, 0),
      lessonsPassed: people.reduce((n, r) => n + r.lessonsPassed, 0),
      certificates: people.reduce((n, r) => n + r.certificates, 0),
      avgPoints: people.length ? Math.round(people.reduce((n, r) => n + r.points, 0) / people.length) : 0,
    },
    units,
    courses: courseRows,
    people,
  };
}

/** A cell for a spreadsheet: text that starts like a formula is made harmless, and quotes are escaped. */
export function csvCell(v: string | number | null): string {
  let s = v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportCsv(r: Report): string {
  const head = ["Staff ID", "Name", "Unit", "Title", "Role", "Status", "Merit points", "Career level", "Streak", "Best streak", "Lessons passed", "Lessons passed at Hard", "Courses started", "Certificates", "Play minutes", "Shifts finished", "Leadership runs", "Latest leadership rating", "Last seen"];
  const rows = r.people.map((p) => [p.staffId, p.name, p.unit, p.title, p.role, p.status, p.points, p.level, p.streak, p.bestStreak, p.lessonsPassed, p.hardLessons, p.coursesStarted, p.certificates, p.playMinutes, p.shifts, p.leadRuns, p.leadLast, p.lastSeen ? new Date(p.lastSeen).toISOString() : ""]);
  return [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
