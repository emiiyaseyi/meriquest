"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { postMessage, reportMessage, type ChatResult } from "@/lib/server/chat/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function sendMessageAction(conv: string, text: string): Promise<ChatResult> {
  const user = await requireUser();
  return postMessage(user, conv, text);
}

export async function reportMessageAction(conv: string, messageId: string, reason: string): Promise<ChatResult> {
  const user = await requireUser();
  return reportMessage(user, conv, messageId, reason);
}
