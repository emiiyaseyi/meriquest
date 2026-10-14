import "server-only";
import { getStore } from "../store";
import { audit } from "../audit";
import { rateLimit } from "./ratelimit";
import { getUser } from "./users";
import { destroyUserSessions } from "./session";
import { verifyPassword, defaultPasswordMatches } from "./password";
import { newRecoveryCodes, newSecret, openSecret, otpauthUrl, sealSecret, totpAvailable, verifyCode } from "./totp";
import type { UserRecord } from "../types";

/** Setting up, confirming and removing two-step sign-in for the signed-in person. */
export type SetupResult = { ok: true; secret: string; url: string } | { ok: false; error: string };
export type ConfirmResult = { ok: true; recoveryCodes: string[] } | { ok: false; error: string };

const spaced = (s: string) => s.match(/.{1,4}/g)?.join(" ") ?? s;

export async function beginSetup(staffId: string, now: number = Date.now()): Promise<SetupResult> {
  if (!totpAvailable()) return { ok: false, error: "Two-step sign-in is not set up on this server yet. Ask the admin team." };
  const user = await getUser(staffId);
  if (!user || user.status !== "active") return { ok: false, error: "Not allowed." };
  if (user.totp?.enabled) return { ok: false, error: "Two-step sign-in is already on." };
  const secret = newSecret();
  await getStore().update<UserRecord>("users", staffId, (cur) => (cur ? { ...cur, totp: { secret: sealSecret(secret), enabled: false, lastStep: -1, recovery: [] }, updatedAt: now } : cur));
  await audit(staffId, "twostep_setup_started", staffId, undefined, now);
  return { ok: true, secret: spaced(secret), url: otpauthUrl(secret, user.email) };
}

export async function confirmSetup(staffId: string, code: unknown, now: number = Date.now()): Promise<ConfirmResult> {
  const gate = await rateLimit(`totp-setup:${staffId}`, 8, 10 * 60_000, now);
  if (!gate.allowed) return { ok: false, error: "Too many tries. Please wait a few minutes." };
  const user = await getUser(staffId);
  if (!user?.totp || user.totp.enabled) return { ok: false, error: "Start the set-up first." };
  const secret = openSecret(user.totp.secret);
  const v = secret ? verifyCode(secret, code, now, -1) : ({ ok: false } as const);
  if (!v.ok) return { ok: false, error: "That code is not right. Check the time on your phone and try the next code." };
  const rec = newRecoveryCodes();
  await getStore().update<UserRecord>("users", staffId, (cur) => (cur?.totp ? { ...cur, totp: { ...cur.totp, enabled: true, lastStep: v.step, recovery: rec.hashes }, updatedAt: now } : cur));
  await audit(staffId, "twostep_enabled", staffId, undefined, now);
  return { ok: true, recoveryCodes: rec.codes };
}

/** Turning it off needs the password and a current code, so a borrowed signed-in screen cannot remove it. */
export async function disableTwoStep(staffId: string, password: unknown, code: unknown, now: number = Date.now()): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await rateLimit(`totp-off:${staffId}`, 6, 10 * 60_000, now);
  if (!gate.allowed) return { ok: false, error: "Too many tries. Please wait a few minutes." };
  const user = await getUser(staffId);
  if (!user?.totp?.enabled) return { ok: false, error: "Two-step sign-in is not on." };
  if (typeof password !== "string" || password.length > 128) return { ok: false, error: "Your password is not right." };
  const pwOk = user.passwordHash === null ? await defaultPasswordMatches(password) : await verifyPassword(password, user.passwordHash);
  const secret = openSecret(user.totp.secret);
  const v = secret ? verifyCode(secret, code, now, user.totp.lastStep) : ({ ok: false } as const);
  if (!pwOk || !v.ok) {
    await audit(staffId, "twostep_disable_failed", staffId, undefined, now);
    return { ok: false, error: "The password or the code is not right." };
  }
  await getStore().update<UserRecord>("users", staffId, (cur) => {
    if (!cur) return cur;
    const { totp: _t, ...rest } = cur;
    void _t;
    return { ...rest, updatedAt: now } as UserRecord;
  });
  await destroyUserSessions(staffId);
  await audit(staffId, "twostep_disabled", staffId, undefined, now);
  return { ok: true };
}

/** An admin can switch a person's two-step sign-in off if they have lost their phone and recovery codes. */
export async function adminResetTwoStep(targetId: string, actorId: string, now: number = Date.now()): Promise<void> {
  await getStore().update<UserRecord>("users", targetId, (cur) => {
    if (!cur) return cur;
    const { totp: _t, ...rest } = cur;
    void _t;
    return { ...rest, updatedAt: now } as UserRecord;
  });
  await destroyUserSessions(targetId);
  await audit(actorId, "twostep_reset_by_admin", targetId, undefined, now);
}
