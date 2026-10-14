"use server";

import { nominate, removeNomination } from "@/lib/server/succession/service";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/server/auth/dal";
import {
  createStaff,
  resetPasswordToDefault,
  setLineManager,
  setRole,
  setStatus,
  unlockAccount,
  type AdminResult,
} from "@/lib/server/auth/admin";
import { resetConfigToDefault, setConfig } from "@/lib/server/config/registry";
import { updateConcern } from "@/lib/server/concerns/service";
import { deleteCourse, moveCourse, restoreBuiltIns, saveCourse } from "@/lib/server/academy/content";
import { deleteAnnouncement, postAnnouncement } from "@/lib/server/notices/service";
import { adminResetPlacement, adminSetPath, adminSetRetakeLock } from "@/lib/server/placement/service";

export interface AdminFormState {
  error?: string;
  ok?: string;
}

const str = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v : "");

function toState(r: AdminResult, okMessage: string): AdminFormState {
  return r.ok ? { ok: okMessage } : { error: r.error };
}

/* Every action starts with requireRole("admin"): Server Actions are reachable by direct POST. */

export async function resetPasswordAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("staff");
  const r = await resetPasswordToDefault(admin, str(fd.get("staffId")));
  revalidatePath("/admin/staff");
  return toState(r, "Password reset to the default. They must set a new one at next sign-in.");
}

export async function unlockAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("staff");
  const r = await unlockAccount(admin, str(fd.get("staffId")));
  revalidatePath("/admin/staff");
  return toState(r, "Account unlocked.");
}

export async function setStatusAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("staff");
  const status = str(fd.get("status")) === "disabled" ? "disabled" : "active";
  const r = await setStatus(admin, str(fd.get("staffId")), status);
  revalidatePath("/admin/staff");
  return toState(r, status === "disabled" ? "Account disabled." : "Account enabled.");
}

export async function setRoleAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("staff");
  const r = await setRole(admin, str(fd.get("staffId")), str(fd.get("role")));
  revalidatePath("/admin/staff");
  return toState(r, "Role updated.");
}

export async function setLineManagerAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("staff");
  const r = await setLineManager(admin, str(fd.get("staffId")), str(fd.get("value")) === "true");
  revalidatePath("/admin/staff");
  return toState(r, "Line-manager flag updated.");
}

export async function createStaffAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("staff");
  const r = await createStaff(admin, {
    staffId: str(fd.get("staffId")),
    name: str(fd.get("name")),
    email: str(fd.get("email")),
    unit: str(fd.get("unit")),
    segment: str(fd.get("segment")),
    title: str(fd.get("title")),
    role: str(fd.get("role")),
    tenureYears: str(fd.get("tenureYears")),
    isLineManager: str(fd.get("isLineManager")) === "on",
  });
  revalidatePath("/admin/staff");
  return toState(r, "Staff member added. They sign in with the default password and must change it.");
}

export async function setPathAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("placements");
  const r = await adminSetPath(admin, str(fd.get("staffId")), str(fd.get("pathId")));
  revalidatePath("/admin/placements");
  return toState(r, "Path set. Retaking is now locked for this person.");
}

export async function setRetakeLockAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("placements");
  const r = await adminSetRetakeLock(admin, str(fd.get("staffId")), str(fd.get("locked")) === "true");
  revalidatePath("/admin/placements");
  return toState(r, "Retake rule updated.");
}

export async function resetPlacementAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("placements");
  const r = await adminResetPlacement(admin, str(fd.get("staffId")));
  revalidatePath("/admin/placements");
  return toState(r, "Placement removed.");
}

export async function saveConfigAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("settings");
  const r = await setConfig(str(fd.get("key")), str(fd.get("json")), admin.staffId);
  revalidatePath("/admin/config");
  if (!r.ok) return { error: r.errors.join("\n") };
  return { ok: `Saved (version ${r.version}).` };
}

export async function resetConfigAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("settings");
  const r = await resetConfigToDefault(str(fd.get("key")), admin.staffId);
  revalidatePath("/admin/config");
  if (!r.ok) return { error: r.errors.join("\n") };
  return { ok: `Default restored (version ${r.version}). Reload to see it.` };
}

export async function updateConcernAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("concerns");
  const r = await updateConcern(admin, str(fd.get("id")), fd.get("status"), fd.get("note"));
  revalidatePath("/admin/concerns");
  revalidatePath(`/admin/concerns/${str(fd.get("id"))}`);
  return toState(r, "Saved.");
}

export async function postAnnouncementAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("announcements");
  const r = await postAnnouncement(admin, fd.get("title"), fd.get("text"));
  revalidatePath("/admin/announcements");
  return toState(r, "Posted.");
}

export async function deleteAnnouncementAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("announcements");
  const r = await deleteAnnouncement(admin, str(fd.get("id")));
  revalidatePath("/admin/announcements");
  return toState(r, "Removed.");
}

export async function saveCourseAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("academy");
  const r = await saveCourse(admin, fd.get("json"));
  revalidatePath("/admin/academy");
  return r.ok ? { ok: "Saved." } : { error: r.errors.join(" · ") };
}

export async function moveCourseAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("academy");
  const r = await moveCourse(admin, str(fd.get("id")), str(fd.get("group")));
  revalidatePath("/admin/academy");
  return r.ok ? { ok: "Moved." } : { error: r.errors.join(" · ") };
}

export async function deleteCourseAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("academy");
  const r = await deleteCourse(admin, str(fd.get("id")));
  revalidatePath("/admin/academy");
  return r.ok ? { ok: "Deleted." } : { error: r.errors.join(" · ") };
}

export async function restoreBuiltInsAction(): Promise<AdminFormState> {
  const admin = await requireArea("academy");
  const { added } = await restoreBuiltIns(admin);
  revalidatePath("/admin/academy");
  return { ok: added.length === 0 ? "Nothing was missing." : `Added ${added.length} built-in course${added.length === 1 ? "" : "s"}.` };
}

export async function nominateAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("succession");
  const r = await nominate(admin, fd.get("incumbent"), fd.get("successor"), fd.get("readiness"), fd.get("note"));
  revalidatePath("/admin/succession");
  return r.ok ? { ok: "Added." } : { error: r.error };
}

export async function removeNominationAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireArea("succession");
  const r = await removeNomination(admin, fd.get("id"));
  revalidatePath("/admin/succession");
  return r.ok ? { ok: "Removed." } : { error: r.error };
}
