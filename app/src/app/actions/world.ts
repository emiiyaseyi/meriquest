"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { markToured, saveLook, travelByMap, travelByPortal, type TravelResult } from "@/lib/server/world/service";
import { cancelActivity, completeActivity, getLocation, startActivity, type ActivityResult, type LocationView } from "@/lib/server/game/activities";
import { claimDailyBonus, claimMission, getGameState, interact, swapMission, visitSpot, type ActionResult, type GameState } from "@/lib/server/game/service";
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

export async function interactAction(interactionId: string, npcId: string): Promise<ActionResult> {
  const user = await requireUser();
  return interact(user, interactionId, npcId);
}

export async function spotAction(kind: string): Promise<ActionResult> {
  const user = await requireUser();
  return visitSpot(user, kind);
}

export async function claimMissionAction(missionId: string): Promise<ActionResult> {
  const user = await requireUser();
  return claimMission(user, missionId);
}

export async function claimBonusAction(): Promise<ActionResult> {
  const user = await requireUser();
  return claimDailyBonus(user);
}

export async function gameStateAction(): Promise<GameState> {
  const user = await requireUser();
  return getGameState(user);
}

export async function swapMissionAction(missionId: string): Promise<ActionResult> {
  const user = await requireUser();
  return swapMission(user, missionId);
}

export async function locationAction(): Promise<LocationView | null> {
  const user = await requireUser();
  return getLocation(user);
}

export async function startActivityAction(activityId: string): Promise<ActivityResult> {
  const user = await requireUser();
  return startActivity(user, activityId);
}

export async function completeActivityAction(): Promise<ActivityResult> {
  const user = await requireUser();
  return completeActivity(user);
}

export async function cancelActivityAction(): Promise<ActivityResult> {
  const user = await requireUser();
  return cancelActivity(user);
}
