import "server-only";
import { getStore } from "../store";
import type { UserRecord } from "../types";

export interface IdentifierRules {
  allowedEmailDomains: string[];
  staffIdPrefix: string;
  staffIdDigits: number;
}

export type ParsedIdentifier = { kind: "staff"; staffId: string } | { kind: "email"; email: string };

/**
 * Accepts a staff ID (PREFIX + N digits) or a work email on an allowed domain. Anything else
 * returns null so malformed input never reaches storage.
 */
export function parseIdentifier(raw: unknown, rules: IdentifierRules): ParsedIdentifier | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (v.length < 3 || v.length > 120) return null;
  if (v.includes("@")) {
    const email = v.toLowerCase();
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
    const domain = email.split("@")[1];
    return rules.allowedEmailDomains.includes(domain) ? { kind: "email", email } : null;
  }
  // The prefix is validated as [A-Z]{1,6} by the config schema, so building a regex from it is safe.
  const re = new RegExp(`^${rules.staffIdPrefix}\\d{${rules.staffIdDigits}}$`, "i");
  return re.test(v) ? { kind: "staff", staffId: v.toUpperCase() } : null;
}

/** True while an account's lockout is in force. */
export function isLocked(u: Pick<UserRecord, "lockedUntil">, now: number = Date.now()): boolean {
  return u.lockedUntil !== null && u.lockedUntil > now;
}

export function getUser(staffId: string): Promise<UserRecord | null> {
  return getStore().get<UserRecord>("users", staffId.toUpperCase());
}

export async function listUsers(): Promise<UserRecord[]> {
  const all = await getStore().list<UserRecord>("users");
  return all.sort((a, b) => a.staffId.localeCompare(b.staffId));
}

export async function findUser(id: ParsedIdentifier): Promise<UserRecord | null> {
  if (id.kind === "staff") return getUser(id.staffId);
  return (await listUsers()).find((u) => u.email === id.email) ?? null;
}
