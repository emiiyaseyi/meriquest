import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/server/auth/dal";

export const metadata: Metadata = { title: "My account" };

/** The account hub: where a person goes to change their password or set up two-step sign-in. */
export default async function AccountPage() {
  const user = await requireUser();
  return (
    <main className="auth-shell">
      <Logo variant="light" width={220} />
      <div className="auth-card stack">
        <h1>My account</h1>
        <p className="muted">{user.name} · {user.staffId}</p>
        <div className="stack">
          <Link href="/account/security" className="btn">Two-step sign-in {user.totpEnabled ? "(on)" : "(set up)"}</Link>
          <Link href="/change-password" className="btn btn-ghost">Change password</Link>
        </div>
        <p><Link href="/">Back to the game</Link></p>
      </div>
    </main>
  );
}
