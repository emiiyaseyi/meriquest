"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { answerClientAction, startClientAction } from "@/app/actions/clients";
import { getMine } from "@/lib/client/api";
import type { ClientFinish, ClientsView } from "@/lib/server/clients/service";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const OUTCOME: Record<string, string> = {
  invests: "decided to invest with us",
  thinking: "wants time to think about it",
  declines: "decided not to go ahead",
  stays: "is staying with us",
  leaves: "is thinking of leaving us",
};
const NOTE = "Fictional clients, for learning only. Not real client data and never advice.";

/** Clients: a few fictional clients each day. Go through four steps with each; the server scores your decisions. */
export function ClientsApp() {
  const [v, setV] = useState<ClientsView | null>(null);
  const [done, setDone] = useState<(ClientFinish & { name: string }) | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const load = useCallback(() => {
    getMine<ClientsView>("clients").then(setV).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const begin = (id: string) => {
    if (busy) return;
    setErr(null);
    setDone(null);
    start(async () => {
      const r = await startClientAction(id);
      if (r.ok) setV(r.view);
      else setErr(r.error);
    });
  };
  const answer = (id: string) => {
    if (busy || !v?.current) return;
    const name = v.current.client.name;
    setErr(null);
    start(async () => {
      const r = await answerClientAction(id);
      if (!r.ok) return setErr(r.error);
      setV(r.view);
      if (r.finished) setDone({ ...r.finished, name });
    });
  };

  if (!v) return <p className="phone-note">Loading…</p>;

  if (v.current) {
    const c = v.current;
    return (
      <div className="people clientdesk">
        <div className="role-card">
          <strong>{c.client.icon} {c.client.name}</strong>
          <span>{c.client.archetype}</span>
          <small>{c.client.story}</small>
          <small><em>{c.client.trait}</em></small>
        </div>
        <h3 className="people-h">Step {c.step} of {c.total}</h3>
        <p><strong>{c.prompt}</strong></p>
        {c.options.map((o) => <button key={o.id} type="button" className="client-option" disabled={busy} onClick={() => answer(o.id)}>{o.text}</button>)}
        {err ? <p role="alert" className="chat-note">{err}</p> : null}
      </div>
    );
  }

  return (
    <div className="people clientdesk">
      {done ? (
        <div className="role-card" role="status">
          <strong>{done.name}: {stars(done.csat)}</strong>
          <span>{done.name} {OUTCOME[done.outcome] ?? ""}.</span>
          <span>{done.nps === "promoter" ? "Would recommend us" : done.nps === "passive" ? "Satisfied" : "Unlikely to recommend us"}{done.points > 0 ? ` · +${done.points} Merit points` : ""}</span>
          {done.breaches.map((b) => <small key={b} className="chg down">⚠️ {b}</small>)}
          {done.notes.map((n) => <small key={n}>• {n}</small>)}
        </div>
      ) : null}
      <p className="phone-note">{v.left > 0 ? `${v.left} client${v.left === 1 ? "" : "s"} waiting today.` : "You have seen all of today's clients. New ones tomorrow."}{v.avgCsat !== null ? ` Your average rating: ${v.avgCsat} of 5 over ${v.served} clients.` : ""}</p>
      {v.queue.map((q) => (
        <button key={q.id} type="button" className="chat-row quote" disabled={busy || q.done !== null} onClick={() => begin(q.id)}>
          <span className="chat-ico" aria-hidden="true">{q.icon}</span>
          <span className="chat-main"><strong>{q.name}</strong><small>{q.type === "corporate" ? "Company · " : ""}{q.archetype}</small></span>
          <span className="quote-price">{q.done ? <strong>{stars(q.done.csat)}</strong> : <strong>Serve</strong>}</span>
        </button>
      ))}
      {err ? <p role="alert" className="chat-note">{err}</p> : null}
      <p className="phone-note">{NOTE}</p>
    </div>
  );
}
