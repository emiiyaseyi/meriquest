/** Meristem Academy: the shapes the server sends to the screen. Answers are never part of them. */
export type Level = 1 | 2 | 3;
export const LEVEL_NAME: Record<Level, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

export interface GroupView {
  id: string;
  label: string;
  icon: string;
}

export interface CourseCard {
  id: string;
  group: string;
  title: string;
  kicker: string;
  icon: string;
  intro: string;
  lessons: number;
  /** Lessons passed at the level the person is working on now. */
  passed: number;
  /** The level being worked on (1 Easy, 2 Medium, 3 Hard), or null when the course is finished. */
  level: Level | null;
  certified: boolean;
  /** True when the course is for this person's unit, or for everyone. */
  recommended: boolean;
  /** "For everyone" or the unit names it is for, as a label. */
  audience: string;
  rewardPoints: number;
  certificate: string;
  /** 1-based number of the lesson to take next at the current level, or null when the course is finished. */
  next: number | null;
  scenarios: number;
  cases: number;
}

export interface AcademyHome {
  groups: GroupView[];
  courses: CourseCard[];
  classesToday: number;
  classesPerDay: number;
  classMinutes: number;
  classSeconds: number;
  quizSize: number;
  passCorrect: number;
  retryMinutes: number;
  /** A class that is running now, if any. */
  attending: { courseId: string; courseTitle: string; lessonTitle: string; endsAt: number } | null;
}

export type LessonStatus = "passed" | "next" | "locked" | "attending" | "notes";

export interface LessonRow {
  id: string;
  number: number;
  title: string;
  /** At the level being worked on: passed, next to take, waiting for its class, and so on. */
  status: LessonStatus;
  /** Highest level passed for this lesson (0 when none). */
  best: number;
}

export interface ScenarioRow {
  id: string;
  title: string;
  level: Level;
  /** The best verdict reached so far, if any. */
  done: "best" | "partly" | "wrong" | null;
}

export interface CourseView {
  card: CourseCard;
  lessons: LessonRow[];
  scenarios: ScenarioRow[];
  cases: { id: string; title: string }[];
  canAttend: boolean;
  /** Why attending is not possible right now (a class is running, the daily limit, and so on). */
  blocked: string | null;
  classMinutes: number;
  classSeconds: number;
  classesToday: number;
  classesPerDay: number;
  /** When a failed quiz can be tried again, if that is in the future. */
  retryAt: number | null;
}

export interface LessonNotes {
  courseTitle: string;
  number: number;
  total: number;
  title: string;
  paragraphs: string[];
  /** A lesson video, when the admin attached one. */
  video: { kind: "frame" | "file"; src: string } | null;
  level: Level;
  /** True when the quiz at the current level has not been passed yet. */
  quizDue: boolean;
  quizCount: number;
  passCorrect: number;
  retryMinutes: number;
  retryAt: number | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
}

export interface QuizSet {
  level: Level;
  questions: QuizQuestion[];
  need: number;
}

export interface QuizResult {
  passed: boolean;
  correct: number;
  total: number;
  need: number;
  level: Level;
  /** Which questions were wrong (by position), without saying what the right answers are. */
  wrong: number[];
  retryAt: number | null;
  points: number;
  /** Set when this pass unlocked the next level of the course. */
  unlocked: Level | null;
  /** Set when passing this lesson finished the course (Hard everywhere). */
  finished: { points: number; certificate: string } | null;
}

export interface ScenarioPlay {
  id: string;
  title: string;
  story: string;
  level: Level;
  choices: string[];
}

export interface ScenarioOutcome {
  verdict: "best" | "partly" | "wrong";
  feedback: string;
  points: number;
  /** The best choice, shown after answering so people learn from it. */
  best: string;
}

export interface CaseView {
  id: string;
  title: string;
  story: string;
  keyPoints: string[];
}

export type AcademyResult<T> = { ok: true; value: T } | { ok: false; error: string };
