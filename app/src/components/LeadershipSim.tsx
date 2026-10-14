"use client";

import { useEffect, useState, useTransition } from "react";
import { answerLeadAction, getLeadAction, startLeadAction } from "@/app/actions/leadership";
import type { LeadResult, LeadView } from "@/lib/server/leadership/service";

type Ok = Extract<LeadResult, { ok: true }>;

/**
 * The leadership simulator: a short run of people-management decisions. Each choice moves meters such as team morale,
 * delivery, client trust and compliance, and the run is rated at the end. The server decides what each choice does.
 */
export function LeadershipSim({ onBack, kind = "leadership" }: { onBack: () => void; kind?: "leadership" | "clientsim" }) {
  const client = kind === "clientsim";
  const [view, setView] = useState<LeadView | null>(null);
  const [last, setLast] = useState<Ok | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  useEffect(() => {
    let live = true;
    void getLeadAction(kind).then((v) => live && setView(v));
    return () => {
      live = false;
    };
  }, [kind]);

  const run = (fn: () => Promise<LeadResult>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setView(r.view);
      setLast(r);
    });

  const meters = last?.finished?.meters ?? view?.meters ?? [];

  return (
    <>
      <button type="button" className="ac-back" onClick={onBack}>‹ Academy</button>
      <div className="ac-hero">
        <p className="ac-kicker">{client ? "CLIENT SIMULATION" : "LEADERSHIP SIMULATOR"}</p>
        <h3>{client ? "Handle real client situations" : "Lead a team through real decisions"}</h3>
        <p>{client ? "Each choice moves your meters: client trust, compliance, revenue and risk control. Cases are drawn for your unit. There is rarely a perfect answer, but there is usually a better one." : "Each choice moves your meters. Keep the team, the work, your clients and the rules in balance. There is rarely a perfect answer, but there is usually a better one."}</p>
        {view ? <span className="ac-pill">Runs today: {view.today.count}/{view.today.max}</span> : null}
      </div>
      {error ? <p role="alert" className="msg msg-error">{error}</p> : null}
      {!view ? <p className="phone-note">Loading…</p> : null}

      <div className="lead-meters" role="group" aria-label="Meters">
        {meters.map((m) => (
          <div key={m.id} className="lead-meter">
            <span>{m.icon} {m.label}</span>
            <div className="bar"><span style={{ width: `${m.value}%`, background: m.value < 35 ? "#c0392b" : m.value < 55 ? "#e0a82e" : "#2d5d41" }} /></div>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>

      {last?.feedback ? (
        <div className="lead-feedback" role="status">
          <p style={{ margin: 0 }}>{last.feedback}</p>
          {last.changes && last.changes.length > 0 ? (
            <p className="lead-changes">
              {last.changes.map((c) => (
                <span key={c.label} className={c.delta > 0 ? "up" : "down"}>{c.icon} {c.label} {c.delta > 0 ? `+${c.delta}` : c.delta}</span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}

      {last?.finished ? (
        <div className={`ac-result ${last.finished.rating === "learning" ? "fail" : "pass"}`}>
          <p className="ac-kicker">RUN FINISHED</p>
          <h3 style={{ margin: 0 }}>{last.finished.rating === "great" ? "Great leadership" : last.finished.rating === "good" ? "Good leadership" : "A learning run"}</h3>
          <p style={{ margin: 0 }}>You earned {last.finished.points} Merit points.{last.finished.rating === "learning" ? " Try again and look at which meter fell the furthest." : ""}</p>
        </div>
      ) : null}

      {view?.run ? (
        <div className="ac-notes-card">
          <p className="ac-kicker">DECISION {view.run.round} OF {view.run.total}</p>
          <h3 style={{ margin: 0 }}>{view.run.scenario.title}</h3>
          <p className="ac-notes">{view.run.scenario.story}</p>
          <div className="stack" style={{ gap: 8 }}>
            {view.run.scenario.choices.map((c, i) => (
              <button key={i} type="button" className="ac-opt" disabled={busy} onClick={() => run(() => answerLeadAction(i, kind))}>{c}</button>
            ))}
          </div>
        </div>
      ) : view ? (
        <button type="button" className="primary-wide" disabled={busy || view.today.count >= view.today.max} onClick={() => { setLast(null); run(() => startLeadAction(kind)); }}>
          {view.today.count >= view.today.max ? "Come back tomorrow" : last?.finished ? "Start another run" : "Start a run"}
        </button>
      ) : null}
    </>
  );
}
