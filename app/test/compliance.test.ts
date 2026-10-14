import { beforeEach, describe, expect, it } from "vitest";
import { giftDecision, preclearDecision } from "@/lib/compliance";
import { declareGift, getCompliance, requestPreclearance } from "@/lib/server/compliance/service";
import { trade } from "@/lib/server/market/service";
import { setConfig } from "@/lib/server/config/registry";
import { complianceSchema } from "@/lib/server/config/definitions";
import { DEFAULT_COMPLIANCE } from "@/lib/server/config/compliance-content";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");
const gift = { recordLimit: 25_000, declineLimit: 100_000 };

describe("compliance rules", () => {
  it("ships valid settings", () => {
    expect(complianceSchema.safeParse(DEFAULT_COMPLIANCE).success).toBe(true);
  });

  it("decides pre-clearance from the restricted list, the holding period and the limit", () => {
    const base = { restricted: null, value: 1000, rules: { maxValue: 5000 }, side: "buy" as const, holdingMinutesLeft: 0 };
    expect(preclearDecision(base).status).toBe("approved");
    expect(preclearDecision({ ...base, restricted: "Restricted" }).status).toBe("rejected");
    expect(preclearDecision({ ...base, value: 9000 }).status).toBe("rejected");
    expect(preclearDecision({ ...base, side: "sell", holdingMinutesLeft: 5 }).status).toBe("rejected");
    expect(preclearDecision({ ...base, side: "sell", holdingMinutesLeft: 0 }).status).toBe("approved");
  });

  it("sorts gifts into record, wait for approval, or decline, and never accepts cash", () => {
    expect(giftDecision("gift", 10_000, gift).outcome).toBe("recorded");
    expect(giftDecision("meal", 60_000, gift).outcome).toBe("approval");
    expect(giftDecision("gift", 500_000, gift).outcome).toBe("decline");
    expect(giftDecision("cash", 100, gift).outcome).toBe("decline");
  });
});

describe("compliance desk", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  const me = () => dto("MS1001");

  it("approves an ordinary request and rejects a restricted one, and records both", async () => {
    const u = await me();
    const ok = await requestPreclearance(u, "eko-cement", "buy", 10, NOW);
    expect(ok.ok && ok.decision.status).toBe("approved");
    const no = await requestPreclearance(u, "tidewater-telecom", "buy", 1, NOW + 1000);
    expect(no.ok && no.decision.status).toBe("rejected");
    const v = await getCompliance(u, NOW + 2000);
    expect(v.preclear).toHaveLength(2);
    expect(v.standing.rejectedRequests).toBe(1);
  });

  it("refuses bad input", async () => {
    const u = await me();
    expect((await requestPreclearance(u, "eko-cement", "short", 10, NOW)).ok).toBe(false);
    expect((await requestPreclearance(u, "nonsense", "buy", 10, NOW)).ok).toBe(false);
    expect((await requestPreclearance(u, "eko-cement", "buy", 0, NOW)).ok).toBe(false);
    expect((await requestPreclearance(u, "eko-cement", "buy", 1.5, NOW)).ok).toBe(false);
    expect((await declareGift(u, "unknown", 1000, "A client", NOW)).ok).toBe(false);
    expect((await declareGift(u, "gift", -5, "A client", NOW)).ok).toBe(false);
    expect((await declareGift(u, "gift", NaN, "A client", NOW)).ok).toBe(false);
    expect((await declareGift(u, "gift", 1000, "", NOW)).ok).toBe(false);
  });

  it("records a declared gift with the right advice", async () => {
    const u = await me();
    const r = await declareGift(u, "gift", 200_000, "Chief Dayo", NOW);
    expect(r.ok && r.entry.outcome).toBe("decline");
    expect((await getCompliance(u, NOW)).standing.declinedGifts).toBe(1);
  });

  it("makes a trade need a pre-clearance when the rule is on, and uses it up after one trade", async () => {
    const u = await me();
    const before = await trade(u, "buy", "money-fund", 1, NOW);
    expect(before.ok).toBe(true); // rule off by default
    await setConfig("compliance", JSON.stringify({ ...DEFAULT_COMPLIANCE, settings: { ...DEFAULT_COMPLIANCE.settings, requirePreclearance: true } }), "MS0001", NOW);
    const blocked = await trade(u, "buy", "eko-cement", 1, NOW + 1000);
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.error).toContain("pre-clearance");
    await requestPreclearance(u, "eko-cement", "buy", 1, NOW + 2000);
    expect((await trade(u, "buy", "eko-cement", 1, NOW + 3000)).ok).toBe(true);
    expect((await trade(u, "buy", "eko-cement", 1, NOW + 4000)).ok).toBe(false); // the pre-clearance covered one trade
  });
});
