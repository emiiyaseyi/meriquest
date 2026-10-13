"use client";

import { useActionState } from "react";

interface State {
  error?: string;
  ok?: string;
}
type Action = (prev: State, formData: FormData) => Promise<State>;

export function AnnouncementForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="stack">
      <label htmlFor="an-title">Title</label>
      <input id="an-title" name="title" className="input" maxLength={80} required />
      <label htmlFor="an-text">Message</label>
      <textarea id="an-text" name="text" className="input" rows={4} maxLength={600} required />
      <button type="submit" disabled={pending} className="btn">{pending ? "Posting…" : "Post"}</button>
      {state.error ? <span role="alert" className="msg msg-error">{state.error}</span> : null}
      {state.ok ? <span role="status" className="msg msg-ok">{state.ok}</span> : null}
    </form>
  );
}
