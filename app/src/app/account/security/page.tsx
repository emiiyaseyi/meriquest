import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { DisableTwoStep, SetupTwoStep } from "@/components/TwoStepForms";
import { requireUser } from "@/lib/server/auth/dal";
import { totpAvailable } from "@/lib/server/auth/totp";
import { getConfig } from "@/lib/server/config/registry";
import { AREAS_BY_ROLE } from "@/lib/server/auth/permissions";

export const metadata: Metadata = { title: "Account security" };

export default async function SecurityPage() {
  const user = await requireUser();
  const cfg = await getConfig("auth");
  const required = cfg.requireTwoStepForAdminAreas && AREAS_BY_ROLE[user.role].length > 0;
  return (
    <main className="auth-shell">
      <Logo variant="light" width={220} />
      <div className="auth-card stack">
        <h1>Two-step sign-in</h1>
        <p className="muted">After your password, you enter a short code from an authenticator app on your phone. It protects your account even if your password is learned by someone else.</p>
        {required && !user.totpEnabled ? <p role="alert" className="msg msg-error">Your role needs two-step sign-in before you can open the admin area. Set it up below.</p> : null}
        {user.totpEnabled ? (
          <>
            <p role="status" className="msg msg-ok">Two-step sign-in is on.</p>
            <DisableTwoStep />
          </>
        ) : totpAvailable() ? (
          <SetupTwoStep />
        ) : (
          <p className="muted">Two-step sign-in is not set up on this server yet. Ask the admin team.</p>
        )}
        <p><Link href="/dashboard">Back to my dashboard</Link></p>
      </div>
    </main>
  );
}
