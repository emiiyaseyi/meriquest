"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { declareGift, requestPreclearance } from "@/lib/server/compliance/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function requestPreclearanceAction(instrumentId: string, side: string, units: number) {
  const user = await requireUser();
  return requestPreclearance(user, instrumentId, side, units);
}

export async function declareGiftAction(kind: string, value: number, from: string) {
  const user = await requireUser();
  return declareGift(user, kind, value, from);
}
