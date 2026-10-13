"use client";

import { useActionState } from "react";

interface State {
  error?: string;
  ok?: string;
}
type Action = (prev: State, formData: FormData) => Promise<State>;

/** Move a course to another group, or out of every group. */
export function MoveCourseForm({ action, id, group, groups }: { action: Action; id: string; group: string; groups: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`g-${id}`}>Group for {id}</label>
      <select id={`g-${id}`} name="group" defaultValue={group} className="input input-sm">
        <option value="">No group (More courses)</option>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>
      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm">Move</button>
      {state.error ? <span role="alert" className="msg msg-error">{state.error}</span> : null}
      {state.ok ? <span role="status" className="msg msg-ok">{state.ok}</span> : null}
    </form>
  );
}

/** Edit a whole course as JSON: lessons, notes, questions at three levels, scenarios and case studies. */
export function CourseEditor({ action, initial }: { action: Action; initial: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="stack">
      <label htmlFor="course-json">Course (JSON)</label>
      <textarea id="course-json" name="json" defaultValue={initial} rows={28} spellCheck={false} className="input" style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: ".82rem" }} />
      <button type="submit" disabled={pending} className="btn">{pending ? "Saving…" : "Save course"}</button>
      {state.error ? <span role="alert" className="msg msg-error">{state.error}</span> : null}
      {state.ok ? <span role="status" className="msg msg-ok">{state.ok}</span> : null}
    </form>
  );
}
