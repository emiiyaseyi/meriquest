import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { AssignCourseForm, AssignTimeForm, RemoveCourseForm } from "@/components/ManagerForms";
import { requireUser } from "@/lib/server/auth/dal";
import { getTeam } from "@/lib/server/manager/service";
import { logoutAction } from "@/app/actions/auth";
import { assignCourseAction, assignTimeAction, unassignCourseAction } from "@/app/actions/manager";

export const metadata: Metadata = { title: "My team" };

const day = (t: number | null) => (t ? new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Never");

export default async function ManagerPage({ searchParams }: { searchParams: Promise<{ unit?: string | string[] }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const unit = (Array.isArray(sp.unit) ? sp.unit[0] : sp.unit) ?? "";
  // Only line managers and admins may open this; everyone else is sent home without being told why
  const team = await getTeam(user, unit.trim().slice(0, 30));
  if (!team) redirect("/");
  return (
    <>
      <header className="brandbar">
        <Logo variant="light" width={150} />
        <nav className="nav" aria-label="Main">
          <NavLink href="/dashboard" exact>Dashboard</NavLink>
          <NavLink href="/manager" exact>My team</NavLink>
          <NavLink href="/" exact>Back to the game</NavLink>
        </nav>
        <form action={logoutAction} className="row">
          <span className="who">{user.name}</span>
          <button type="submit" className="btn btn-ghost btn-sm">Sign out</button>
        </form>
      </header>
      <main className="page stack">
        <h1>My team</h1>
        <p className="muted">
          People in <strong>{team.unit}</strong>. Assign extra learning time (up to {team.weeklyLimit} minutes a week each) or an Academy course with a due date. They are told in their updates.
          {team.isAdmin ? <> Admins can look at another unit by adding <code>?unit=</code> to the address.</> : null}
        </p>
        {team.people.length === 0 ? <p className="card">There is no one else in this unit yet.</p> : null}
        {team.people.map((p) => (
          <div key={p.staffId} className="card stack">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <strong>{p.name}</strong> <span className="muted">{p.staffId} · {p.title}</span>
              </div>
              <span className="muted">✨ {p.points} · {p.lessonsPassed} lessons passed · {p.certificates} certificate{p.certificates === 1 ? "" : "s"} · last seen {day(p.lastSeen)}</span>
            </div>
            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <span>Learning time this week: <strong>{p.assignedMinutes} min</strong></span>
              <AssignTimeForm action={assignTimeAction} staffId={p.staffId} name={p.name} />
            </div>
            <AssignCourseForm action={assignCourseAction} staffId={p.staffId} name={p.name} courses={team.courseOptions} />
            {p.courses.length > 0 ? (
              <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>
                {p.courses.map((c) => (
                  <li key={c.courseId}>
                    {c.title} {c.done ? <span className="badge">Done</span> : c.due ? <span className="muted">due {c.due}</span> : null}
                    {c.note ? <span className="muted"> · {c.note}</span> : null} <RemoveCourseForm action={unassignCourseAction} staffId={p.staffId} courseId={c.courseId} title={c.title} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        <p><Link href="/dashboard">Back to my dashboard</Link></p>
      </main>
    </>
  );
}
