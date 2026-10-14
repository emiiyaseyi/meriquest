import { beforeEach, describe, expect, it } from "vitest";
import { dayOf, feeFor, priceAt, startCashFor, stateOn, type MarketRules } from "@/lib/market";
import { getMarket, getPortfolio, trade } from "@/lib/server/market/service";
import { marketSchema } from "@/lib/server/config/definitions";
import { DEFAULT_MARKET } from "@/lib/server/config/market-content";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");
const TZ = "Africa/Lagos";
const rules: MarketRules = { tickMinutes: 30, windowTicks: 96, defaultState: "calm", states: DEFAULT_MARKET.states, schedule: [] };
const eq = DEFAULT_MARKET.instruments[0];

describe("practice market rules", () => {
  it("ships valid settings", () => {
    expect(marketSchema.safeParse(DEFAULT_MARKET).success).toBe(true);
  });

  it("gives the same price to everyone at the same moment, and moves it over time", () => {
    expect(priceAt(eq, rules, NOW, TZ)).toBe(priceAt(eq, rules, NOW, TZ));
    expect(priceAt(eq, rules, NOW + 3 * 3_600_000, TZ)).not.toBe(priceAt(eq, rules, NOW, TZ));
    expect(priceAt(eq, rules, NOW, TZ)).toBeGreaterThan(0);
  });

  it("pushes share prices down in a sell-off week and keeps money market steady", () => {
    const day = dayOf(NOW, TZ);
    const sell: MarketRules = { ...rules, schedule: [{ state: "selloff", from: "2026-10-01", to: day }] };
    expect(stateOn(sell, day).id).toBe("selloff");
    expect(stateOn(rules, day).id).toBe("calm");
    expect(priceAt(eq, sell, NOW, TZ)).toBeLessThan(priceAt(eq, rules, NOW, TZ));
    const mm = DEFAULT_MARKET.instruments.find((i) => i.kind === "money")!;
    expect(Math.abs(priceAt(mm, sell, NOW, TZ) / priceAt(mm, rules, NOW, TZ) - 1)).toBeLessThan(0.01);
  });

  it("starts people with practice cash for their level and rounds fees", () => {
    const bands = DEFAULT_MARKET.settings.startBands;
    expect(startCashFor(0, bands)).toBe(1_000_000);
    expect(startCashFor(1, bands)).toBe(1_000_000);
    expect(startCashFor(2, bands)).toBe(5_000_000);
    expect(startCashFor(4, bands)).toBe(10_000_000);
    expect(feeFor(1000, 0.5)).toBe(5);
  });
});

describe("practice trading", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  const me = () => dto("MS1001");

  it("opens a portfolio with the starting cash and shows the market", async () => {
    const p = await getPortfolio(await me(), NOW);
    expect(p.cash).toBe(1_000_000);
    expect(p.total).toBe(1_000_000);
    const m = await getMarket(await me(), NOW);
    expect(m.quotes.length).toBe(DEFAULT_MARKET.instruments.length);
    expect(m.state.label).toBe("Calm market");
  });

  it("buys at the server price with a fee, then holds the sale until the holding period ends", async () => {
    const u = await me();
    const r = await trade(u, "buy", "eko-cement", 100, NOW);
    expect(r.ok).toBe(true);
    const p = await getPortfolio(u, NOW);
    expect(p.holdings[0]).toMatchObject({ id: "eko-cement", units: 100 });
    expect(p.cash).toBeLessThan(1_000_000);
    const early = await trade(u, "sell", "eko-cement", 50, NOW + 60_000);
    expect(early.ok).toBe(false);
    const later = await trade(u, "sell", "eko-cement", 50, NOW + 31 * 60_000);
    expect(later.ok).toBe(true);
    expect((await getPortfolio(u, NOW + 31 * 60_000)).holdings[0].units).toBe(50);
  });

  it("refuses restricted shares, too little cash, selling what you do not hold, bad input and too many trades", async () => {
    const u = await me();
    const restricted = await trade(u, "buy", "tidewater-telecom", 1, NOW);
    expect(restricted.ok).toBe(false);
    expect(!restricted.ok && restricted.error).toContain("Restricted");
    expect((await trade(u, "buy", "eko-cement", 100_000, NOW)).ok).toBe(false); // far more than the cash
    expect((await trade(u, "sell", "eko-cement", 1, NOW)).ok).toBe(false);
    for (const bad of [0, -1, 1.5, "5", NaN, 2_000_000]) expect((await trade(u, "buy", "eko-cement", bad as never, NOW)).ok).toBe(false);
    expect((await trade(u, "short", "eko-cement", 1, NOW)).ok).toBe(false);
    expect((await trade(u, "buy", "nonsense", 1, NOW)).ok).toBe(false);
    for (let i = 0; i < DEFAULT_MARKET.settings.tradesPerDay; i++) await trade(u, "buy", "money-fund", 1, NOW + i);
    const over = await trade(u, "buy", "money-fund", 1, NOW + 99);
    expect(over.ok).toBe(false);
    expect(!over.ok && over.error).toContain("today's practice trades");
  });

  it("never lets two quick buys spend the same cash twice", async () => {
    const u = await me();
    // 1,000,000 cash: two buys of about 600,000 at once; only one can succeed
    const price = (await getMarket(u, NOW)).quotes.find((q) => q.id === "eko-cement")!.price;
    const units = Math.floor(600_000 / price);
    const [a, b] = await Promise.all([trade(u, "buy", "eko-cement", units, NOW), trade(u, "buy", "eko-cement", units, NOW)]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect((await getPortfolio(u, NOW)).cash).toBeGreaterThan(0);
  });
});
