import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/server/auth/dal";
import { getConfig } from "@/lib/server/config/registry";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/");
  const auth = await getConfig("auth");
  return (
    <main className="auth-shell">
      <Logo variant="light" width={280} />
      <div className="auth-card stack">
        <div>
          <h1>Sign in</h1>
          <p className="muted" style={{ margin: 0 }}>Enter your credentials to access the system.</p>
        </div>
        <LoginForm example={auth.staffIdExample} />
      </div>
      <p className="auth-foot">
        Access is restricted to authorised personnel only.
        <br />
        Contact your administrator if you need an account.
      </p>
    </main>
  );
}
