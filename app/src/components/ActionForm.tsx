"use client";

import { useActionState } from "react";

export interface ActionState {
  error?: string;
  ok?: string;
}

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Small admin form: hidden fields + one submit button, with the result shown inline.
 * `confirmText` asks before running destructive actions.
 */
export function ActionForm({
  action,
  fields,
  label,
  confirmText,
  danger,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  confirmText?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline-form"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" disabled={pending} className={danger ? "btn btn-danger btn-sm" : "btn btn-ghost btn-sm"}>
        {pending ? "Working…" : label}
      </button>
      {state.error ? <span role="alert" className="msg msg-error">{state.error}</span> : null}
      {state.ok ? <span role="status" className="msg msg-ok">{state.ok}</span> : null}
    </form>
  );
}
