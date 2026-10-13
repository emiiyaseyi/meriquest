"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth/dal";
import { getConfig } from "@/lib/server/config/registry";
import { submitPlacement } from "@/lib/server/placement/service";
import { playBeat } from "@/lib/server/workfirst/service";
import { closedTitle, type Activity, type Decision } from "@/lib/workfirst";

export interface PlacementFormState {
  error?: string;
}

/** The form sends only chosen option ids. The path, scores and retake permission are decided on the server. */
export async function submitPlacementAction(_prev: PlacementFormState, formData: FormData): Promise<PlacementFormState> {
  const user = await requireUser();
  const cfg = await getConfig("placement");
  const answers: Record<string, string> = {};
  for (const q of cfg.questions) {
    const v = formData.get(q.id);
    if (typeof v === "string") answers[q.id] = v;
  }
  const result = await submitPlacement(user, answers, formData.get("note"));
  if (!result.ok) return { error: result.error };
  redirect("/");
}

export interface BeatResult {
  allowed: boolean;
  code: string;
  title: string;
  resumeAt?: number;
  message: string;
  remainingSeconds: number | null;
  nudge: boolean;
  weeklySoftCapReached: boolean;
}

/** Heartbeat from the game while the player is active. Returns only what the UI needs. */
export async function playBeatAction(activity: string): Promise<BeatResult> {
  const user = await requireUser();
  const act: Activity = activity === "learning" ? "learning" : "world";
  const d: Decision = await playBeat(user, act);
  return { allowed: d.allowed, code: d.code, title: closedTitle(d.code), resumeAt: d.resumeAt, message: d.message, remainingSeconds: d.remainingSeconds, nudge: d.nudge, weeklySoftCapReached: d.weeklySoftCapReached };
}
