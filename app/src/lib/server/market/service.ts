import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer } from "../world/service";
import { playStatus } from "../workfirst/service";
import { recordEvent } from "../game/missions";
import { audit } from "../audit";
import { levelFor } from "@/lib/world/player";
import { dayOf, feeFor, priceAt, startCashFor, stateOn, type MarketInstrument, type MarketRules } from "@/lib/market";

/**
 * The practice market and each person's practice portfolio. All money here is fictional practice cash, separate from
 * Merit points. Prices are fictional and never advice. The server prices every trade itself, so a browser cannot
 * choose its own price, and each trade is one atomic update of the person's portfolio.
 */

interface Holding {
  units: number;
  /** What the units cost in total, fees included. */
  cost: number;
  /** When units were last bought, for the holding period. */
  boughtAt: number;
}
interface Trade {
  at: number;
  side: "buy" | "sell";
  id: string;
  name: string;
  units: number;
  price: number;
  fee: number;
}
interface PortfolioDoc {
  staffId: string;
  startCash: number;
  cash: number;
  holdings: Record<string, Holding>;
  trades: Trade[];
  day: string;
  count: number;
}

export interface QuoteView {
  id: string;
  name: string;
  kind: string;
  price: number;
  changePct: number;
  restricted: string | null;
  owned: number;
}
export interface MarketView {
  state: { label: string; icon: string };
  kinds: { id: string; label: string; icon: string }[];
  quotes: QuoteView[];
  cash: number;
  feePct: number;
  holdingMinutes: number;
  tradesLeft: number;
}
export interface HoldingView {
  id: string;
  name: string;
  units: number;
  price: number;
  value: number;
  cost: number;
  pnl: number;
  /** When it can be sold, if the holding period is still running. */
  sellableAt: number | null;
}
export interface PortfolioView {
  startCash: number;
  cash: number;
  invested: number;
  total: number;
  pnl: number;
  pnlPct: number;
  holdings: HoldingView[];
  trades: Trade[];
}
export type TradeResult = { ok: true; message: string } | { ok: false; error: string };

const MAX_TRADES_KEPT = 30;

async function setup(now: number) {
  const [cfg, work] = await Promise.all([getConfig("market"), getConfig("workFirst")]);
  const rules: MarketRules = { tickMinutes: cfg.settings.tickMinutes, windowTicks: cfg.settings.windowTicks, defaultState: cfg.settings.defaultState, states: cfg.states, schedule: cfg.schedule };
  const price = (i: MarketInstrument, at: number = now) => priceAt(i, rules, at, work.timezone);
  return { cfg, work, rules, price, day: dayOf(now, work.timezone) };
}

/** The person's portfolio, started with practice cash for their growth level the first time they open it. */
async function portfolioOf(user: Pick<UserDTO, "staffId">, now: number): Promise<PortfolioDoc> {
  const existing = await getStore().get<PortfolioDoc>("portfolios", user.staffId);
  if (existing) return existing;
  const [cfg, levels, player] = await Promise.all([getConfig("market"), getConfig("levels"), getOrCreatePlayer(user, now)]);
  const start = startCashFor(levelFor(player.points, levels).index, cfg.settings.startBands);
  return getStore().update<PortfolioDoc>("portfolios", user.staffId, (cur) => cur ?? { staffId: user.staffId, startCash: start, cash: start, holdings: {}, trades: [], day: "", count: 0 }) as Promise<PortfolioDoc>;
}

