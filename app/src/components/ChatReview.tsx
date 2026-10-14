"use client";

import { useActionState } from "react";

interface State {
  ok?: string;
  error?: string;
}
type Action = (prev: State, fd: FormData) => Promise<State>;

/** What the review team can do about a reported message. */
export function ChatReviewForm({ action, reportId, open }: { action: Action; reportId: string; open: boolean }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="inline-form" style={{ flexWrap: "wrap" }}>
      <input type="hidden" name="reportId" value={reportId} />
      <button type="submit" name="action" value="remove" disabled={pending} className="btn btn-sm">Remove message</button>
      <button type="submit" name="action" value="mute-day" disabled={pending} className="btn btn-ghost btn-sm">Remove and pause sender 1 day</button>
      <button type="submit" name="action" value="mute-week" disabled={pending} className="btn btn-ghost btn-sm">Remove and pause sender 7 days</button>
      {open ? <button type="submit" name="action" value="dismiss" disabled={pending} className="btn btn-ghost btn-sm">Dismiss (message is fine)</button> : null}
      {state.error ? <span role="alert" className="msg msg-error">{state.error}</span> : null}
      {state.ok ? <span role="status" className="msg msg-ok">{state.ok}</span> : null}
    </form>
  );
}
