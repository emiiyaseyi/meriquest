"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { giveKudos, type KudosResult } from "@/lib/server/people/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function giveKudosAction(to: string, value: string, note: string): Promise<KudosResult> {
  const user = await requireUser();
  return giveKudos(user, to, value, note);
}
