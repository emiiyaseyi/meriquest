"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { answerScenario, attendLesson, getAcademy, getCase, getCourse, getQuiz, getScenario, readNotes, submitQuiz } from "@/lib/server/academy/service";
import type { AcademyHome, AcademyResult, CaseView, CourseView, LessonNotes, QuizResult, QuizSet, ScenarioOutcome, ScenarioPlay } from "@/lib/academy";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function academyHomeAction(): Promise<AcademyHome> {
  const user = await requireUser();
  return getAcademy(user);
}

export async function courseAction(courseId: string): Promise<AcademyResult<CourseView>> {
  const user = await requireUser();
  return getCourse(user, courseId);
}

export async function attendAction(courseId: string): Promise<AcademyResult<CourseView>> {
  const user = await requireUser();
  return attendLesson(user, courseId);
}

export async function notesAction(courseId: string, lessonId: string): Promise<AcademyResult<LessonNotes>> {
  const user = await requireUser();
  return readNotes(user, courseId, lessonId);
}

export async function quizAction(courseId: string, lessonId: string): Promise<AcademyResult<QuizSet>> {
  const user = await requireUser();
  return getQuiz(user, courseId, lessonId);
}

export async function submitQuizAction(courseId: string, lessonId: string, answers: number[]): Promise<AcademyResult<QuizResult>> {
  const user = await requireUser();
  return submitQuiz(user, courseId, lessonId, answers);
}

export async function scenarioAction(courseId: string, scenarioId: string): Promise<AcademyResult<ScenarioPlay>> {
  const user = await requireUser();
  return getScenario(user, courseId, scenarioId);
}

export async function scenarioAnswerAction(courseId: string, scenarioId: string, choice: number): Promise<AcademyResult<ScenarioOutcome>> {
  const user = await requireUser();
  return answerScenario(user, courseId, scenarioId, choice);
}

export async function caseAction(courseId: string, caseId: string): Promise<AcademyResult<CaseView>> {
  await requireUser();
  return getCase(courseId, caseId);
}
