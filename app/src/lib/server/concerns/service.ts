import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { rateLimit } from "../auth/ratelimit";
import type { UserDTO } from "../types";
import { getOrCreatePlayer } from "../world/service";
import { getScene } from "@/lib/world/scenes";
import {
  CONCERN_STATUSES,
  HARD_MAX_FILES,
  HARD_MAX_FILE_BYTES,
  MAX_ABOUT,
  MAX_DESCRIPTION,
  MAX_NOTE,
  cleanText,
  safeFileName,
  sniffEvidence,
  type ConcernRecord,
  type ConcernStatus,
  type EvidenceMeta,
} from "@/lib/concerns";

/**
 * Conduct concerns. Any signed-in person can send one; only admins can read them all. Evidence files are kept
 * apart from the report (so lists stay light), checked by their real contents, and only ever handed back to
 * an admin as a download.
 */
export interface EvidenceInput {
  name: string;
  bytes: Uint8Array;
  lastModified: number | null;
}

export interface ConcernInput {
  category: unknown;
  description: unknown;
  about: unknown;
  occurredAt: unknown;
  files: EvidenceInput[];
}

export type SubmitResult = { ok: true; number: string; id: string } | { ok: false; error: string };

interface FileDoc {
  id: string;
  concernId: string;
  n: number;
  type: string;
  data: string; // base64
}

const DAY = 24 * 60 * 60 * 1000;

export async function submitConcern(user: Pick<UserDTO, "staffId" | "name" | "unit" | "role">, input: ConcernInput, now: number = Date.now()): Promise<SubmitResult> {
  const cfg = await getConfig("concerns");
  const category = typeof input.category === "string" ? cfg.categories.find((c) => c.id === input.category) : undefined;
  if (!category) return { ok: false, error: "Please choose what kind of concern this is." };
  const description = cleanText(input.description, MAX_DESCRIPTION);
  if (description.length < 20) return { ok: false, error: "Please describe what happened in a few sentences (at least 20 characters)." };
  const about = cleanText(input.about, MAX_ABOUT).replace(/\n/g, " ");

  const when = typeof input.occurredAt === "number" ? input.occurredAt : typeof input.occurredAt === "string" ? Date.parse(input.occurredAt) : NaN;
  if (!Number.isFinite(when) || when > now + 5 * 60_000 || when < now - 365 * DAY) return { ok: false, error: "Please give a time that has already passed, within the last year." };

  const maxFiles = Math.min(cfg.maxFiles, HARD_MAX_FILES);
  const maxBytes = Math.min(cfg.maxFileMb * 1024 * 1024, HARD_MAX_FILE_BYTES);
  if (input.files.length > maxFiles) return { ok: false, error: `You can attach up to ${maxFiles} files.` };
  const checked: { meta: Omit<EvidenceMeta, "n" | "addedAt">; b64: string }[] = [];
  for (const f of input.files) {
    if (f.bytes.length === 0) return { ok: false, error: "One of the files is empty." };
    if (f.bytes.length > maxBytes) return { ok: false, error: `Each file must be ${cfg.maxFileMb} MB or smaller.` };
    const type = sniffEvidence(f.bytes);
    if (!type) return { ok: false, error: "Evidence must be a PNG, JPEG or WebP picture, or a PDF." };
    checked.push({
      meta: {
        name: safeFileName(f.name),
        type,
        size: f.bytes.length,
        sha256: createHash("sha256").update(f.bytes).digest("hex"),
        fileModifiedAt: f.lastModified !== null && Number.isFinite(f.lastModified) && f.lastModified > 0 && f.lastModified <= now + DAY ? Math.floor(f.lastModified) : null,
      },
      b64: Buffer.from(f.bytes).toString("base64"),
    });
  }

  const limited = await rateLimit(`concern:${user.staffId}`, cfg.maxPerDay, DAY, now);
  if (!limited.allowed) return { ok: false, error: "You have sent several concerns today. Please wait, or speak to HR directly if it is urgent." };

  const store = getStore();
  const counter = await store.update<{ id: string; n: number }>("counters", "concerns", (cur) => ({ id: "concerns", n: (cur?.n ?? 0) + 1 }));
  const number = `CR-${String(counter?.n ?? 1).padStart(4, "0")}`;
  const id = `c_${randomBytes(9).toString("hex")}`;
  const player = await getOrCreatePlayer(user, now);
  const evidence: EvidenceMeta[] = checked.map((c, i) => ({ ...c.meta, n: i + 1, addedAt: now }));
  const record: ConcernRecord = {
    id,
    number,
    reporterId: user.staffId,
    reporterName: user.name,
    aboutName: about,
    category: category.label,
    description,
    occurredAt: Math.floor(when),
    submittedAt: now,
    context: { scene: getScene(player.scene)?.name ?? "Unknown" },
    evidence,
    status: "new",
    notes: [],
    updatedAt: now,
  };
  for (const [i, c] of checked.entries()) {
    await store.put("concern_files", `${id}:${i + 1}`, { id: `${id}:${i + 1}`, concernId: id, n: i + 1, type: c.meta.type, data: c.b64 } satisfies FileDoc);
  }
  await store.put("concerns", id, record);
  await audit(user.staffId, "concern.submitted", number, { category: category.id, files: evidence.length }, now);
  return { ok: true, number, id };
}

