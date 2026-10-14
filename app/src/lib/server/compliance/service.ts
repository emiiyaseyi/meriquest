import "server-only";
import { randomBytes } from "node:crypto";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer } from "../world/service";
import { getAcademy } from "../academy/service";
import { audit } from "../audit";
import { quoteOf, holdingMinutesLeft } from "../market/service";
import { emptyDoc, type ComplianceDoc, type GiftEntry, type Preclearance } from "./preclear";
import { cleanMessage } from "@/lib/chat";
import { giftDecision, preclearDecision } from "@/lib/compliance";
import { withStats } from "@/lib/stats";

/**
 * The Compliance Desk (RULEBOOK §2.9): personal-dealing pre-clearance, a gifts and entertainment register, the
 * restricted list, the regulators, and the person's compliance standing. Practice only; consequences are learning
 * consequences, never real HR action. The server decides every outcome from the rules; the browser only asks.
 */

export interface ComplianceView {
  requirePreclearance: boolean;
  preclearHours: number;
  maxDealValue: number;
  giftRecordLimit: number;
  giftDeclineLimit: number;
  giftKinds: { id: string; label: string; icon: string }[];
  instruments: { id: string; name: string; restricted: string | null }[];
  preclear: Preclearance[];
  gifts: GiftEntry[];
  regulators: { id: string; name: string; fullName: string; role: string; confirmed: boolean }[];
  standing: { complianceCourses: number; complianceCertified: number; clientBreaches: number; rejectedRequests: number; declinedGifts: number; label: string };
}
export type ComplianceResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

type User = Pick<UserDTO, "staffId" | "unit" | "tenureYears">;

export async function getCompliance(user: User, now: number = Date.now()): Promise<ComplianceView> {
  const [cfg, market, regs, doc, player, home] = await Promise.all([
    getConfig("compliance"),
    getConfig("market"),
    getConfig("regulators"),
    getStore().get<ComplianceDoc>("compliance", user.staffId),
    getOrCreatePlayer(user, now),
    getAcademy(user, now),
  ]);
  const d = doc ?? emptyDoc(user.staffId);
  const courses = home.courses.filter((c) => c.group === "compliance");
  const certified = courses.filter((c) => c.certified).length;
  const breaches = withStats(player.stats).clientBreaches;
  const rejected = d.preclear.filter((p) => p.status === "rejected").length;
  const declined = d.gifts.filter((g) => g.outcome === "decline").length;
  const label = breaches > 0 ? "Needs attention" : certified >= courses.length && courses.length > 0 ? "Excellent standing" : "Good standing";
  return {
    requirePreclearance: cfg.settings.requirePreclearance,
    preclearHours: cfg.settings.preclearHours,
    maxDealValue: cfg.settings.maxDealValue,
    giftRecordLimit: cfg.settings.giftRecordLimit,
    giftDeclineLimit: cfg.settings.giftDeclineLimit,
    giftKinds: cfg.giftKinds,
    instruments: market.instruments.map((i) => ({ id: i.id, name: i.name, restricted: i.restricted ?? null })),
    preclear: d.preclear.slice(0, cfg.settings.keep),
    gifts: d.gifts.slice(0, cfg.settings.keep),
    regulators: regs.filter((r) => r.enabled).map((r) => ({ id: r.id, name: r.name, fullName: r.fullName, role: r.role, confirmed: r.status === "confirmed" })),
    standing: { complianceCourses: courses.length, complianceCertified: certified, clientBreaches: breaches, rejectedRequests: rejected, declinedGifts: declined, label },
  };
}

/** Ask the desk for permission to make a personal practice trade. The desk answers at once from the rules. */
export async function requestPreclearance(user: User, instrumentId: unknown, side: unknown, units: unknown, now: number = Date.now()): Promise<ComplianceResult<{ decision: Preclearance }>> {
  if (side !== "buy" && side !== "sell") return { ok: false, error: "Choose buy or sell." };
  if (typeof instrumentId !== "string" || instrumentId.length > 41) return { ok: false, error: "Choose a share or fund." };
  if (typeof units !== "number" || !Number.isInteger(units) || units < 1 || units > 1_000_000) return { ok: false, error: "Enter a whole number of units." };
  const [cfg, quote] = await Promise.all([getConfig("compliance"), quoteOf(instrumentId, now)]);
  if (!quote) return { ok: false, error: "Choose a share or fund." };
  const value = Math.round(quote.price * units * 100) / 100;
  const left = side === "sell" ? await holdingMinutesLeft(user.staffId, instrumentId, now) : 0;
  const verdict = preclearDecision({ restricted: quote.restricted, value, rules: { maxValue: cfg.settings.maxDealValue }, side, holdingMinutesLeft: left });
  const entry: Preclearance = {
    id: randomBytes(4).toString("hex"),
    instrument: quote.id,
    name: quote.name,
    side,
    units,
    value,
    at: now,
    status: verdict.status,
    reason: verdict.status === "approved" ? `Approved for ${cfg.settings.preclearHours} hours, for one trade.` : verdict.reason,
    validUntil: verdict.status === "approved" ? now + cfg.settings.preclearHours * 3_600_000 : 0,
    used: false,
  };
  await getStore().update<ComplianceDoc>("compliance", user.staffId, (cur) => {
    const base = cur ?? emptyDoc(user.staffId);
    return { ...base, preclear: [entry, ...base.preclear].slice(0, cfg.settings.keep) };
  });
  await audit(user.staffId, "compliance.preclear", quote.id, { side, status: entry.status }, now);
  return { ok: true, decision: entry };
}

/** Declare a gift, meal or entertainment offered to you. The desk records it and tells you what to do. */
export async function declareGift(user: User, kind: unknown, value: unknown, from: unknown, now: number = Date.now()): Promise<ComplianceResult<{ entry: GiftEntry }>> {
  const cfg = await getConfig("compliance");
  const k = cfg.giftKinds.find((x) => x.id === kind);
  if (!k) return { ok: false, error: "Choose what kind of offer it is." };
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) return { ok: false, error: "Enter the value in practice naira." };
  const who = cleanMessage(from, 60);
  if (who.length < 2) return { ok: false, error: "Say who offered it." };
  const v = giftDecision(k.id, value, { recordLimit: cfg.settings.giftRecordLimit, declineLimit: cfg.settings.giftDeclineLimit });
  const entry: GiftEntry = { at: now, kind: k.id, label: k.label, value: Math.round(value * 100) / 100, from: who, outcome: v.outcome, advice: v.advice };
  await getStore().update<ComplianceDoc>("compliance", user.staffId, (cur) => {
    const base = cur ?? emptyDoc(user.staffId);
    return { ...base, gifts: [entry, ...base.gifts].slice(0, cfg.settings.keep) };
  });
  await audit(user.staffId, "compliance.gift", k.id, { outcome: v.outcome }, now);
  return { ok: true, entry };
}
