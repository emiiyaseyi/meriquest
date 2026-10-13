import "server-only";
import { createHash } from "node:crypto";
import { getStore } from "../store";

interface Bucket {
  id: string;
  count: number;
  resetAt: number;
}

export interface RateResult {
  allowed: boolean;
  retryAfterSec: number;
}

/** Fixed-window limiter persisted in the store so it survives restarts. Keys are hashed (no PII at rest). */
export async function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): Promise<RateResult> {
  const id = createHash("sha256").update(key).digest("hex").slice(0, 32);
  let allowed = true;
  let resetAt = now + windowMs;
  await getStore().update<Bucket>("ratelimits", id, (cur) => {
    const b: Bucket = cur && cur.resetAt > now ? { ...cur } : { id, count: 0, resetAt: now + windowMs };
    b.count += 1;
    allowed = b.count <= limit;
    resetAt = b.resetAt;
    return b;
  });
  // Occasionally clear expired buckets so the collection cannot grow without bound.
  if (Math.random() < 0.02) await pruneExpired(now);
  return { allowed, retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

export async function pruneExpired(now: number = Date.now()): Promise<number> {
  const store = getStore();
  let removed = 0;
  try {
    for (const b of await store.list<Bucket>("ratelimits")) {
      if (b.resetAt <= now) {
        await store.delete("ratelimits", b.id);
        removed++;
      }
    }
  } catch {
    // Best effort: a failed cleanup must never block a login.
  }
  return removed;
}
