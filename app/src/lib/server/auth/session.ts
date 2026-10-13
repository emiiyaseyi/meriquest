import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getStore } from "../store";

/**
 * Opaque server-side sessions. The cookie holds a random 256-bit token; only its SHA-256 hash is
 * stored, so a leaked data file cannot be replayed as a login. Sessions can be revoked
 * individually or for a whole user ("sign out on all devices", PRD P-1).
 */
interface SessionRecord {
  id: string; // sha256(token) hex
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const TOUCH_EVERY_MS = 60_000;

export async function createSession(
  userId: string,
  opts: { sessionHours: number },
  now: number = Date.now(),
): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = now + opts.sessionHours * 3_600_000;
  const rec: SessionRecord = { id: hashToken(token), userId, createdAt: now, expiresAt, lastSeenAt: now };
  await getStore().put("sessions", rec.id, rec);
  return { token, expiresAt };
}

/** Returns the user id for a valid, unexpired, non-idle session; otherwise null (and removes dead sessions). */
export async function validateSession(
  token: string | undefined,
  opts: { idleMinutes: number },
  now: number = Date.now(),
): Promise<{ userId: string } | null> {
  if (!token || !TOKEN_RE.test(token)) return null;
  const id = hashToken(token);
  const store = getStore();
  const rec = await store.get<SessionRecord>("sessions", id);
  if (!rec) return null;
  const idleLimit = opts.idleMinutes * 60_000;
  if (rec.expiresAt <= now || now - rec.lastSeenAt > idleLimit) {
    await store.delete("sessions", id);
    return null;
  }
  if (now - rec.lastSeenAt > TOUCH_EVERY_MS) {
    await store.update<SessionRecord>("sessions", id, (cur) => (cur ? { ...cur, lastSeenAt: now } : null));
  }
  return { userId: rec.userId };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token || !TOKEN_RE.test(token)) return;
  await getStore().delete("sessions", hashToken(token));
}

export async function destroyUserSessions(userId: string): Promise<number> {
  const store = getStore();
  let n = 0;
  for (const s of await store.list<SessionRecord>("sessions")) {
    if (s.userId === userId) {
      await store.delete("sessions", s.id);
      n++;
    }
  }
  return n;
}
