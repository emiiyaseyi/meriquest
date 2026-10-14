import "server-only";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { toDTO, type UserDTO, type UserRecord } from "../types";
import { checkPasswordPolicy, defaultPasswordMatches, dummyVerify, hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from "./password";
import { rateLimit } from "./ratelimit";
import { createSession, destroyUserSessions, validateSession } from "./session";
import { findUser, getUser, parseIdentifier } from "./users";
import { openSecret, consumeRecoveryCode, verifyCode } from "./totp";

/** Verify a password for a user, including the "still on the default password" case. */
async function verifyUserPassword(user: UserRecord, pw: string): Promise<boolean> {
  if (user.passwordHash === null) return defaultPasswordMatches(pw);
  return verifyPassword(pw, user.passwordHash);
}

export type AuthResult =
  | { ok: true; user: UserDTO; token: string; expiresAt: number }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "needs_code" }
  | { ok: false; reason: "throttled"; retryAfterSec: number };

/**
 * Sign in. Every failure that could reveal whether an account exists returns the same
 * "invalid" result and burns the same CPU. Throttling is keyed on the input, not on the account.
 */
export async function authenticate(
  input: { identifier: unknown; password: unknown; code?: unknown },
  ctx: { ip: string },
  now: number = Date.now(),
): Promise<AuthResult> {
  const cfg = await getConfig("auth");
  const password = typeof input.password === "string" ? input.password : "";
  const parsed = parseIdentifier(input.identifier, cfg);

  // Generous per-IP ceiling: a whole office shares one public IP. The tight limits are per identifier.
  const ipGate = await rateLimit(`login:ip:${ctx.ip}`, 300, 10 * 60_000, now);
  if (!ipGate.allowed) return { ok: false, reason: "throttled", retryAfterSec: ipGate.retryAfterSec };
  const idKey = parsed ? (parsed.kind === "staff" ? parsed.staffId : parsed.email) : `bad:${String(input.identifier).slice(0, 40)}`;
  const idGate = await rateLimit(`login:id:${idKey}`, 10, 15 * 60_000, now);
  if (!idGate.allowed) return { ok: false, reason: "throttled", retryAfterSec: idGate.retryAfterSec };

  if (!parsed || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    await dummyVerify(password.slice(0, MAX_PASSWORD_LENGTH));
    return { ok: false, reason: "invalid" };
  }

  const user = await findUser(parsed);
  if (!user || user.status !== "active" || (user.lockedUntil !== null && user.lockedUntil > now)) {
    await dummyVerify(password);
    if (user) await audit(user.staffId, "login_blocked", user.staffId, { reason: user.status !== "active" ? "disabled" : "locked" }, now);
    return { ok: false, reason: "invalid" };
  }

  const good = await verifyUserPassword(user, password);
  if (!good) {
    let locked = false;
    await getStore().update<UserRecord>("users", user.staffId, (cur) => {
      if (!cur) return null;
      const failed = cur.failedAttempts + 1;
      if (failed >= cfg.maxFailedAttempts) {
        locked = true;
        return { ...cur, failedAttempts: 0, lockedUntil: now + cfg.lockMinutes * 60_000, updatedAt: now };
      }
      return { ...cur, failedAttempts: failed, updatedAt: now };
    });
    await audit(user.staffId, locked ? "account_locked" : "login_failed", user.staffId, undefined, now);
    return { ok: false, reason: "invalid" };
  }

  // Two-step sign-in: the password was right, so now the code from the authenticator app (or a recovery code) is needed
  let usedStep: number | null = null;
  let recoveryLeft: string[] | null = null;
  if (user.totp?.enabled) {
    const supplied = typeof input.code === "string" ? input.code.trim() : "";
    if (supplied === "") return { ok: false, reason: "needs_code" };
    const gate = await rateLimit(`totp:${user.staffId}`, 8, 10 * 60_000, now);
    const secret = openSecret(user.totp.secret);
    const byApp = secret && gate.allowed ? verifyCode(secret, supplied, now, user.totp.lastStep) : { ok: false as const };
    recoveryLeft = !byApp.ok && gate.allowed ? consumeRecoveryCode(user.totp.recovery, supplied) : null;
    if (!byApp.ok && recoveryLeft === null) {
      let locked = false;
      await getStore().update<UserRecord>("users", user.staffId, (cur) => {
        if (!cur) return null;
        const failed = cur.failedAttempts + 1;
        if (failed >= cfg.maxFailedAttempts) {
          locked = true;
          return { ...cur, failedAttempts: 0, lockedUntil: now + cfg.lockMinutes * 60_000, updatedAt: now };
        }
        return { ...cur, failedAttempts: failed, updatedAt: now };
      });
      await audit(user.staffId, locked ? "account_locked" : "login_code_failed", user.staffId, undefined, now);
      return { ok: false, reason: "invalid" };
    }
    if (byApp.ok) usedStep = byApp.step;
  }

  const updated = await getStore().update<UserRecord>("users", user.staffId, (cur) =>
    cur
      ? {
          ...cur,
          failedAttempts: 0,
          lockedUntil: null,
          lastLoginAt: now,
          updatedAt: now,
          ...(cur.totp?.enabled ? { totp: { ...cur.totp, lastStep: usedStep ?? cur.totp.lastStep, recovery: recoveryLeft ?? cur.totp.recovery } } : {}),
        }
      : null,
  );
  if (recoveryLeft !== null) await audit(user.staffId, "login_recovery_code_used", user.staffId, { left: recoveryLeft.length }, now);
  if (!updated) return { ok: false, reason: "invalid" };
  // A fresh session on every login (no session fixation).
  const session = await createSession(updated.staffId, cfg, now);
  await audit(updated.staffId, "login", updated.staffId, undefined, now);
  return { ok: true, user: toDTO(updated), token: session.token, expiresAt: session.expiresAt };
}

