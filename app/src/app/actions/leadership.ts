"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { answerSim, getSim, startSim, type LeadResult, type LeadView, type SimKind } from "@/lib/server/leadership/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

const kindOf = (k: unknown): SimKind => (k === "clientsim" ? "clientsim" : "leadership");

export async function getLeadAction(kind: string = "leadership"): Promise<LeadView> {
  const user = await requireUser();
  return getSim(user, kindOf(kind));
}

export async function startLeadAction(kind: string = "leadership"): Promise<LeadResult> {
  const user = await requireUser();
  return startSim(user, kindOf(kind));
}

export async function answerLeadAction(shown: number, kind: string = "leadership"): Promise<LeadResult> {
  const user = await requireUser();
  return answerSim(user, kindOf(kind), shown);
}
