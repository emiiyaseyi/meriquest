import "server-only";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { getEnv } from "../env";

/**
 * Passwords are SHA-256 pre-hashed (base64) and then bcrypt-hashed. The pre-hash removes
 * bcrypt's 72-byte truncation so long passphrases are fully used.
 */
const preHash = (pw: string) => createHash("sha256").update(pw, "utf8").digest("base64");

const cost = () => (getEnv().NODE_ENV === "test" ? 4 : 12);

export const MAX_PASSWORD_LENGTH = 128;

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(preHash(pw), cost());
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(preHash(pw), hash);
}

let dummyHash: string | null = null;

/** Burn the same CPU as a real check so response time does not reveal whether an account exists. */
export async function dummyVerify(pw: string): Promise<void> {
  dummyHash ??= await bcrypt.hash("not-a-real-password", cost());
  await bcrypt.compare(preHash(pw), dummyHash);
}

/** Constant-time comparison against the server-side default password (env only). */
export function defaultPasswordMatches(pw: string): boolean {
  const def = getEnv().DEFAULT_PASSWORD;
  if (!def) return false;
  const a = createHash("sha256").update(pw, "utf8").digest();
  const b = createHash("sha256").update(def, "utf8").digest();
  return timingSafeEqual(a, b);
}

export interface PasswordPolicy {
  passwordMinLength: number;
  passwordNeedLetter: boolean;
  passwordNeedNumber: boolean;
  passwordNeedSymbol: boolean;
}

const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwertyuiop", "qwerty123", "letmein123", "welcome123", "iloveyou1", "admin12345", "meristem123",
]);

/** Returns a user-facing problem, or null when the password is acceptable. */
export function checkPasswordPolicy(
  pw: string,
  policy: PasswordPolicy,
  who: { staffId: string; email: string },
): string | null {
  if (typeof pw !== "string") return "Enter a password";
  if (pw.length < policy.passwordMinLength) return `Use at least ${policy.passwordMinLength} characters`;
  if (pw.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters`;
  if (policy.passwordNeedLetter && !/[A-Za-z]/.test(pw)) return "Include a letter";
  if (policy.passwordNeedNumber && !/\d/.test(pw)) return "Include a number";
  if (policy.passwordNeedSymbol && !/[^A-Za-z0-9]/.test(pw)) return "Include a symbol";
  const lower = pw.toLowerCase();
  if (COMMON.has(lower)) return "That password is too common";
  if (defaultPasswordMatches(pw)) return "Choose a password different from the default one";
  if (lower === who.staffId.toLowerCase() || lower === who.email.toLowerCase() || lower === who.email.split("@")[0].toLowerCase()) {
    return "Your password cannot be your ID or email";
  }
  return null;
}
