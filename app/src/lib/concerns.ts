/**
 * Conduct concerns: shared types and the rules for evidence files. Safe on the server and in the browser.
 * A concern is a report about behaviour (harassment, bullying, unsafe conduct...) that goes to the admin team.
 */
export type ConcernStatus = "new" | "in_review" | "resolved" | "dismissed";
export const CONCERN_STATUSES: readonly ConcernStatus[] = ["new", "in_review", "resolved", "dismissed"];
export const STATUS_LABEL: Record<ConcernStatus, string> = { new: "New", in_review: "In review", resolved: "Resolved", dismissed: "Dismissed" };

export const MAX_DESCRIPTION = 3000;
export const MAX_NOTE = 2000;
export const MAX_ABOUT = 80;
/** Hard limits that settings can lower but never raise. */
export const HARD_MAX_FILES = 3;
export const HARD_MAX_FILE_BYTES = 2 * 1024 * 1024;

export type EvidenceType = "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
export const EXTENSION: Record<EvidenceType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf" };

/** What a file really is, from its first bytes (the browser's claimed type and the file name are not trusted). */
export function sniffEvidence(b: Uint8Array): EvidenceType | null {
  const at = (i: number) => b[i];
  if (b.length >= 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) return "image/png";
  if (b.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (b.length >= 12 && at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return "image/webp";
  if (b.length >= 5 && at(0) === 0x25 && at(1) === 0x50 && at(2) === 0x44 && at(3) === 0x46 && at(4) === 0x2d) return "application/pdf";
  return null;
}

/** A file name safe to show and store: letters, digits, spaces, dots, dashes and underscores only. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9 ._-]/g, "").replace(/\.{2,}/g, ".").trim().slice(0, 60);
  return /[A-Za-z0-9]/.test(cleaned) ? cleaned : "evidence";
}

/** Text from a form: control characters removed (new lines kept), trimmed and length-limited. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?/g, "\n").trim().slice(0, max);
}

export interface EvidenceMeta {
  n: number;
  name: string;
  type: EvidenceType;
  size: number;
  /** SHA-256 of the file, so any later change to it is detectable. */
  sha256: string;
  /** When the file says it was last changed, as reported by the person's device (not verified). */
  fileModifiedAt: number | null;
  /** When the server received it. */
  addedAt: number;
}

export interface ConcernNote {
  at: number;
  by: string;
  text: string;
}

export interface ConcernRecord {
  id: string;
  number: string; // CR-0001
  reporterId: string;
  reporterName: string;
  /** Who it is about, as the reporter described them (optional). */
  aboutName: string;
  category: string;
  description: string;
  /** When the reporter says it happened. */
  occurredAt: number;
  /** When the server received the report. */
  submittedAt: number;
  /** Where the reporter was in the game when they sent it. */
  context: { scene: string };
  evidence: EvidenceMeta[];
  status: ConcernStatus;
  notes: ConcernNote[];
  updatedAt: number;
}
