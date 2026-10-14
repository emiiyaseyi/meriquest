"use client";

import { useActionState } from "react";
import { changePasswordAction, loginAction, type FormState } from "@/app/actions/auth";

const initial: FormState = {};

export function LoginForm({ example }: { example: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="stack" autoComplete="on">
      <label htmlFor="identifier" className="label">Staff ID or work email</label>
      <input id="identifier" name="identifier" type="text" inputMode="email" autoComplete="username" required maxLength={120} placeholder={`e.g. ${example}`} className="input" />
      <label htmlFor="password" className="label">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} className="input" />
      {state.needsCode ? (
        <>
          <label htmlFor="code" className="label">Code from your authenticator app</label>
          <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={20} className="input" placeholder="6-digit code, or a recovery code" autoFocus />
          <p className="muted small" style={{ margin: 0 }}>Enter your password again with the code. Lost your phone? Use one of your recovery codes.</p>
        </>
      ) : null}
      {state.error ? <p role="alert" className="msg msg-error">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function ChangePasswordForm({ rules, forced }: { rules: string; forced: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="stack" autoComplete="off">
      <p className="muted">{forced ? "Before you continue, choose your own password." : "Choose a new password."} {rules}</p>
      <label htmlFor="current" className="label">{forced ? "Current (default) password" : "Current password"}</label>
      <input id="current" name="current" type="password" autoComplete="current-password" required maxLength={128} className="input" />
      <label htmlFor="next" className="label">New password</label>
      <input id="next" name="next" type="password" autoComplete="new-password" required maxLength={128} className="input" />
      <label htmlFor="confirm" className="label">Confirm new password</label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" required maxLength={128} className="input" />
      {state.error ? <p role="alert" className="msg msg-error">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    </form>
  );
}
