import "server-only";
import { getEnv } from "../env";

/**
 * Virus scanning for uploaded files. The scanner is a separate service (for example a small ClamAV wrapper) reached over
 * HTTPS: EVIDENCE_SCANNER_URL receives the file as the request body and answers {"infected": true|false, "signature": "..."}.
 *
 *   clean       the scanner looked and found nothing
 *   infected    the scanner found something: the file is refused
 *   pending     no scanner could be reached (or none is set in production): the file is kept but admins cannot open it
 *               until a later scan says it is clean
 *   skipped     development and tests only, where no scanner is set
 */
export type ScanStatus = "clean" | "infected" | "pending" | "skipped";

export async function scanFile(bytes: Buffer): Promise<{ status: ScanStatus; detail?: string }> {
  const env = getEnv();
  if (!env.EVIDENCE_SCANNER_URL) return env.NODE_ENV === "production" ? { status: "pending", detail: "no scanner is set up" } : { status: "skipped" };
  try {
    const res = await fetch(env.EVIDENCE_SCANNER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", ...(env.EVIDENCE_SCANNER_TOKEN ? { Authorization: `Bearer ${env.EVIDENCE_SCANNER_TOKEN}` } : {}) },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { status: "pending", detail: `scanner answered ${res.status}` };
    const body = (await res.json()) as { infected?: unknown; signature?: unknown };
    if (body.infected === true) return { status: "infected", detail: typeof body.signature === "string" ? body.signature.slice(0, 80) : undefined };
    if (body.infected === false) return { status: "clean" };
    return { status: "pending", detail: "the scanner gave an answer we could not read" };
  } catch {
    return { status: "pending", detail: "the scanner could not be reached" };
  }
}
