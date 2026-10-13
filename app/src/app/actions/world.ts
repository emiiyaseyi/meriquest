"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { travelByMap, travelByPortal, type TravelResult } from "@/lib/server/world/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function travelPortalAction(portalId: string): Promise<TravelResult> {
  const user = await requireUser();
  return travelByPortal(user, portalId);
}

export async function travelMapAction(sceneId: string): Promise<TravelResult> {
  const user = await requireUser();
  return travelByMap(user, sceneId);
}
