"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { serveInternal, type InternalResult } from "@/lib/server/arrivals/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function serveInternalAction(arrivalId: string, shown: number): Promise<InternalResult> {
  const user = await requireUser();
  return serveInternal(user, arrivalId, shown);
}
