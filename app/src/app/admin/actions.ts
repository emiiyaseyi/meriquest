"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/server/auth/dal";
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
  const admin = await requireRole("admin");
  const r = await resetPasswordToDefault(admin, str(fd.get("staffId")));
  revalidatePath("/admin/staff");
  return toState(r, "Password reset to the default. They must set a new one at next sign-in.");
}

export async function unlockAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const r = await unlockAccount(admin, str(fd.get("staffId")));
  revalidatePath("/admin/staff");
  return toState(r, "Account unlocked.");
}

export async function setStatusAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const status = str(fd.get("status")) === "disabled" ? "disabled" : "active";
  const r = await setStatus(admin, str(fd.get("staffId")), status);
  revalidatePath("/admin/staff");
  return toState(r, status === "disabled" ? "Account disabled." : "Account enabled.");
}

export async function setRoleAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const r = await setRole(admin, str(fd.get("staffId")), str(fd.get("role")));
  revalidatePath("/admin/staff");
  return toState(r, "Role updated.");
}

export async function setLineManagerAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const r = await setLineManager(admin, str(fd.get("staffId")), str(fd.get("value")) === "true");
  revalidatePath("/admin/staff");
  return toState(r, "Line-manager flag updated.");
}

export async function createStaffAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
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
  const admin = await requireRole("admin");
  const r = await adminSetPath(admin, str(fd.get("staffId")), str(fd.get("pathId")));
  revalidatePath("/admin/placements");
  return toState(r, "Path set. Retaking is now locked for this person.");
}

export async function setRetakeLockAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const r = await adminSetRetakeLock(admin, str(fd.get("staffId")), str(fd.get("locked")) === "true");
  revalidatePath("/admin/placements");
  return toState(r, "Retake rule updated.");
}

export async function resetPlacementAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const r = await adminResetPlacement(admin, str(fd.get("staffId")));
  revalidatePath("/admin/placements");
  return toState(r, "Placement removed.");
}

export async function saveConfigAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const r = await setConfig(str(fd.get("key")), str(fd.get("json")), admin.staffId);
  revalidatePath("/admin/config");
  if (!r.ok) return { error: r.errors.join("\n") };
  return { ok: `Saved (version ${r.version}).` };
}

export async function resetConfigAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const r = await resetConfigToDefault(str(fd.get("key")), admin.staffId);
  revalidatePath("/admin/config");
  if (!r.ok) return { error: r.errors.join("\n") };
  return { ok: `Default restored (version ${r.version}). Reload to see it.` };
}

export async function updateConcernAction(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const admin = await requireRole("admin");
  const r = await updateConcern(admin, str(fd.get("id")), fd.get("status"), fd.get("note"));
  revalidatePath("/admin/concerns");
  revalidatePath(`/admin/concerns/${str(fd.get("id"))}`);
  return toState(r, "Saved.");
}
