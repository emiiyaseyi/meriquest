import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { requireUser } from "@/lib/server/auth/dal";
import { logoutAction } from "@/app/actions/auth";

export default async function HomePage() {
  const user = await requireUser();
  return (
    <>
      <header className="brandbar">
        <Logo variant="light" width={150} />
        <nav className="nav" aria-label="Main">
          <NavLink href="/" exact>Dashboard</NavLink>
          {user.role === "admin" ? <NavLink href="/admin">Admin</NavLink> : null}
          <NavLink href="/change-password">Change password</NavLink>
        </nav>
        <form action={logoutAction} className="row">
          <span className="who">{user.name}</span>
          <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
        </form>
      </header>
      <main className="page stack">
        <h1>Welcome back, {user.name}</h1>
        <p><span className="badge">{user.role}</span></p>
        <p className="muted">{user.title} · {user.staffId}</p>
        <section className="card stack">
          <h2>Your Workspace is being built</h2>
          <p>
            The foundation is live: secure sign-in, the admin console and the settings registry. The isometric Ikoyi HQ Workspace, the
            placement questionnaire and the work shift arrive in the next milestones.
          </p>
        </section>
      </main>
    </>
  );
}
