"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { tradeAction } from "@/app/actions/market";
import { getMine } from "@/lib/client/api";
import type { HoldingView, MarketView, PortfolioView, QuoteView } from "@/lib/server/market/service";

const money = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${n > 0 ? "+" : ""}${n}%`;
const tone = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "flat");

const NOTE = "Practice money and fictional prices, for learning only. Not real money and never investment advice.";

type Pick = { id: string; name: string; price: number; owned: number; restricted: string | null; side: "buy" | "sell" };

/** Buy or sell whole units at the current practice price. The server sets the price and checks every rule. */
function TradeSheet({ pick, feePct, onClose, onDone }: { pick: Pick; feePct: number; onClose: () => void; onDone: () => void }) {
  const [side, setSide] = useState<"buy" | "sell">(pick.side);
  const [units, setUnits] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const gross = Math.round(pick.price * units * 100) / 100;
  const fee = Math.round(gross * (feePct / 100) * 100) / 100;
  const total = side === "buy" ? gross + fee : gross - fee;

  const go = () => {
    if (busy) return;
    start(async () => {
      const r = await tradeAction(side, pick.id, units);
      if (r.ok) {
        setMsg({ ok: true, text: r.message });
        onDone();
      } else setMsg({ ok: false, text: r.error });
    });
  };

  return (
    <div className="trade-sheet" role="dialog" aria-label={`Trade ${pick.name}`}>
      <div className="trade-head">
        <strong>{pick.name}</strong>
        <button type="button" className="back" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p className="trade-price">{money(pick.price)} per unit · you hold {pick.owned}</p>
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={side === "buy"} className={side === "buy" ? "on" : ""} onClick={() => setSide("buy")}>Buy</button>
        <button type="button" role="tab" aria-selected={side === "sell"} className={side === "sell" ? "on" : ""} onClick={() => setSide("sell")}>Sell</button>
      </div>
      {pick.restricted && side === "buy" ? <p className="chat-note">🔒 {pick.restricted}</p> : null}
      <label htmlFor="trade-units" className="trade-label">Units</label>
      <input id="trade-units" className="chat-find" type="number" min={1} max={1000000} step={1} value={units} onChange={(e) => setUnits(Math.max(1, Math.min(1_000_000, Math.floor(Number(e.target.value) || 1))))} />
      <p className="trade-total">{side === "buy" ? "You pay" : "You receive"} <strong>{money(Math.max(0, total))}</strong> <small>(fee {money(fee)})</small></p>
      {msg ? <p role="status" className={msg.ok ? "chat-note ok" : "chat-note"}>{msg.text}</p> : null}
      <button type="button" className="kudos-send" disabled={busy || (side === "buy" && !!pick.restricted)} onClick={go}>{side === "buy" ? "Buy" : "Sell"} {units}</button>
      <p className="phone-note">{NOTE}</p>
    </div>
  );
}

/** Market: the fictional instruments, their prices and today's market state. */
export function MarketApp() {
  const [m, setM] = useState<MarketView | null>(null);
  const [kind, setKind] = useState("");
  const [pick, setPick] = useState<Pick | null>(null);
  const load = useCallback(() => {
    getMine<MarketView>("market", "?kind=market").then(setM).catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  if (!m) return <p className="phone-note">Loading…</p>;
  const rows = m.quotes.filter((q) => !kind || q.kind === kind);
  const open = (q: QuoteView) => setPick({ id: q.id, name: q.name, price: q.price, owned: q.owned, restricted: q.restricted, side: "buy" });
  return (
    <div className="people market">
      <div className="market-state">{m.state.icon} <strong>{m.state.label}</strong><small>Cash {money(m.cash)} · {m.tradesLeft} trades left today</small></div>
      <div className="kudos-values" role="tablist" aria-label="Kinds">
        <button type="button" role="tab" aria-selected={kind === ""} className={`kudos-chip${kind === "" ? " on" : ""}`} onClick={() => setKind("")}>All</button>
        {m.kinds.map((k) => <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className={`kudos-chip${kind === k.id ? " on" : ""}`} onClick={() => setKind(k.id)}>{k.icon} {k.label}</button>)}
      </div>
      {rows.map((q) => (
        <button key={q.id} type="button" className="chat-row quote" onClick={() => open(q)}>
          <span className="chat-main"><strong>{q.restricted ? "🔒 " : ""}{q.name}</strong><small>{q.owned > 0 ? `You hold ${q.owned}` : m.kinds.find((k) => k.id === q.kind)?.label}</small></span>
          <span className="quote-price"><strong>{money(q.price)}</strong><small className={`chg ${tone(q.changePct)}`}>{pct(q.changePct)} today</small></span>
        </button>
      ))}
      <p className="phone-note">{NOTE}</p>
      {pick ? <TradeSheet pick={pick} feePct={m.feePct} onClose={() => setPick(null)} onDone={load} /> : null}
    </div>
  );
}

/** My Portfolio: practice cash, what you hold, how it is doing and your recent trades. */
export function PortfolioApp() {
  const [p, setP] = useState<PortfolioView | null>(null);
  const [m, setM] = useState<MarketView | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const load = useCallback(() => {
    getMine<PortfolioView>("market", "?kind=portfolio").then(setP).catch(() => undefined);
    getMine<MarketView>("market", "?kind=market").then(setM).catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  if (!p) return <p className="phone-note">Loading…</p>;
  const sell = (h: HoldingView) => setPick({ id: h.id, name: h.name, price: h.price, owned: h.units, restricted: null, side: "sell" });
  return (
    <div className="people market">
      <div className="role-card">
        <small>Practice portfolio value</small>
        <strong>{money(p.total)}</strong>
        <span className={`chg ${tone(p.pnl)}`}>{p.pnl >= 0 ? "+" : ""}{money(p.pnl)} ({pct(p.pnlPct)}) since you started with {money(p.startCash)}</span>
        <small>Cash {money(p.cash)} · Invested {money(p.invested)}</small>
      </div>
      <h3 className="people-h">Holdings</h3>
      {p.holdings.length === 0 ? <p className="phone-note">You hold nothing yet. Open Market to make your first practice trade.</p> : null}
      {p.holdings.map((h) => (
        <button key={h.id} type="button" className="chat-row quote" onClick={() => sell(h)}>
          <span className="chat-main"><strong>{h.name}</strong><small>{h.units} units · cost {money(h.cost)}{h.sellableAt ? " · holding period" : ""}</small></span>
          <span className="quote-price"><strong>{money(h.value)}</strong><small className={`chg ${tone(h.pnl)}`}>{h.pnl >= 0 ? "+" : ""}{money(h.pnl)}</small></span>
        </button>
      ))}
      <h3 className="people-h">Recent trades</h3>
      {p.trades.length === 0 ? <p className="phone-note">No trades yet.</p> : null}
      {p.trades.map((t) => (
        <div key={`${t.at}-${t.id}`} className="people-row">
          <span className="chat-main"><strong>{t.side === "buy" ? "Bought" : "Sold"} {t.units} × {t.name}</strong><small>{money(t.price)} each · fee {money(t.fee)} · {new Date(t.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></span>
        </div>
      ))}
      <p className="phone-note">{NOTE}</p>
      {pick && m ? <TradeSheet pick={pick} feePct={m.feePct} onClose={() => setPick(null)} onDone={load} /> : null}
    </div>
  );
}