/** Resolve the user for a session token, or null. Disabled accounts lose access immediately. */
export async function userFromToken(token: string | undefined, now: number = Date.now()): Promise<UserDTO | null> {
  const cfg = await getConfig("auth");
  const s = await validateSession(token, cfg, now);
  if (!s) return null;
  const u = await getUser(s.userId);
  if (!u || u.status !== "active") return null;
  return toDTO(u);
}

export type ChangePasswordResult =
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; error: string };

export async function changePassword(
  staffId: string,
  input: { current: unknown; next: unknown; confirm: unknown },
  now: number = Date.now(),
): Promise<ChangePasswordResult> {
  const gate = await rateLimit(`chpw:${staffId}`, 10, 15 * 60_000, now);
  if (!gate.allowed) return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };

  const user = await getUser(staffId);
  if (!user || user.status !== "active") return { ok: false, error: "Could not change the password." };
  if (typeof input.current !== "string" || typeof input.next !== "string" || typeof input.confirm !== "string") {
    return { ok: false, error: "Fill in all the fields." };
  }
  if (input.current.length > MAX_PASSWORD_LENGTH) return { ok: false, error: "Your current password is not correct." };
  if (!(await verifyUserPassword(user, input.current))) {
    await audit(staffId, "password_change_failed", staffId, undefined, now);
    return { ok: false, error: "Your current password is not correct." };
  }
  if (input.next !== input.confirm) return { ok: false, error: "The new passwords do not match." };
  if (input.next === input.current) return { ok: false, error: "Choose a password different from your current one." };

  const cfg = await getConfig("auth");
  const problem = checkPasswordPolicy(input.next, cfg, user);
  if (problem) return { ok: false, error: problem };

  const hash = await hashPassword(input.next);
  await getStore().update<UserRecord>("users", staffId, (cur) =>
    cur ? { ...cur, passwordHash: hash, mustChangePassword: false, failedAttempts: 0, lockedUntil: null, passwordChangedAt: now, updatedAt: now } : null,
  );
  // Sign out everywhere, then issue a fresh session for this device.
  await destroyUserSessions(staffId);
  const session = await createSession(staffId, cfg, now);
  await audit(staffId, "password_changed", staffId, undefined, now);
  return { ok: true, token: session.token, expiresAt: session.expiresAt };
}
