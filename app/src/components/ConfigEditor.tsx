"use client";

import { useActionState } from "react";
import type { ActionState } from "./ActionForm";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ConfigEditor({
  configKey,
  initialJson,
  saveAction,
  resetAction,
}: {
  configKey: string;
  initialJson: string;
  saveAction: Action;
  resetAction: Action;
}) {
  const [saveState, save, saving] = useActionState(saveAction, {});
  const [resetState, reset, resetting] = useActionState(resetAction, {});
  return (
    <div className="stack">
      <form action={save} className="stack">
        <input type="hidden" name="key" value={configKey} />
        <label htmlFor="json" className="label">Value (JSON)</label>
        <textarea id="json" name="json" defaultValue={initialJson} rows={24} spellCheck={false} className="code" maxLength={100000} />
        <div className="row">
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
        {saveState.error ? <pre role="alert" className="msg msg-error pre">{saveState.error}</pre> : null}
        {saveState.ok ? <p role="status" className="msg msg-ok">{saveState.ok}</p> : null}
      </form>
      <form
        action={reset}
        onSubmit={(e) => {
          if (!window.confirm("Restore the original default for this setting? Your current value is kept in history.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="key" value={configKey} />
        <button type="submit" className="btn btn-ghost" disabled={resetting}>Restore default</button>
        {resetState.error ? <pre role="alert" className="msg msg-error pre">{resetState.error}</pre> : null}
        {resetState.ok ? <p role="status" className="msg msg-ok">{resetState.ok}</p> : null}
      </form>
    </div>
  );
}
