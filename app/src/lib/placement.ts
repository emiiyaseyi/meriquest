import type { z } from "zod";
import type { placementSchema } from "@/lib/server/config/definitions";

/**
 * Pure placement scoring (no I/O, safe to unit test). Luck plays no part: the same answers and
 * directory data always give the same path.
 */
export type PlacementConfig = z.infer<typeof placementSchema>;

export type AnswerMap = Record<string, string>;

export type ScoreResult =
  | { ok: true; pathId: string; scores: Record<string, number>; answers: AnswerMap }
  | { ok: false; error: string };

/** Validate raw answers strictly: one valid option per question, nothing extra. */
export function scoreAnswers(cfg: PlacementConfig, rawAnswers: unknown, tenureYears: number): ScoreResult {
  if (rawAnswers === null || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) return { ok: false, error: "Answer every question." };
  const input = rawAnswers as Record<string, unknown>;
  const known = new Set(cfg.questions.map((q) => q.id));
  for (const k of Object.keys(input)) if (!known.has(k)) return { ok: false, error: "Unexpected answer." };

  const scores: Record<string, number> = Object.fromEntries(cfg.paths.map((p) => [p.id, 0]));
  const answers: AnswerMap = {};
  for (const q of cfg.questions) {
    const v = Object.prototype.hasOwnProperty.call(input, q.id) ? input[q.id] : undefined;
    if (typeof v !== "string") return { ok: false, error: "Answer every question." };
    const option = q.options.find((o) => o.id === v);
    if (!option) return { ok: false, error: "One of the answers is not valid." };
    answers[q.id] = option.id;
    for (const [pid, pts] of Object.entries(option.scores)) if (pid in scores) scores[pid] += pts;
  }
  if (Number.isFinite(tenureYears)) {
    for (const h of cfg.hints) {
      if (tenureYears >= h.minYears && tenureYears <= h.maxYears && h.pathId in scores) scores[h.pathId] += h.bonus;
    }
  }
  // Highest score wins. Ties go to the path listed first, so the result is deterministic.
  let best = cfg.paths[0].id;
  for (const p of cfg.paths) if (scores[p.id] > scores[best]) best = p.id;
  return { ok: true, pathId: best, scores, answers };
}

export interface RetakeContext {
  unit: string;
  attempts: number; // questionnaire submissions so far
  retakeLocked: boolean; // per-person admin lock (also set by an admin override)
}

export type RetakeDecision = { allowed: true; retakesLeft: number } | { allowed: false; reason: string };

export function retakeDecision(cfg: PlacementConfig, ctx: RetakeContext): RetakeDecision {
  if (!cfg.retakeEnabled) return { allowed: false, reason: "Retaking is turned off." };
  if (cfg.retakeDisabledUnits.includes(ctx.unit)) return { allowed: false, reason: "Retaking is turned off for your unit." };
  if (ctx.retakeLocked) return { allowed: false, reason: "Your placement has been set by an administrator." };
  const used = Math.max(0, ctx.attempts - 1);
  if (used >= cfg.maxRetakes) return { allowed: false, reason: "You have used all your retakes." };
  return { allowed: true, retakesLeft: cfg.maxRetakes - used };
}
