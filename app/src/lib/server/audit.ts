import "server-only";
import { randomBytes } from "node:crypto";
import { getStore } from "./store";

/**
 * Append-only audit log of admin and security events (PRD A-6c, RULEBOOK §5.1 item 9).
 * Never put passwords, tokens or other secrets in `detail`.
 */
export interface AuditEvent {
  id: string;
  at: number;
  actor: string; // staff ID, or "anonymous" / "system"
  action: string;
  target?: string;
  detail?: Record<string, string | number | boolean | null>;
}

const MAX_DETAIL_LEN = 300;

function clean(detail: AuditEvent["detail"]): AuditEvent["detail"] {
  if (!detail) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(detail).slice(0, 20)) {
    out[k.slice(0, 40)] = typeof v === "string" ? v.slice(0, MAX_DETAIL_LEN) : v;
  }
  return out;
}

export async function audit(
  actor: string,
  action: string,
  target?: string,
  detail?: AuditEvent["detail"],
  now: number = Date.now(),
): Promise<void> {
  // Sortable, unique id: zero-padded time + random suffix.
  const id = `${String(now).padStart(15, "0")}-${randomBytes(4).toString("hex")}`;
  const event: AuditEvent = { id, at: now, actor: actor.slice(0, 40), action: action.slice(0, 60), target: target?.slice(0, 80), detail: clean(detail) };
  try {
    await getStore().put("audit", id, event);
  } catch {
    // Auditing must never take the app down, but the failure must be visible to operators.
    console.error("[audit] failed to write event", action);
  }
}

export async function recentAudit(limit = 200): Promise<AuditEvent[]> {
  const all = await getStore().list<AuditEvent>("audit");
  return all.sort((a, b) => b.at - a.at).slice(0, Math.min(Math.max(limit, 1), 1000));
}
