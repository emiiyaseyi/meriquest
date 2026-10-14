"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { finishTrip, startTrip, turnBack, type TravelResult } from "@/lib/server/travel/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function startTripAction(toScene: string, modeId: string): Promise<TravelResult> {
  const user = await requireUser();
  return startTrip(user, toScene, modeId);
}

export async function finishTripAction(skip: boolean): Promise<TravelResult> {
  const user = await requireUser();
  return finishTrip(user, skip === true);
}

export async function turnBackAction(): Promise<TravelResult> {
  const user = await requireUser();
  return turnBack(user);
}
