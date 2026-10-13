import Link from "next/link";
import { requireRole } from "@/lib/server/auth/dal";
import { logoutAction } from "@/app/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Layout-level check controls what renders. Every Server Action re-checks the role itself.
  const admin = await requireRole("admin");
  return (
    <>
      <header className="brandbar">
        <span className="name">MeriQuest Admin</span>
        <nav className="nav" aria-label="Admin">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/config">Settings</Link>
          <Link href="/admin/staff">Staff &amp; access</Link>
          <Link href="/admin/audit">Audit log</Link>
          <Link href="/">Back to game</Link>
        </nav>
        <form action={logoutAction} className="row">
          <span className="muted">{admin.name}</span>
          <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
        </form>
      </header>
      <main className="page stack">{children}</main>
    </>
  );
}
