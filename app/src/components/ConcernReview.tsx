"use client";

import { useActionState } from "react";
import { CONCERN_STATUSES, STATUS_LABEL, type ConcernStatus } from "@/lib/concerns";

interface State {
  error?: string;
  ok?: string;
}
type Action = (prev: State, formData: FormData) => Promise<State>;

export function ConcernReview({ action, id, status, notes }: { action: Action; id: string; status: ConcernStatus; notes: { at: string; by: string; text: string }[] }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="card stack">
      <h2>Review</h2>
      {notes.map((n, i) => (
        <div key={i} className="me-row" style={{ alignItems: "flex-start" }}>
          <span style={{ whiteSpace: "pre-wrap" }}>{n.text}</span>
          <span className="muted small">{n.by} · {n.at}</span>
        </div>
      ))}
      <form action={formAction} className="stack">
        <input type="hidden" name="id" value={id} />
        <label htmlFor="cr-status">Status</label>
        <select id="cr-status" name="status" defaultValue={status} className="input">
          {CONCERN_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <label htmlFor="cr-note">Add a note (optional)</label>
        <textarea id="cr-note" name="note" rows={4} maxLength={2000} className="input" placeholder="What was done, who was spoken to, the outcome." />
        <button type="submit" disabled={pending} className="btn">{pending ? "Saving…" : "Save"}</button>
        {state.error ? <span role="alert" className="msg msg-error">{state.error}</span> : null}
        {state.ok ? <span role="status" className="msg msg-ok">{state.ok}</span> : null}
      </form>
    </div>
  );
}
