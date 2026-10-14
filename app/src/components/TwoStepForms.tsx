"use client";

import { useActionState, useState, useTransition } from "react";
import { beginTwoStepAction, confirmTwoStepAction, disableTwoStepAction, type TwoStepState } from "@/app/actions/twostep";

/** Set up two-step sign-in: get a key for an authenticator app, enter a code to prove it works, then save the recovery codes. */
export function SetupTwoStep() {
  const [begin, setBegin] = useState<TwoStepState | null>(null);
  const [busy, start] = useTransition();
  const [state, confirm, pending] = useActionState(confirmTwoStepAction, {});

  if (state.recoveryCodes) {
    return (
      <div className="stack">
        <p role="status" className="msg msg-ok">{state.ok}</p>
        <p><strong>Save these recovery codes now.</strong> Each works once if you lose your phone. They will not be shown again.</p>
        <pre className="pre" aria-label="Recovery codes">{state.recoveryCodes.join("\n")}</pre>
      </div>
    );
  }
  if (!begin?.secret) {
    return (
      <div className="stack">
        {begin?.error ? <p role="alert" className="msg msg-error">{begin.error}</p> : null}
        <button type="button" className="btn" disabled={busy} onClick={() => start(async () => setBegin(await beginTwoStepAction()))}>Set up two-step sign-in</button>
      </div>
    );
  }
  return (
    <form action={confirm} className="stack" autoComplete="off">
      <p>1. In an authenticator app (such as Microsoft Authenticator or Google Authenticator) add an account with this key:</p>
      <pre className="pre" aria-label="Setup key">{begin.secret}</pre>
      <p className="muted small">Or open this link on your phone: <a href={begin.url}>add to authenticator</a></p>
      <label htmlFor="code" className="label">2. Enter the 6-digit code the app shows</label>
      <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} className="input" />
      {state.error ? <p role="alert" className="msg msg-error">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>{pending ? "Checking…" : "Turn on two-step sign-in"}</button>
    </form>
  );
}

/** Turn it off again: needs the password and a current code. */
export function DisableTwoStep() {
  const [state, run, pending] = useActionState(disableTwoStepAction, {});
  return (
    <form action={run} className="stack" autoComplete="off">
      <label htmlFor="pw" className="label">Your password</label>
      <input id="pw" name="password" type="password" autoComplete="current-password" required maxLength={128} className="input" />
      <label htmlFor="code2" className="label">A current code from the app</label>
      <input id="code2" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} className="input" />
      {state.error ? <p role="alert" className="msg msg-error">{state.error}</p> : null}
      {state.ok ? <p role="status" className="msg msg-ok">{state.ok}</p> : null}
      <button type="submit" className="btn btn-ghost" disabled={pending}>Turn off two-step sign-in</button>
    </form>
  );
}
