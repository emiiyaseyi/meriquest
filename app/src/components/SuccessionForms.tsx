"use client";

import { useActionState } from "react";

interface State {
  ok?: string;
  error?: string;
}
type Action = (prev: State, fd: FormData) => Promise<State>;

function Note({ s }: { s: State }) {
  return (
    <>
      {s.error ? <span role="alert" className="msg msg-error">{s.error}</span> : null}
      {s.ok ? <span role="status" className="msg msg-ok">{s.ok}</span> : null}
    </>
  );
}

/** Name a successor for a line manager's role, and say how soon they could be ready. */
export function NominateForm({ action, incumbent, people }: { action: Action; incumbent: string; people: { staffId: string; label: string }[] }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="inline-form" style={{ flexWrap: "wrap" }}>
      <input type="hidden" name="incumbent" value={incumbent} />
      <label className="sr-only" htmlFor={`s-${incumbent}`}>Successor for {incumbent}</label>
      <select id={`s-${incumbent}`} name="successor" className="input input-sm" defaultValue={people[0]?.staffId}>
        {people.map((p) => <option key={p.staffId} value={p.staffId}>{p.label}</option>)}
      </select>
      <label className="sr-only" htmlFor={`r-${incumbent}`}>How soon</label>
      <select id={`r-${incumbent}`} name="readiness" className="input input-sm" defaultValue="1-2">
        <option value="now">Ready now</option>
        <option value="1-2">Ready in 1 to 2 years</option>
        <option value="3+">Ready in 3 or more years</option>
      </select>
      <label className="sr-only" htmlFor={`n-${incumbent}`}>Note</label>
      <input id={`n-${incumbent}`} name="note" type="text" maxLength={200} placeholder="Note (optional)" className="input input-sm" />
      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm">Add successor</button>
      <Note s={state} />
    </form>
  );
}

export function RemoveNominationForm({ action, id, name }: { action: Action; id: string; name: string }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="sf-link danger" aria-label={`Remove ${name}`}>Remove</button>
      <Note s={state} />
    </form>
  );
}
