import { hashString } from "@/lib/iso/geometry";

/**
 * The practice market. Every price is fictional and the same for everyone at the same moment: it is worked out from the
 * instrument, the clock and the market state, with no stored price history. Never live data, never advice (RULEBOOK §3).
 */

export interface MarketInstrument {
  id: string;
  name: string;
  kind: string;
  /** Price at the start of the practice year, in practice naira. */
  price: number;
  /** Size of a normal move per tick, in percent. */
  volatility: number;
  /** Steady yearly growth of the price in percent (interest on bills, coupons on bonds). */
  incomePct: number;
  restricted?: string;
}

export interface MarketState {
  id: string;
  label: string;
  icon: string;
  /** Extra move per tick for each kind of instrument, in percent. */
  drift: Record<string, number>;
}

export interface MarketSchedule {
  state: string;
  /** First and last day it applies, as YYYY-MM-DD in the office time zone. */
  from: string;
  to: string;
}

export interface MarketRules {
  tickMinutes: number;
  windowTicks: number;
  defaultState: string;
  states: MarketState[];
  schedule: MarketSchedule[];
}

const EPOCH = Date.parse("2026-01-01T00:00:00Z");
const YEAR_MS = 365 * 86_400_000;

/** A steady pseudo-random number between -1 and 1 for an instrument at one moment. */
const noise = (id: string, tick: number): number => (hashString(`${id}:${tick}`) / 4294967295) * 2 - 1;

/** Which state is active on a day (the first matching entry in the schedule wins). */
export function stateOn(rules: MarketRules, day: string): MarketState {
  const hit = rules.schedule.find((s) => day >= s.from && day <= s.to);
  const id = hit?.state ?? rules.defaultState;
  return rules.states.find((s) => s.id === id) ?? rules.states[0];
}

/** The day (YYYY-MM-DD) of a moment in a time zone. */
export function dayOf(now: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}

/**
 * The price of an instrument at a moment. The recent moves (random noise plus the pull of the market state of each tick)
 * are added up over a window, so a price wanders and then drifts back, and a "selloff week" really pushes prices down.
 */
export function priceAt(inst: MarketInstrument, rules: MarketRules, now: number, timeZone: string): number {
  const tickMs = rules.tickMinutes * 60_000;
  const tick = Math.floor(now / tickMs);
  let move = 0;
  const stateCache = new Map<string, MarketState>();
  for (let i = 0; i < rules.windowTicks; i++) {
    const t = tick - i;
    const day = dayOf(t * tickMs, timeZone);
    let st = stateCache.get(day);
    if (!st) {
      st = stateOn(rules, day);
      stateCache.set(day, st);
    }
    move += inst.volatility * noise(inst.id, t) + (st.drift[inst.kind] ?? 0);
  }
  const accrual = (inst.incomePct / 100) * ((now - EPOCH) / YEAR_MS);
  const price = inst.price * Math.exp(accrual + move / 100);
  return Math.max(0.01, Math.round(price * 100) / 100);
}

/** What a practice trade costs in fees, rounded to the kobo. */
export const feeFor = (amount: number, feePct: number): number => Math.round(amount * (feePct / 100) * 100) / 100;

/** The starting practice cash for a growth level (the highest band the level has reached). */
export function startCashFor(levelIndex: number, bands: { fromLevel: number; cash: number }[]): number {
  let cash = bands.length ? Math.min(...bands.map((b) => b.cash)) : 0;
  let best = -1;
  for (const b of bands) {
    if (levelIndex >= b.fromLevel && b.fromLevel > best) {
      best = b.fromLevel;
      cash = b.cash;
    }
  }
  return cash;
}
