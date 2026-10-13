import "server-only";
import { z } from "zod";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { ROLES, type Role, type UserDTO, type UserRecord } from "../types";
import { destroyUserSessions } from "./session";
import { getUser, listUsers, parseIdentifier } from "./users";

/**
 * Admin operations. The server action that calls these has already required an admin, and each
 * function checks the actor again (defence in depth: Server Actions are reachable by direct POST).
 */
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
  }
}

/**
 * Never trusts the object it is given: the actor's role and status are re-read from the store, so a
 * stale or forged DTO cannot grant admin power. Admins still on the default password have none.
 */
export async function assertAdmin(actor: UserDTO | null | undefined): Promise<void> {
  if (!actor || typeof actor.staffId !== "string") throw new ForbiddenError();
  const rec = await getUser(actor.staffId);
  if (!rec || rec.role !== "admin" || rec.status !== "active" || rec.mustChangePassword) throw new ForbiddenError();
}

export type AdminResult = { ok: true } | { ok: false; error: string };

const staffIdSchema = z.string().trim().min(3).max(20);

async function activeAdminCount(exceptStaffId?: string): Promise<number> {
  return (await listUsers()).filter((u) => u.role === "admin" && u.status === "active" && u.staffId !== exceptStaffId).length;
}

export async function resetPasswordToDefault(actor: UserDTO, staffId: string, now = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  const id = staffIdSchema.safeParse(staffId);
  if (!id.success) return { ok: false, error: "Invalid staff ID" };
  const target = await getUser(id.data);
  if (!target) return { ok: false, error: "Staff member not found" };
  await getStore().update<UserRecord>("users", target.staffId, (c) =>
    c ? { ...c, passwordHash: null, mustChangePassword: true, failedAttempts: 0, lockedUntil: null, updatedAt: now } : null,
  );
  await destroyUserSessions(target.staffId);
  await audit(actor.staffId, "password_reset_to_default", target.staffId, undefined, now);
  return { ok: true };
}

export async function unlockAccount(actor: UserDTO, staffId: string, now = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  const target = await getUser(staffIdSchema.parse(staffId));
  if (!target) return { ok: false, error: "Staff member not found" };
  await getStore().update<UserRecord>("users", target.staffId, (c) => (c ? { ...c, failedAttempts: 0, lockedUntil: null, updatedAt: now } : null));
  await audit(actor.staffId, "account_unlocked", target.staffId, undefined, now);
  return { ok: true };
}

export async function setStatus(actor: UserDTO, staffId: string, status: "active" | "disabled", now = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  if (status !== "active" && status !== "disabled") return { ok: false, error: "Invalid status" };
  const target = await getUser(staffIdSchema.parse(staffId));
  if (!target) return { ok: false, error: "Staff member not found" };
  if (status === "disabled") {
    if (target.staffId === actor.staffId) return { ok: false, error: "You cannot disable your own account" };
    if (target.role === "admin" && (await activeAdminCount(target.staffId)) === 0) return { ok: false, error: "At least one active admin is required" };
  }
  await getStore().update<UserRecord>("users", target.staffId, (c) => (c ? { ...c, status, updatedAt: now } : null));
  if (status === "disabled") await destroyUserSessions(target.staffId);
  await audit(actor.staffId, status === "disabled" ? "account_disabled" : "account_enabled", target.staffId, undefined, now);
  return { ok: true };
}

export async function setRole(actor: UserDTO, staffId: string, role: string, now = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  if (!(ROLES as readonly string[]).includes(role)) return { ok: false, error: "Invalid role" };
  const target = await getUser(staffIdSchema.parse(staffId));
  if (!target) return { ok: false, error: "Staff member not found" };
  if (target.role === "admin" && role !== "admin") {
    if (target.staffId === actor.staffId) return { ok: false, error: "You cannot remove your own admin role" };
    if ((await activeAdminCount(target.staffId)) === 0) return { ok: false, error: "At least one active admin is required" };
  }
  await getStore().update<UserRecord>("users", target.staffId, (c) => (c ? { ...c, role: role as Role, updatedAt: now } : null));
  // Role changes take effect on the next request because roles are read from the store, not the cookie.
  await audit(actor.staffId, "role_changed", target.staffId, { role }, now);
  return { ok: true };
}

export async function setLineManager(actor: UserDTO, staffId: string, value: boolean, now = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  const target = await getUser(staffIdSchema.parse(staffId));
  if (!target) return { ok: false, error: "Staff member not found" };
  await getStore().update<UserRecord>("users", target.staffId, (c) => (c ? { ...c, isLineManager: value === true, updatedAt: now } : null));
  await audit(actor.staffId, "line_manager_changed", target.staffId, { isLineManager: value === true }, now);
  return { ok: true };
}

const newStaffSchema = z.object({
  staffId: z.string().trim(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().max(120),
  unit: z.string().trim().min(1).max(20).regex(/^[a-z0-9-]+$/),
  segment: z.enum(["front", "middle", "back"]),
  title: z.string().trim().min(2).max(80),
  role: z.enum(ROLES as unknown as [Role, ...Role[]]),
  tenureYears: z.coerce.number().min(0).max(60),
  isLineManager: z.boolean(),
});

export async function createStaff(actor: UserDTO, input: unknown, now = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  const parsed = newStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  const d = parsed.data;
  const cfg = await getConfig("auth");
  const idParsed = parseIdentifier(d.staffId, cfg);
  if (!idParsed || idParsed.kind !== "staff") return { ok: false, error: `Staff ID must look like ${cfg.staffIdExample}` };
  const emailParsed = parseIdentifier(d.email, cfg);
  if (!emailParsed || emailParsed.kind !== "email") return { ok: false, error: "Use a work email on an allowed domain" };
  const all = await listUsers();
  if (all.some((u) => u.email === emailParsed.email)) return { ok: false, error: "That email is already in use" };
  let created = false;
  await getStore().update<UserRecord>("users", idParsed.staffId, (cur) => {
    if (cur) return cur;
    created = true;
    return {
      staffId: idParsed.staffId,
      name: d.name,
      email: emailParsed.email,
      unit: d.unit,
      segment: d.segment,
      title: d.title,
      role: d.role,
      isLineManager: d.isLineManager,
      tenureYears: d.tenureYears,
      status: "active",
      passwordHash: null,
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      passwordChangedAt: null,
    };
  });
  if (!created) return { ok: false, error: "That staff ID already exists" };
  await audit(actor.staffId, "staff_created", idParsed.staffId, { role: d.role }, now);
  return { ok: true };
}
