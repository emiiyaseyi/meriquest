"use client";

import { useActionState } from "react";
import type { ActionState } from "./ActionForm";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function RoleForm({ action, staffId, role }: { action: Action; staffId: string; role: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="staffId" value={staffId} />
      <label className="sr-only" htmlFor={`role-${staffId}`}>Role for {staffId}</label>
      <select id={`role-${staffId}`} name="role" defaultValue={role} className="input input-sm">
        <option value="player">player</option>
        <option value="manager">manager</option>
        <option value="reviewer">reviewer</option>
        <option value="admin">admin</option>
      </select>
      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm">Set role</button>
      {state.error ? <span role="alert" className="msg msg-error">{state.error}</span> : null}
      {state.ok ? <span role="status" className="msg msg-ok">{state.ok}</span> : null}
    </form>
  );
}

export function PathForm({
  action,
  staffId,
  paths,
  current,
}: {
  action: Action;
  staffId: string;
  paths: { id: string; name: string }[];
  current: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="staffId" value={staffId} />
      <label className="sr-only" htmlFor={`path-${staffId}`}>Path for {staffId}</label>
      <select id={`path-${staffId}`} name="pathId" defaultValue={current} className="input input-sm" required>
        <option value="" disabled>Choose…</option>
        {paths.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="btn btn-ghost btn-sm">Set path</button>
      {state.error ? <span role="alert" className="msg msg-error">{state.error}</span> : null}
      {state.ok ? <span role="status" className="msg msg-ok">{state.ok}</span> : null}
    </form>
  );
}

export function CreateStaffForm({ action, example }: { action: Action; example: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid-form">
      <label className="label" htmlFor="c-staffId">Staff ID</label>
      <input id="c-staffId" name="staffId" required maxLength={20} placeholder={example} className="input" />
      <label className="label" htmlFor="c-name">Full name</label>
      <input id="c-name" name="name" required minLength={2} maxLength={80} className="input" />
      <label className="label" htmlFor="c-email">Work email</label>
      <input id="c-email" name="email" type="email" required maxLength={120} className="input" />
      <label className="label" htmlFor="c-title">Job title</label>
      <input id="c-title" name="title" required minLength={2} maxLength={80} className="input" />
      <label className="label" htmlFor="c-unit">Unit (e.g. cx, wealth, invest)</label>
      <input id="c-unit" name="unit" required maxLength={20} pattern="[a-z0-9-]+" className="input" />
      <label className="label" htmlFor="c-segment">Office segment</label>
      <select id="c-segment" name="segment" defaultValue="front" className="input">
        <option value="front">front</option>
        <option value="middle">middle</option>
        <option value="back">back</option>
      </select>
      <label className="label" htmlFor="c-role">Role</label>
      <select id="c-role" name="role" defaultValue="player" className="input">
        <option value="player">player</option>
        <option value="manager">manager</option>
        <option value="reviewer">reviewer</option>
        <option value="admin">admin</option>
      </select>
      <label className="label" htmlFor="c-tenure">Years at Meristem</label>
      <input id="c-tenure" name="tenureYears" type="number" min={0} max={60} step={0.5} defaultValue={0} required className="input" />
      <label className="check"><input type="checkbox" name="isLineManager" /> Line manager</label>
      <div className="row">
        <button type="submit" className="btn" disabled={pending}>{pending ? "Adding…" : "Add staff member"}</button>
      </div>
      {state.error ? <p role="alert" className="msg msg-error">{state.error}</p> : null}
      {state.ok ? <p role="status" className="msg msg-ok">{state.ok}</p> : null}
    </form>
  );
}
