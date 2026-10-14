"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { answerClient, startClient, type ClientResult } from "@/lib/server/clients/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function startClientAction(clientId: string): Promise<ClientResult> {
  const user = await requireUser();
  return startClient(user, clientId);
}

export async function answerClientAction(optionId: string): Promise<ClientResult> {
  const user = await requireUser();
  return answerClient(user, optionId);
}
