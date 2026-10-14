"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth/dal";
import { beginSetup, confirmSetup, disableTwoStep } from "@/lib/server/auth/twostep";

export interface TwoStepState {
  error?: string;
  ok?: string;
  secret?: string;
  url?: string;
  recoveryCodes?: string[];
}

/* Every action re-checks who is asking. */

export async function beginTwoStepAction(): Promise<TwoStepState> {
  const user = await requireUser();
  const r = await beginSetup(user.staffId);
  return r.ok ? { secret: r.secret, url: r.url } : { error: r.error };
}

export async function confirmTwoStepAction(_p: TwoStepState, fd: FormData): Promise<TwoStepState> {
  const user = await requireUser();
  // No page refresh here: the recovery codes are shown once, on this screen, and a refresh would replace it
  const r = await confirmSetup(user.staffId, fd.get("code"));
  return r.ok ? { ok: "Two-step sign-in is on.", recoveryCodes: r.recoveryCodes } : { error: r.error };
}

export async function disableTwoStepAction(_p: TwoStepState, fd: FormData): Promise<TwoStepState> {
  const user = await requireUser();
  const r = await disableTwoStep(user.staffId, fd.get("password"), fd.get("code"));
  revalidatePath("/account/security");
  return r.ok ? { ok: "Two-step sign-in is off. You have been signed out everywhere; sign in again." } : { error: r.error };
}
