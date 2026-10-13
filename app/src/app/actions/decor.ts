"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { buyAndPlace, buyItem, getDecor, moveItem, placeItem, removeItem, setDecorMode, type DecorResult, type DecorView } from "@/lib/server/decor/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function getDecorAction(): Promise<DecorView> {
  const user = await requireUser();
  return getDecor(user);
}

export async function buyItemAction(itemId: string): Promise<DecorResult> {
  const user = await requireUser();
  return buyItem(user, String(itemId));
}

export async function placeItemAction(itemId: string, x: number, y: number, rot: number = 0): Promise<DecorResult> {
  const user = await requireUser();
  return placeItem(user, String(itemId), x, y, Date.now(), rot);
}

export async function buyAndPlaceAction(itemId: string, x: number, y: number, rot: number = 0): Promise<DecorResult> {
  const user = await requireUser();
  return buyAndPlace(user, String(itemId), x, y, rot);
}

export async function moveItemAction(uid: string, x: number, y: number, rot?: number): Promise<DecorResult> {
  const user = await requireUser();
  return moveItem(user, String(uid), x, y, Date.now(), rot);
}

export async function removeItemAction(uid: string): Promise<DecorResult> {
  const user = await requireUser();
  return removeItem(user, String(uid));
}

export async function setDecorModeAction(mode: string): Promise<DecorResult> {
  const user = await requireUser();
  return setDecorMode(user, mode);
}
