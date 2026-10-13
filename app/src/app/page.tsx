import Link from "next/link";
import { requireUser } from "@/lib/server/auth/dal";
import { logoutAction } from "@/app/actions/auth";

export default async function HomePage() {
  const user = await requireUser();
  return (
    <>
      <header className="brandbar">
        <span className="name">MeriQuest</span>
        <nav className="nav" aria-label="Main">
          {user.role === "admin" ? <Link href="/admin">Admin</Link> : null}
          <Link href="/change-password">Change password</Link>
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
        </form>
      </header>
      <main className="page stack">
        <h1>Welcome, {user.name}</h1>
        <p className="muted">
          {user.title} · {user.staffId} · {user.role}
        </p>
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
