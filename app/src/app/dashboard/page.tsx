import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { requireUser } from "@/lib/server/auth/dal";
import { getConfig } from "@/lib/server/config/registry";
import { getPlacement, retakeStatus } from "@/lib/server/placement/service";
import { playStatus } from "@/lib/server/workfirst/service";
import { closedTitle } from "@/lib/workfirst";
import { logoutAction } from "@/app/actions/auth";

export const metadata = { title: "My dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const placementCfg = await getConfig("placement");
  const placement = await getPlacement(user.staffId);
  // Everyone except admins answers the placement questionnaire once, at first sign-in.
  if (placementCfg.enabled && !placement && user.role !== "admin") redirect("/placement");

  const path = placement ? placementCfg.paths.find((p) => p.id === placement.pathId) : undefined;
  const retake = placement ? await retakeStatus(user, placement) : null;
  const world = await playStatus(user, "world");
  const learning = await playStatus(user, "learning");

  return (
    <>
      <header className="brandbar">
        <Logo variant="light" width={150} />
        <nav className="nav" aria-label="Main">
          <NavLink href="/dashboard" exact>Dashboard</NavLink>
          <NavLink href="/" exact>Back to the game</NavLink>
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

        <div className="cards">
          {path ? (
            <section className="card stack">
              <p className="eyebrow">Your starting path</p>
              <h2>{path.emoji} {path.name}</h2>
              <p className="muted">{path.blurb}</p>
              {retake?.allowed ? (
                <p><Link href="/placement">Not right? Dispute and retake</Link> ({retake.retakesLeft} left)</p>
              ) : retake ? (
                <p className="muted">{retake.reason}</p>
              ) : null}
            </section>
          ) : null}

          <section className="card stack">
            <p className="eyebrow">Work First</p>
            <h2>{world.allowed ? "Play is open" : closedTitle(world.code)}</h2>
            <p className="muted">{world.message}</p>
            <p className="muted">{learning.allowed ? "Learning is open." : learning.message}</p>
            {world.allowed ? <p><Link href="/">Enter the Workspace</Link></p> : null}
          </section>
        </div>
      </main>
    </>
  );
}
