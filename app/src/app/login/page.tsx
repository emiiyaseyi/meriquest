import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/server/auth/dal";
import { getConfig } from "@/lib/server/config/registry";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/");
  const auth = await getConfig("auth");
  return (
    <main className="page narrow">
      <div className="card stack">
        <h1>MeriQuest</h1>
        <p className="muted">Sign in with your Meristem staff ID or work email.</p>
        <LoginForm example={auth.staffIdExample} />
        <p className="muted">New here or forgot your password? Ask Learning &amp; Development to reset it.</p>
      </div>
    </main>
  );
}
