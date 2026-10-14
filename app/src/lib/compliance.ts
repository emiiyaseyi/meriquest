/**
 * Compliance Desk rules (RULEBOOK §2.9). The decisions are plain rules so they can be taught and tested: pre-clearance
 * for personal dealing and the gifts and entertainment register. Everything is practice and fictional; consequences are
 * learning consequences, never real HR action.
 */

export interface DealingRules {
  /** Practice naira above which a personal deal needs more than the desk can approve. */
  maxValue: number;
}

export type PreclearDecision = { status: "approved" } | { status: "rejected"; reason: string };

export function preclearDecision(input: { restricted: string | null; value: number; rules: DealingRules; side: "buy" | "sell"; holdingMinutesLeft: number }): PreclearDecision {
  if (input.restricted) return { status: "rejected", reason: input.restricted };
  if (input.side === "sell" && input.holdingMinutesLeft > 0) return { status: "rejected", reason: `Holding period: keep the purchase for ${input.holdingMinutesLeft} more minute${input.holdingMinutesLeft === 1 ? "" : "s"} before selling.` };
  if (input.value > input.rules.maxValue) return { status: "rejected", reason: "This is above the desk's limit for personal dealing. Ask Compliance for a manual review before you deal." };
  return { status: "approved" };
}

export interface GiftRules {
  /** Gifts and meals up to this value are recorded and may be accepted. */
  recordLimit: number;
  /** Above the record limit and up to this value, wait for Compliance approval. Above it, decline. */
  declineLimit: number;
}
export type GiftOutcome = "recorded" | "approval" | "decline";

export function giftDecision(kind: string, value: number, rules: GiftRules): { outcome: GiftOutcome; advice: string } {
  if (kind === "cash") return { outcome: "decline", advice: "Never accept cash or cash-like gifts. Decline politely and tell Compliance." };
  if (value > rules.declineLimit) return { outcome: "decline", advice: "This is too valuable to accept. Decline politely, return it if it has arrived, and tell Compliance." };
  if (value > rules.recordLimit) return { outcome: "approval", advice: "Do not accept yet. It needs Compliance approval first, and it is now on your register as waiting." };
  return { outcome: "recorded", advice: "This is within the limit. It is recorded in your register, and you may accept it." };
}
