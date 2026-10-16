"use client";

import { useState, useTransition } from "react";
import { serveInternalAction } from "@/app/actions/arrivals";
import type { ArrivalsView, InternalResult, VisitorView } from "@/lib/server/arrivals/service";
import { ConsequencePanel } from "@/components/ConsequencePanel";
import { ClientsApp } from "./ClientsApp";

type Ok = Extract<InternalResult, { ok: true }>;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Reception: the clients waiting to be seen (appointments and walk-ins) and the colleagues who need something from you. */
export function ReceptionPanel({ view, onView, onClose }: { view: ArrivalsView | null; onView: (v: ArrivalsView) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"clients" | "colleagues">("clients");
  const colleagues = view?.waiting.filter((w) => w.kind === "internal") ?? [];
  const clients = view?.waiting.filter((w) => w.kind !== "internal") ?? [];
  return (
    <div className="me-panel person-card reception" role="dialog" aria-label="Reception">
      <div className="grab" aria-hidden="true" />
      <header className="me-head">
        <span className="kbd-badge" aria-hidden="true">🛎️</span>
        <div className="me-id">
          <h2>Reception</h2>
          <p>{view ? `${view.waiting.length} waiting · ${view.served} seen · ${view.later} more expected today` : "Loading…"}</p>
        </div>
        <button type="button" className="round-btn sm" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="me-body">
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "clients"} className={tab === "clients" ? "on" : ""} onClick={() => setTab("clients")}>Clients{clients.length > 0 ? ` (${clients.length})` : ""}</button>
          <button type="button" role="tab" aria-selected={tab === "colleagues"} className={tab === "colleagues" ? "on" : ""} onClick={() => setTab("colleagues")}>Colleagues{colleagues.length > 0 ? ` (${colleagues.length})` : ""}</button>
        </div>
        {tab === "clients" ? <ClientsApp onChange={() => undefined} /> : <Colleagues list={colleagues} onView={onView} />}
      </div>
    </div>
  );
}

function Colleagues({ list, onView }: { list: VisitorView[]; onView: (v: ArrivalsView) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [result, setResult] = useState<{ who: string; r: Ok } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const visitor = list.find((w) => w.id === open);

  const answer = (v: VisitorView, i: number) => {
    if (busy) return;
    start(async () => {
      const r = await serveInternalAction(v.id, i);
      if (!r.ok) return setErr(r.error);
      setErr(null);
      setOpen(null);
      setResult({ who: v.name, r });
      onView(r.view);
    });
  };

  if (result) {
    const r = result.r;
    return (
      <div className="people clientdesk">
        <div className={`role-card ${r.verdict}`} role="status">
          <strong>{result.who}</strong>
          <span>{r.verdict === "best" ? "Well handled" : r.verdict === "partly" ? "Not bad, but there was a better way" : "Not quite"}{r.points > 0 ? ` · +${r.points} Merit points` : ""}</span>
          <small>{r.feedback}</small>
        </div>
        <ConsequencePanel consequence={r.consequence} comesBack={r.comesBack} nextTitle={r.nextTitle} />
        <button type="button" className="primary-wide" onClick={() => setResult(null)}>Continue</button>
      </div>
    );
  }
  if (visitor?.situation) {
    return (
      <div className="people clientdesk">
        <div className="role-card"><strong>{visitor.name}</strong><span>{visitor.situation.title}</span><small>{visitor.situation.story}</small></div>
        {visitor.situation.choices.map((c, i) => <button key={i} type="button" className="client-option" disabled={busy} onClick={() => answer(visitor, i)}>{c}</button>)}
        {err ? <p role="alert" className="chat-note">{err}</p> : null}
        <button type="button" className="linklike" onClick={() => setOpen(null)}>‹ Back to the list</button>
      </div>
    );
  }
  return (
    <div className="people clientdesk">
      {list.length === 0 ? <p className="phone-note">No colleagues are waiting. Requests come through the day.</p> : null}
      {list.map((w) => (
        <button key={w.id} type="button" className="chat-row quote" onClick={() => setOpen(w.id)}>
          <span className="chat-ico" aria-hidden="true">🙋</span>
          <span className="chat-main"><strong>{w.name}</strong><small>{w.situation?.title}</small></span>
          <span className="quote-price"><small>{mmss(Math.max(0, w.patience - w.waited))} left</small></span>
        </button>
      ))}
      {err ? <p role="alert" className="chat-note">{err}</p> : null}
    </div>
  );
}