/** What a reporter may see about their own concerns: reference, kind, time and status. Nothing about the review. */
export interface MyConcern {
  number: string;
  category: string;
  submittedAt: number;
  status: ConcernStatus;
}

export async function listMyConcerns(user: Pick<UserDTO, "staffId">): Promise<MyConcern[]> {
  const all = await getStore().list<ConcernRecord>("concerns");
  return all
    .filter((c) => c.reporterId === user.staffId)
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .slice(0, 50)
    .map((c) => ({ number: c.number, category: c.category, submittedAt: c.submittedAt, status: c.status }));
}

function assertAdmin(actor: Pick<UserDTO, "role">): void {
  if (actor.role !== "admin") throw new Error("Forbidden");
}

export async function listConcerns(actor: Pick<UserDTO, "staffId" | "role">): Promise<ConcernRecord[]> {
  assertAdmin(actor);
  const all = await getStore().list<ConcernRecord>("concerns");
  return all.sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function countNewConcerns(actor: Pick<UserDTO, "role">): Promise<number> {
  assertAdmin(actor);
  return (await getStore().list<ConcernRecord>("concerns")).filter((c) => c.status === "new").length;
}

export async function getConcern(actor: Pick<UserDTO, "staffId" | "role">, id: string): Promise<ConcernRecord | null> {
  assertAdmin(actor);
  if (!/^c_[0-9a-f]{18}$/.test(id)) return null;
  return getStore().get<ConcernRecord>("concerns", id);
}

export type AdminResult = { ok: true } | { ok: false; error: string };

export async function updateConcern(actor: Pick<UserDTO, "staffId" | "role" | "name">, id: string, status: unknown, note: unknown, now: number = Date.now()): Promise<AdminResult> {
  assertAdmin(actor);
  if (!/^c_[0-9a-f]{18}$/.test(id)) return { ok: false, error: "That concern does not exist." };
  const newStatus = typeof status === "string" && (CONCERN_STATUSES as readonly string[]).includes(status) ? (status as ConcernStatus) : null;
  if (!newStatus) return { ok: false, error: "Please choose a status." };
  const text = cleanText(note, MAX_NOTE);
  let found = false;
  let changed = false;
  await getStore().update<ConcernRecord>("concerns", id, (cur) => {
    if (!cur) return cur;
    found = true;
    changed = cur.status !== newStatus;
    const notes = text ? [...cur.notes, { at: now, by: actor.staffId, text }] : cur.notes;
    return { ...cur, status: newStatus, notes, updatedAt: now };
  });
  if (!found) return { ok: false, error: "That concern does not exist." };
  await audit(actor.staffId, "concern.updated", id, { status: newStatus, statusChanged: changed, noted: text.length > 0 }, now);
  return { ok: true };
}

export async function getEvidenceFile(actor: Pick<UserDTO, "staffId" | "role">, id: string, n: number, now: number = Date.now()): Promise<{ type: string; bytes: Buffer; name: string } | null> {
  assertAdmin(actor);
  if (!/^c_[0-9a-f]{18}$/.test(id) || !Number.isInteger(n) || n < 1 || n > HARD_MAX_FILES) return null;
  const concern = await getStore().get<ConcernRecord>("concerns", id);
  const meta = concern?.evidence.find((e) => e.n === n);
  const doc = await getStore().get<FileDoc>("concern_files", `${id}:${n}`);
  if (!concern || !meta || !doc) return null;
  const bytes = Buffer.from(doc.data, "base64");
  // Re-check the contents against what was recorded when it arrived
  if (createHash("sha256").update(bytes).digest("hex") !== meta.sha256) return null;
  await audit(actor.staffId, "concern.evidence.viewed", concern.number, { file: n }, now);
  return { type: meta.type, bytes, name: meta.name };
}
