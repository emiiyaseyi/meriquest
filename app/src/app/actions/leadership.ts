"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { answerLead, getLead, startLead, type LeadResult, type LeadView } from "@/lib/server/leadership/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function getLeadAction(): Promise<LeadView> {
  const user = await requireUser();
  return getLead(user);
}

export async function startLeadAction(): Promise<LeadResult> {
  const user = await requireUser();
  return startLead(user);
}

export async function answerLeadAction(shown: number): Promise<LeadResult> {
  const user = await requireUser();
  return answerLead(user, shown);
}
