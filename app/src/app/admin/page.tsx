import Link from "next/link";
import type { Metadata } from "next";
import { CONFIG_KEYS } from "@/lib/server/config/definitions";
import { isLocked, listUsers } from "@/lib/server/auth/users";
import { requireRole } from "@/lib/server/auth/dal";
import { countNewConcerns } from "@/lib/server/concerns/service";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const admin = await requireRole("admin");
  const users = await listUsers();
  const newConcerns = await countNewConcerns(admin);
  const active = users.filter((u) => u.status === "active").length;
  const locked = users.filter((u) => isLocked(u)).length;
  return (
    <>
      <h1>Admin</h1>
      <div className="cards">
        <Link href="/admin/staff" className="card">
          <h2>Staff &amp; access</h2>
          <p className="muted">{users.length} accounts · {active} active · {locked} locked</p>
        </Link>
        <Link href="/admin/reports" className="card">
          <h2>Reports</h2>
          <p className="muted">Learning progress and engagement by unit, course and person, with a spreadsheet download.</p>
        </Link>
        <Link href="/admin/placements" className="card">
          <h2>Placements</h2>
          <p className="muted">See each person&apos;s starting path, override it, or switch retakes on and off.</p>
        </Link>
        <Link href="/admin/config" className="card">
          <h2>Settings</h2>
          <p className="muted">{CONFIG_KEYS.length} admin-editable settings (Work First, sign-in rules, offices, regulators…)</p>
        </Link>
        <Link href="/admin/concerns" className="card">
          <h2>Conduct concerns</h2>
          <p className="muted">{newConcerns === 0 ? "No new reports." : `${newConcerns} new ${newConcerns === 1 ? "report" : "reports"} waiting for review.`}</p>
        </Link>
        <Link href="/admin/audit" className="card">
          <h2>Audit log</h2>
          <p className="muted">Sign-ins, resets, role and settings changes.</p>
        </Link>
      </div>
    </>
  );
}
