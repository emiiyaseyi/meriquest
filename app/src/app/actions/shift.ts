"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { answerShiftTask, finishShift, getShift, leaveShift, startShift, type ShiftResult, type ShiftView } from "@/lib/server/shift/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function getShiftAction(): Promise<ShiftView> {
  const user = await requireUser();
  return getShift(user);
}

export async function startShiftAction(): Promise<ShiftResult> {
  const user = await requireUser();
  return startShift(user);
}

export async function answerShiftAction(taskId: string, shown: number): Promise<ShiftResult> {
  const user = await requireUser();
  return answerShiftTask(user, taskId, shown);
}

export async function finishShiftAction(): Promise<ShiftResult> {
  const user = await requireUser();
  return finishShift(user);
}

export async function leaveShiftAction(): Promise<ShiftResult> {
  const user = await requireUser();
  return leaveShift(user);
}
