import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CONFIG_KEYS } from "@/lib/server/config/definitions";
import { isLocked, listUsers } from "@/lib/server/auth/users";
import { requireUser } from "@/lib/server/auth/dal";
import { AREAS_BY_ROLE, ROLE_LABEL, can } from "@/lib/server/auth/permissions";
import { countNewConcerns } from "@/lib/server/concerns/service";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const user = await requireUser();
  if (AREAS_BY_ROLE[user.role].length === 0) redirect("/");
  // Each card, and the figures on it, is only read when the role may open that area
  const users = can(user.role, "staff") ? await listUsers() : [];
  const newConcerns = can(user.role, "concerns") ? await countNewConcerns(user) : 0;
  const active = users.filter((u) => u.status === "active").length;
  const locked = users.filter((u) => isLocked(u)).length;
  return (
    <>
      <h1>Admin</h1>
      <p className="muted">Signed in as {ROLE_LABEL[user.role]}. You see the areas your role may use.</p>
      <div className="cards">
        {can(user.role, "staff") ? (
          <Link href="/admin/staff" className="card">
            <h2>Staff &amp; access</h2>
            <p className="muted">{users.length} accounts · {active} active · {locked} locked</p>
          </Link>
        ) : null}
        {can(user.role, "reports") ? (
          <Link href="/admin/reports" className="card">
            <h2>Reports</h2>
            <p className="muted">Learning progress and engagement by unit, course and person, with a spreadsheet download.</p>
          </Link>
        ) : null}
        {can(user.role, "placements") ? (
          <Link href="/admin/placements" className="card">
            <h2>Placements</h2>
            <p className="muted">See each person&apos;s starting path, override it, or switch retakes on and off.</p>
          </Link>
        ) : null}
        {can(user.role, "succession") ? (
          <Link href="/admin/succession" className="card">
            <h2>Succession</h2>
            <p className="muted">Who could step into each line manager&apos;s role, and how soon. Also who still owes the leadership simulator.</p>
          </Link>
        ) : null}
        {can(user.role, "academy") ? (
          <Link href="/admin/academy" className="card">
            <h2>Academy</h2>
            <p className="muted">Courses, lessons, questions, scenarios and case studies.</p>
          </Link>
        ) : null}
        {can(user.role, "announcements") ? (
          <Link href="/admin/announcements" className="card">
            <h2>Announcements</h2>
            <p className="muted">Post news to everyone&apos;s Work Phone.</p>
          </Link>
        ) : null}
        {can(user.role, "settings") ? (
          <Link href="/admin/config" className="card">
            <h2>Settings</h2>
            <p className="muted">{CONFIG_KEYS.length} admin-editable settings (Work First, shifts, rooms, Workspace catalogue, leadership, sign-in rules…)</p>
          </Link>
        ) : null}
        {can(user.role, "concerns") ? (
          <Link href="/admin/concerns" className="card">
            <h2>Conduct concerns</h2>
            <p className="muted">{newConcerns === 0 ? "No new reports." : `${newConcerns} new ${newConcerns === 1 ? "report" : "reports"} waiting for review.`}</p>
          </Link>
        ) : null}
        {can(user.role, "audit") ? (
          <Link href="/admin/audit" className="card">
            <h2>Audit log</h2>
            <p className="muted">Sign-ins, resets, role and settings changes.</p>
          </Link>
        ) : null}
      </div>
    </>
  );
}
