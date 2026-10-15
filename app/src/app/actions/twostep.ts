"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { requireUser } from "@/lib/server/auth/dal";
import { beginSetup, confirmSetup, disableTwoStep } from "@/lib/server/auth/twostep";

export interface TwoStepState {
  error?: string;
  ok?: string;
  secret?: string;
  url?: string;
  /** The setup link drawn as a QR code (an SVG picture), made on the server so nothing is sent to an outside service. */
  qr?: string;
  recoveryCodes?: string[];
}

/* Every action re-checks who is asking. */

export async function beginTwoStepAction(): Promise<TwoStepState> {
  const user = await requireUser();
  const r = await beginSetup(user.staffId);
  if (!r.ok) return { error: r.error };
  const qr = await QRCode.toString(r.url, { type: "svg", margin: 4, width: 288, errorCorrectionLevel: "M" });
  return { secret: r.secret, url: r.url, qr };
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
