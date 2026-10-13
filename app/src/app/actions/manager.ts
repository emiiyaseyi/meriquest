"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/dal";
import { assignCourse, assignLearning, unassignCourse } from "@/lib/server/manager/service";

export interface ManagerFormState {
  ok?: string;
  error?: string;
}

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

/* Every action re-checks who is asking: the manager screen is only a convenience. */

export async function assignTimeAction(_p: ManagerFormState, fd: FormData): Promise<ManagerFormState> {
  const user = await requireUser();
  const r = await assignLearning(user, text(fd.get("staffId")), Number(text(fd.get("minutes"))));
  revalidatePath("/manager");
  return r.ok ? { ok: `Assigned. ${r.minutesThisWeek} minutes this week.` } : { error: r.error };
}

export async function assignCourseAction(_p: ManagerFormState, fd: FormData): Promise<ManagerFormState> {
  const user = await requireUser();
  const r = await assignCourse(user, text(fd.get("staffId")), text(fd.get("courseId")), text(fd.get("due")), text(fd.get("note")));
  revalidatePath("/manager");
  return r.ok ? { ok: "Course assigned." } : { error: r.error };
}

export async function unassignCourseAction(_p: ManagerFormState, fd: FormData): Promise<ManagerFormState> {
  const user = await requireUser();
  const r = await unassignCourse(user, text(fd.get("staffId")), text(fd.get("courseId")));
  revalidatePath("/manager");
  return r.ok ? { ok: "Removed." } : { error: r.error };
}
