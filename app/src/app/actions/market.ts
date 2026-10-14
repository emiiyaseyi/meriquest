"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { trade, type TradeResult } from "@/lib/server/market/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function tradeAction(side: string, id: string, units: number): Promise<TradeResult> {
  const user = await requireUser();
  return trade(user, side, id, units);
}