export async function getMarket(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<MarketView> {
  const [{ cfg, rules, price, day }, doc] = await Promise.all([setup(now), portfolioOf(user, now)]);
  const state = stateOn(rules, day);
  const used = doc.day === day ? doc.count : 0;
  return {
    state: { label: state.label, icon: state.icon },
    kinds: cfg.kinds,
    quotes: cfg.instruments.map((i) => {
      const p = price(i);
      const before = price(i, now - 24 * 3_600_000);
      return { id: i.id, name: i.name, kind: i.kind, price: p, changePct: before > 0 ? Math.round(((p - before) / before) * 1000) / 10 : 0, restricted: i.restricted ?? null, owned: doc.holdings[i.id]?.units ?? 0 };
    }),
    cash: doc.cash,
    feePct: cfg.settings.feePct,
    holdingMinutes: cfg.settings.holdingMinutes,
    tradesLeft: Math.max(0, cfg.settings.tradesPerDay - used),
  };
}

export async function getPortfolio(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<PortfolioView> {
  const [{ cfg, price }, doc] = await Promise.all([setup(now), portfolioOf(user, now)]);
  const byId = new Map(cfg.instruments.map((i) => [i.id, i]));
  const holdings: HoldingView[] = Object.entries(doc.holdings)
    .filter(([id, h]) => h.units > 0 && byId.has(id))
    .map(([id, h]) => {
      const inst = byId.get(id) as MarketInstrument;
      const p = price(inst);
      const value = Math.round(p * h.units * 100) / 100;
      const until = h.boughtAt + cfg.settings.holdingMinutes * 60_000;
      return { id, name: inst.name, units: h.units, price: p, value, cost: Math.round(h.cost * 100) / 100, pnl: Math.round((value - h.cost) * 100) / 100, sellableAt: cfg.settings.holdingMinutes > 0 && until > now ? until : null };
    })
    .sort((a, b) => b.value - a.value);
  const invested = Math.round(holdings.reduce((n, h) => n + h.value, 0) * 100) / 100;
  const total = Math.round((doc.cash + invested) * 100) / 100;
  const pnl = Math.round((total - doc.startCash) * 100) / 100;
  return { startCash: doc.startCash, cash: Math.round(doc.cash * 100) / 100, invested, total, pnl, pnlPct: doc.startCash > 0 ? Math.round((pnl / doc.startCash) * 1000) / 10 : 0, holdings, trades: doc.trades.slice(0, 15) };
}

/** Buy or sell whole units at the current practice price. */
export async function trade(user: Pick<UserDTO, "staffId" | "unit" | "role">, side: unknown, id: unknown, units: unknown, now: number = Date.now()): Promise<TradeResult> {
  if (side !== "buy" && side !== "sell") return { ok: false, error: "Choose buy or sell." };
  if (typeof id !== "string" || id.length > 41) return { ok: false, error: "That is not on the market." };
  if (typeof units !== "number" || !Number.isInteger(units) || units < 1 || units > 1_000_000) return { ok: false, error: "Enter a whole number of units." };
  const decision = await playStatus(user, "world", now);
  if (!decision.allowed) return { ok: false, error: decision.message };
  const { cfg, price, day } = await setup(now);
  const inst = cfg.instruments.find((i) => i.id === id);
  if (!inst) return { ok: false, error: "That is not on the market." };
  if (side === "buy" && inst.restricted) return { ok: false, error: inst.restricted };
  await portfolioOf(user, now);

  const p = price(inst);
  const gross = Math.round(p * units * 100) / 100;
  const fee = feeFor(gross, cfg.settings.feePct);
  let refusal: string | null = null;
  await getStore().update<PortfolioDoc>("portfolios", user.staffId, (cur) => {
    if (!cur) return cur;
    const used = cur.day === day ? cur.count : 0;
    if (used >= cfg.settings.tradesPerDay) {
      refusal = `You have made all ${cfg.settings.tradesPerDay} of today's practice trades. Come back tomorrow.`;
      return cur;
    }
    const held = cur.holdings[inst.id] ?? { units: 0, cost: 0, boughtAt: 0 };
    let cash = cur.cash;
    let next: Holding;
    if (side === "buy") {
      if (cash < gross + fee) {
        refusal = `You need ${(gross + fee).toLocaleString("en-NG", { maximumFractionDigits: 2 })} practice naira for that. You have ${cash.toLocaleString("en-NG", { maximumFractionDigits: 2 })}.`;
        return cur;
      }
      cash -= gross + fee;
      next = { units: held.units + units, cost: held.cost + gross + fee, boughtAt: now };
    } else {
      if (held.units < units) {
        refusal = `You only hold ${held.units} of those.`;
        return cur;
      }
      if (cfg.settings.holdingMinutes > 0 && now < held.boughtAt + cfg.settings.holdingMinutes * 60_000) {
        const mins = Math.max(1, Math.ceil((held.boughtAt + cfg.settings.holdingMinutes * 60_000 - now) / 60_000));
        refusal = `Holding period: you must keep a purchase for ${cfg.settings.holdingMinutes} minutes before selling. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
        return cur;
      }
      cash += gross - fee;
      const left = held.units - units;
      next = { units: left, cost: left === 0 ? 0 : held.cost * (left / held.units), boughtAt: held.boughtAt };
    }
    const holdings = { ...cur.holdings, [inst.id]: next };
    if (next.units === 0) delete holdings[inst.id];
    return { ...cur, cash: Math.round(cash * 100) / 100, holdings, trades: [{ at: now, side, id: inst.id, name: inst.name, units, price: p, fee } satisfies Trade, ...cur.trades].slice(0, MAX_TRADES_KEPT), day, count: used + 1 };
  });
  if (refusal) return { ok: false, error: refusal };
  await audit(user.staffId, "market.trade", inst.id, { side, units }, now);
  await recordEvent(user.staffId, "trade", now);
  return { ok: true, message: `${side === "buy" ? "Bought" : "Sold"} ${units} × ${inst.name} at ${p.toLocaleString("en-NG", { maximumFractionDigits: 2 })}.` };
}
