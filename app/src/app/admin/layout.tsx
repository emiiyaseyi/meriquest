import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { requireRole } from "@/lib/server/auth/dal";
import { logoutAction } from "@/app/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Layout-level check controls what renders. Every Server Action re-checks the role itself.
  const admin = await requireRole("admin");
  return (
    <>
      <header className="brandbar">
        <Logo variant="light" width={150} />
        <nav className="nav" aria-label="Admin">
          <NavLink href="/admin" exact>Overview</NavLink>
          <NavLink href="/admin/config">Settings</NavLink>
          <NavLink href="/admin/staff">Staff &amp; access</NavLink>
          <NavLink href="/admin/placements">Placements</NavLink>
          <NavLink href="/admin/audit">Audit log</NavLink>
          <NavLink href="/" exact>Back to game</NavLink>
        </nav>
        <form action={logoutAction} className="row">
          <span className="who">{admin.name}</span>
          <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
        </form>
      </header>
      <main className="page stack">{children}</main>
    </>
  );
}
