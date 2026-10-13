import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { requireUser } from "@/lib/server/auth/dal";
import { AREAS_BY_ROLE, can } from "@/lib/server/auth/permissions";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The layout decides what the menu shows. Every page and every Server Action checks its own area as well.
  const user = await requireUser();
  if (AREAS_BY_ROLE[user.role].length === 0) redirect("/");
  return (
    <>
      <header className="brandbar">
        <Logo variant="light" width={150} />
        <nav className="nav" aria-label="Admin">
          <NavLink href="/admin" exact>Overview</NavLink>
          {can(user.role, "settings") ? <NavLink href="/admin/config">Settings</NavLink> : null}
          {can(user.role, "staff") ? <NavLink href="/admin/staff">Staff &amp; access</NavLink> : null}
          {can(user.role, "reports") ? <NavLink href="/admin/reports">Reports</NavLink> : null}
          {can(user.role, "placements") ? <NavLink href="/admin/placements">Placements</NavLink> : null}
          {can(user.role, "academy") ? <NavLink href="/admin/academy">Academy</NavLink> : null}
          {can(user.role, "announcements") ? <NavLink href="/admin/announcements">Announcements</NavLink> : null}
          {can(user.role, "concerns") ? <NavLink href="/admin/concerns">Concerns</NavLink> : null}
          {can(user.role, "audit") ? <NavLink href="/admin/audit">Audit log</NavLink> : null}
          <NavLink href="/" exact>Back to game</NavLink>
        </nav>
        <form action={logoutAction} className="row">
          <span className="who">{user.name}</span>
          <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
        </form>
      </header>
      <main className="page stack">{children}</main>
    </>
  );
}
