"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { declareGiftAction, requestPreclearanceAction } from "@/app/actions/compliance";
import { getMine } from "@/lib/client/api";
import type { ComplianceView } from "@/lib/server/compliance/service";

type Tab = "standing" | "preclear" | "gifts" | "rules";
const money = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const when = (t: number) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const NOTE = "Practice only. The desk teaches the rules; nothing here is real compliance advice.";

/** Compliance Desk: your standing, personal-dealing pre-clearance, the gifts register, the restricted list and the regulators. */
export function ComplianceApp() {
  const [v, setV] = useState<ComplianceView | null>(null);
  const [tab, setTab] = useState<Tab>("standing");
  const load = useCallback(() => {
    getMine<ComplianceView>("compliance").then(setV).catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  if (!v) return <p className="phone-note">Loading…</p>;
  const tabs: [Tab, string][] = [["standing", "Standing"], ["preclear", "Pre-clear"], ["gifts", "Gifts"], ["rules", "Rules"]];
  return (
    <div className="people compliance">
      <div className="seg" role="tablist">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === "standing" ? <Standing v={v} /> : null}
      {tab === "preclear" ? <Preclear v={v} onDone={load} /> : null}
      {tab === "gifts" ? <Gifts v={v} onDone={load} /> : null}
      {tab === "rules" ? <Rules v={v} /> : null}
      <p className="phone-note">{NOTE}</p>
    </div>
  );
}

function Standing({ v }: { v: ComplianceView }) {
  const s = v.standing;
  return (
    <>
      <div className="role-card">
        <small>Your compliance standing</small>
        <strong>{s.label}</strong>
        <small>{s.complianceCertified} of {s.complianceCourses} compliance courses certified</small>
      </div>
      <div className="people-row"><span className="chat-main"><strong>{s.clientBreaches}</strong><small>client conversations with a breach recorded</small></span></div>
      <div className="people-row"><span className="chat-main"><strong>{s.rejectedRequests}</strong><small>pre-clearance requests turned down</small></span></div>
      <div className="people-row"><span className="chat-main"><strong>{s.declinedGifts}</strong><small>offers you were told to decline</small></span></div>
      <p className="phone-note">A breach is a chance to learn. Finish the compliance courses in the Academy to build your standing.</p>
    </>
  );
}

function Preclear({ v, onDone }: { v: ComplianceView; onDone: () => void }) {
  const [now] = useState(() => Date.now());
  const [inst, setInst] = useState(v.instruments[0]?.id ?? "");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [units, setUnits] = useState(10);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const ask = () => {
    if (busy) return;
    start(async () => {
      const r = await requestPreclearanceAction(inst, side, units);
      if (!r.ok) setMsg({ ok: false, text: r.error });
      else setMsg({ ok: r.decision.status === "approved", text: `${r.decision.status === "approved" ? "Approved" : "Not approved"}: ${r.decision.reason}` });
      onDone();
    });
  };
  return (
    <>
      <p className="phone-note">{v.requirePreclearance ? "Before you trade in the practice market you need an approved pre-clearance. Each one covers a single trade." : "Pre-clearance is optional right now, but it is good practice. Your admin may switch it on."} The desk approves deals up to {money(v.maxDealValue)} that are not on the restricted list.</p>
      <label className="trade-label" htmlFor="pc-inst">Share or fund</label>
      <select id="pc-inst" className="people-unit" value={inst} onChange={(e) => setInst(e.target.value)}>
        {v.instruments.map((i) => <option key={i.id} value={i.id}>{i.restricted ? "🔒 " : ""}{i.name}</option>)}
      </select>
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={side === "buy"} className={side === "buy" ? "on" : ""} onClick={() => setSide("buy")}>Buy</button>
        <button type="button" role="tab" aria-selected={side === "sell"} className={side === "sell" ? "on" : ""} onClick={() => setSide("sell")}>Sell</button>
      </div>
      <label className="trade-label" htmlFor="pc-units">Units</label>
      <input id="pc-units" className="chat-find" type="number" min={1} max={1000000} value={units} onChange={(e) => setUnits(Math.max(1, Math.min(1_000_000, Math.floor(Number(e.target.value) || 1))))} />
      {msg ? <p role="status" className={msg.ok ? "chat-note ok" : "chat-note"}>{msg.text}</p> : null}
      <button type="button" className="kudos-send" disabled={busy || !inst} onClick={ask}>Ask for pre-clearance</button>
      <h3 className="people-h">Your requests</h3>
      {v.preclear.length === 0 ? <p className="phone-note">None yet.</p> : null}
      {v.preclear.map((p) => (
        <div key={p.id} className="people-row">
          <span className="chat-main"><strong>{p.status === "approved" ? "✅" : "⛔"} {p.side === "buy" ? "Buy" : "Sell"} {p.units} × {p.name}</strong><small>{money(p.value)} · {when(p.at)}{p.status === "approved" ? (p.used ? " · used" : p.validUntil > now ? ` · valid until ${when(p.validUntil)}` : " · expired") : ""}</small><small>{p.reason}</small></span>
        </div>
      ))}
    </>
  );
}

function Gifts({ v, onDone }: { v: ComplianceView; onDone: () => void }) {
  const [kind, setKind] = useState(v.giftKinds[0]?.id ?? "");
  const [value, setValue] = useState(10_000);
  const [from, setFrom] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const declare = () => {
    if (busy) return;
    start(async () => {
      const r = await declareGiftAction(kind, value, from);
      if (!r.ok) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: r.entry.outcome === "recorded", text: r.entry.advice });
        setFrom("");
      }
      onDone();
    });
  };
  return (
    <>
      <p className="phone-note">Offered a gift, meal or entertainment? Declare it here and the desk tells you what to do. Up to {money(v.giftRecordLimit)}: recorded and may be accepted. Up to {money(v.giftDeclineLimit)}: wait for approval. Above that, or any cash: decline.</p>
      <div className="kudos-values" role="radiogroup" aria-label="Kind of offer">
        {v.giftKinds.map((k) => <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`kudos-chip${kind === k.id ? " on" : ""}`} onClick={() => setKind(k.id)}>{k.icon} {k.label}</button>)}
      </div>
      <label className="trade-label" htmlFor="gift-value">Value (practice naira)</label>
      <input id="gift-value" className="chat-find" type="number" min={0} value={value} onChange={(e) => setValue(Math.max(0, Number(e.target.value) || 0))} />
      <label className="trade-label" htmlFor="gift-from">Who offered it?</label>
      <input id="gift-from" className="chat-find" maxLength={60} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="A client or supplier name" />
      {msg ? <p role="status" className={msg.ok ? "chat-note ok" : "chat-note"}>{msg.text}</p> : null}
      <button type="button" className="kudos-send" disabled={busy || from.trim().length < 2} onClick={declare}>Declare it</button>
      <h3 className="people-h">Your register</h3>
      {v.gifts.length === 0 ? <p className="phone-note">Nothing declared yet.</p> : null}
      {v.gifts.map((g) => (
        <div key={`${g.at}-${g.kind}`} className="people-row">
          <span className="chat-main"><strong>{g.outcome === "recorded" ? "✅" : g.outcome === "approval" ? "⏳" : "⛔"} {g.label} · {money(g.value)}</strong><small>From {g.from} · {when(g.at)}</small><small>{g.advice}</small></span>
        </div>
      ))}
    </>
  );
}

function Rules({ v }: { v: ComplianceView }) {
  const restricted = v.instruments.filter((i) => i.restricted);
  return (
    <>
      <h3 className="people-h">Restricted list</h3>
      {restricted.length === 0 ? <p className="phone-note">Nothing is restricted right now.</p> : null}
      {restricted.map((i) => <div key={i.id} className="people-row"><span className="chat-main"><strong>🔒 {i.name}</strong><small>{i.restricted}</small></span></div>)}
      <h3 className="people-h">Regulators and bodies</h3>
      {v.regulators.map((r) => <div key={r.id} className="people-row"><span className="chat-main"><strong>{r.name}{r.confirmed ? "" : " (to be confirmed)"}</strong><small>{r.fullName}</small><small>{r.role}</small></span></div>)}
    </>
  );
}
