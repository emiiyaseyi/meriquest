import "server-only";
import { z } from "zod";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { assertAdmin } from "../auth/admin";
import { getUser } from "../auth/users";
import type { UserDTO } from "../types";
import { retakeDecision, scoreAnswers, type RetakeDecision } from "@/lib/placement";

export interface PlacementRecord {
  staffId: string;
  pathId: string;
  scores: Record<string, number>;
  answers: Record<string, string>;
  attempts: number;
  source: "questionnaire" | "admin";
  retakeLocked: boolean;
  history: { at: number; pathId: string; source: "questionnaire" | "admin" | "reset"; note?: string }[];
  updatedAt: number;
}

const MAX_HISTORY = 20;
const MAX_NOTE = 300;

export const getPlacement = (staffId: string) => getStore().get<PlacementRecord>("placements", staffId.toUpperCase());

export async function listPlacements(): Promise<PlacementRecord[]> {
  return (await getStore().list<PlacementRecord>("placements")).sort((a, b) => a.staffId.localeCompare(b.staffId));
}

export async function retakeStatus(user: UserDTO, placement: PlacementRecord | null): Promise<RetakeDecision> {
  const cfg = await getConfig("placement");
  return retakeDecision(cfg, { unit: user.unit, attempts: placement?.attempts ?? 0, retakeLocked: placement?.retakeLocked ?? false });
}

export type SubmitResult = { ok: true; pathId: string } | { ok: false; error: string };

/**
 * First placement, or a retake (a "dispute"). Everything is decided here on the server: the client
 * only sends answers, never a path, score or permission.
 */
export async function submitPlacement(user: UserDTO, rawAnswers: unknown, rawNote: unknown, now: number = Date.now()): Promise<SubmitResult> {
  const cfg = await getConfig("placement");
  if (!cfg.enabled) return { ok: false, error: "Placement is not switched on." };
  const note = typeof rawNote === "string" ? rawNote.trim().slice(0, MAX_NOTE) : "";

  const scored = scoreAnswers(cfg, rawAnswers, user.tenureYears);
  if (!scored.ok) return scored;

  let refusal: string | null = null;
  const saved = await getStore().update<PlacementRecord>("placements", user.staffId, (cur) => {
    if (cur) {
      const d = retakeDecision(cfg, { unit: user.unit, attempts: cur.attempts, retakeLocked: cur.retakeLocked });
      if (!d.allowed) {
        refusal = d.reason; // decided atomically against the stored record, so two tabs cannot exceed the limit
        return cur;
      }
    }
    const history = [...(cur?.history ?? []), { at: now, pathId: scored.pathId, source: "questionnaire" as const, ...(note ? { note } : {}) }];
    return {
      staffId: user.staffId,
      pathId: scored.pathId,
      scores: scored.scores,
      answers: scored.answers,
      attempts: (cur?.attempts ?? 0) + 1,
      source: "questionnaire",
      retakeLocked: cur?.retakeLocked ?? false,
      history: history.slice(-MAX_HISTORY),
      updatedAt: now,
    };
  });
  if (refusal) return { ok: false, error: refusal };
  const isRetake = (saved?.attempts ?? 1) > 1;
  await audit(user.staffId, isRetake ? "placement_retaken" : "placement_created", user.staffId, { pathId: scored.pathId, attempts: saved?.attempts ?? 1, disputed: isRetake && note.length > 0 });
  return { ok: true, pathId: scored.pathId };
}

/* ------------------------------- admin operations ------------------------------- */

export type AdminResult = { ok: true } | { ok: false; error: string };
const staffIdSchema = z.string().trim().min(3).max(20);

export async function adminSetPath(actor: UserDTO, staffId: string, pathId: string, now: number = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  const target = await getUser(staffIdSchema.parse(staffId));
  if (!target) return { ok: false, error: "Staff member not found" };
  const cfg = await getConfig("placement");
  if (!cfg.paths.some((p) => p.id === pathId)) return { ok: false, error: "Unknown path" };
  await getStore().update<PlacementRecord>("placements", target.staffId, (cur) => ({
    staffId: target.staffId,
    pathId,
    scores: cur?.scores ?? {},
    answers: cur?.answers ?? {},
    attempts: cur?.attempts ?? 0,
    source: "admin",
    retakeLocked: true, // an override must not be silently undone by a retake
    history: [...(cur?.history ?? []), { at: now, pathId, source: "admin" as const }].slice(-MAX_HISTORY),
    updatedAt: now,
  }));
  await audit(actor.staffId, "placement_overridden", target.staffId, { pathId }, now);
  return { ok: true };
}

export async function adminSetRetakeLock(actor: UserDTO, staffId: string, locked: boolean, now: number = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  const target = await getUser(staffIdSchema.parse(staffId));
  if (!target) return { ok: false, error: "Staff member not found" };
  const rec = await getStore().update<PlacementRecord>("placements", target.staffId, (cur) => (cur ? { ...cur, retakeLocked: locked === true, updatedAt: now } : null));
  if (!rec) return { ok: false, error: "This person has no placement yet" };
  await audit(actor.staffId, locked ? "placement_retake_locked" : "placement_retake_unlocked", target.staffId, undefined, now);
  return { ok: true };
}

/** Remove a placement so the person answers the questionnaire again (admin only). */
export async function adminResetPlacement(actor: UserDTO, staffId: string, now: number = Date.now()): Promise<AdminResult> {
  await assertAdmin(actor);
  const target = await getUser(staffIdSchema.parse(staffId));
  if (!target) return { ok: false, error: "Staff member not found" };
  await getStore().delete("placements", target.staffId);
  await audit(actor.staffId, "placement_reset", target.staffId, undefined, now);
  return { ok: true };
}
