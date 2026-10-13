"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { markToured, saveLook, travelByMap, travelByPortal, type TravelResult } from "@/lib/server/world/service";
import type { Skin } from "@/lib/world/types";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function travelPortalAction(portalId: string): Promise<TravelResult> {
  const user = await requireUser();
  return travelByPortal(user, portalId);
}

export async function travelMapAction(sceneId: string): Promise<TravelResult> {
  const user = await requireUser();
  return travelByMap(user, sceneId);
}

export async function completeTourAction(): Promise<void> {
  const user = await requireUser();
  await markToured(user);
}

export async function saveLookAction(look: unknown): Promise<{ ok: true; look: Skin } | { ok: false; error: string }> {
  const user = await requireUser();
  return saveLook(user, look);
}
