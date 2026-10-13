import Link from "next/link";
import type { Metadata } from "next";
import { CONFIG_KEYS } from "@/lib/server/config/definitions";
import { isLocked, listUsers } from "@/lib/server/auth/users";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const users = await listUsers();
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
        <Link href="/admin/config" className="card">
          <h2>Settings</h2>
          <p className="muted">{CONFIG_KEYS.length} admin-editable settings (Work First, sign-in rules, offices, regulators…)</p>
        </Link>
        <Link href="/admin/audit" className="card">
          <h2>Audit log</h2>
          <p className="muted">Sign-ins, resets, role and settings changes.</p>
        </Link>
      </div>
    </>
  );
}
