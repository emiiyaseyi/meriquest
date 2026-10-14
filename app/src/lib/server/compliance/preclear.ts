import "server-only";
import { getStore } from "../store";

/** The Compliance Desk's record for one person. Kept in its own file so the market can check pre-clearance without a loop of imports. */
export interface Preclearance {
  id: string;
  instrument: string;
  name: string;
  side: "buy" | "sell";
  units: number;
  value: number;
  at: number;
  status: "approved" | "rejected";
  reason: string;
  validUntil: number;
  used: boolean;
}
export interface GiftEntry {
  at: number;
  kind: string;
  label: string;
  value: number;
  from: string;
  outcome: "recorded" | "approval" | "decline";
  advice: string;
}
export interface ComplianceDoc {
  staffId: string;
  preclear: Preclearance[];
  gifts: GiftEntry[];
}

export const emptyDoc = (staffId: string): ComplianceDoc => ({ staffId, preclear: [], gifts: [] });

const usable = (p: Preclearance, instrument: string, side: "buy" | "sell", now: number) => p.status === "approved" && !p.used && p.instrument === instrument && p.side === side && p.validUntil > now;

/** Whether the person has an approved, unused, unexpired pre-clearance for this instrument and side. */
export async function hasPreclearance(staffId: string, instrument: string, side: "buy" | "sell", now: number): Promise<boolean> {
  const d = await getStore().get<ComplianceDoc>("compliance", staffId);
  return !!d?.preclear.some((p) => usable(p, instrument, side, now));
}

/** Use up one pre-clearance after a trade went through, so it covers a single deal. */
export async function spendPreclearance(staffId: string, instrument: string, side: "buy" | "sell", now: number): Promise<void> {
  await getStore().update<ComplianceDoc>("compliance", staffId, (cur) => {
    if (!cur) return cur;
    const i = cur.preclear.findIndex((p) => usable(p, instrument, side, now));
    if (i < 0) return cur;
    return { ...cur, preclear: cur.preclear.map((p, j) => (j === i ? { ...p, used: true } : p)) };
  });
}
