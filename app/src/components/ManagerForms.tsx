"use client";

import { useActionState } from "react";
import type { ManagerFormState } from "@/app/actions/manager";

type Action = (prev: ManagerFormState, fd: FormData) => Promise<ManagerFormState>;

function Note({ s }: { s: ManagerFormState }) {
  return (
    <>
      {s.error ? <span role="alert" className="msg msg-error">{s.error}</span> : null}
      {s.ok ? <span role="status" className="msg msg-ok">{s.ok}</span> : null}
    </>
  );
}

/** Give a person extra learning time this week. */
export function AssignTimeForm({ action, staffId, name }: { action: Action; staffId: string; name: string }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="inline-form">
      <input type="hidden" name="staffId" value={staffId} />
      <label className="sr-only" htmlFor={`m-${staffId}`}>Minutes of learning time for {name}</label>
      <select id={`m-${staffId}`} name="minutes" defaultValue="30" className="input input-sm">
        {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
      </select>
      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm">Assign time</button>
      <Note s={state} />
    </form>
  );
}

/** Ask a person to take an Academy course, with an optional due date and a short note. */
export function AssignCourseForm({ action, staffId, name, courses }: { action: Action; staffId: string; name: string; courses: { id: string; title: string }[] }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="inline-form" style={{ flexWrap: "wrap" }}>
      <input type="hidden" name="staffId" value={staffId} />
      <label className="sr-only" htmlFor={`c-${staffId}`}>Course for {name}</label>
      <select id={`c-${staffId}`} name="courseId" className="input input-sm" defaultValue={courses[0]?.id}>
        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      <label className="sr-only" htmlFor={`d-${staffId}`}>Due date</label>
      <input id={`d-${staffId}`} type="date" name="due" className="input input-sm" />
      <label className="sr-only" htmlFor={`n-${staffId}`}>Note</label>
      <input id={`n-${staffId}`} type="text" name="note" maxLength={200} placeholder="Note (optional)" className="input input-sm" />
      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm">Assign course</button>
      <Note s={state} />
    </form>
  );
}

export function RemoveCourseForm({ action, staffId, courseId, title }: { action: Action; staffId: string; courseId: string; title: string }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="inline-form">
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="courseId" value={courseId} />
      <button type="submit" disabled={pending} className="sf-link danger" aria-label={`Remove ${title}`}>Remove</button>
      <Note s={state} />
    </form>
  );
}
