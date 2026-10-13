/**
 * Small helpers for writing Academy content compactly. A question is written as
 * [level, "question", ["option", ...], indexOfRightOption] where level 1 is Easy, 2 Medium and 3 Hard.
 * Question ids are made from the lesson id so they stay stable.
 */
export type QT = [level: 1 | 2 | 3, question: string, options: string[], answer: number];

export interface LessonDef {
  id: string;
  title: string;
  paragraphs: string[];
  questions: { id: string; level: 1 | 2 | 3; question: string; options: string[]; answer: number }[];
}

export interface ScenarioDef {
  id: string;
  title: string;
  story: string;
  level: 1 | 2 | 3;
  choices: { text: string; verdict: "best" | "partly" | "wrong"; feedback: string }[];
}

export interface CaseDef {
  id: string;
  title: string;
  story: string;
  keyPoints: string[];
}

export interface CourseDef {
  id: string;
  group: string;
  title: string;
  kicker: string;
  icon: string;
  intro: string;
  units: string[];
  rewardPoints: number;
  certificate: string;
  skill: { id: string; xp: number };
  lessons: LessonDef[];
  scenarios: ScenarioDef[];
  cases: CaseDef[];
}

export const lesson = (id: string, title: string, paragraphs: string[], qs: QT[]): LessonDef => ({
  id,
  title,
  paragraphs,
  questions: qs.map(([level, question, options, answer], i) => ({ id: `${id}-${i + 1}`, level, question, options, answer })),
});

export const scenario = (id: string, title: string, level: 1 | 2 | 3, story: string, choices: [verdict: "best" | "partly" | "wrong", text: string, feedback: string][]): ScenarioDef => ({
  id,
  title,
  level,
  story,
  choices: choices.map(([verdict, text, feedback]) => ({ text, verdict, feedback })),
});

export const caseStudy = (id: string, title: string, story: string, keyPoints: string[]): CaseDef => ({ id, title, story, keyPoints });

export const course = (c: Omit<CourseDef, "scenarios" | "cases"> & { scenarios?: ScenarioDef[]; cases?: CaseDef[] }): CourseDef => ({ scenarios: [], cases: [], ...c });
