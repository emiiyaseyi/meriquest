import { requireArea } from "@/lib/server/auth/dal";
import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { CreateStaffForm, RoleForm } from "@/components/StaffForms";
import { getConfig } from "@/lib/server/config/registry";
import { isLocked, listUsers } from "@/lib/server/auth/users";
import {
  createStaffAction,
  resetPasswordAction,
  setLineManagerAction,
  setRoleAction,
  setStatusAction,
  unlockAction,
} from "@/app/admin/actions";

export const metadata: Metadata = { title: "Staff & access" };

const MAX_Q = 60;

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  // Every admin page checks its own area: a layout is not a security boundary
  await requireArea("staff");
  const sp = await searchParams;
  // Search text is user input: take one value, trim, cap length; it is only used for filtering.
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim().slice(0, MAX_Q).toLowerCase();
  const auth = await getConfig("auth");
  const users = (await listUsers()).filter(
    (u) => !q || [u.staffId, u.name, u.email, u.unit, u.title].some((f) => f.toLowerCase().includes(q)),
  );
  return (
    <>
      <h1>Staff &amp; access</h1>
      <form method="get" className="row" role="search">
        <label htmlFor="q" className="sr-only">Search staff</label>
        <input id="q" name="q" defaultValue={q} maxLength={MAX_Q} placeholder="Search by ID, name, email, unit" className="input" />
        <button type="submit" className="btn btn-ghost">Search</button>
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Staff</th><th>Access</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const locked = isLocked(u);
              return (
                <tr key={u.staffId}>
                  <td>
                    <strong>{u.name}</strong>
                    <br />
                    <span className="muted">{u.staffId} · {u.email}</span>
                    <br />
                    <span className="muted">{u.title} · {u.unit} · {u.tenureYears} yrs</span>
                  </td>
                  <td>
                    <span className="badge">{u.role}</span>{" "}
                    {u.isLineManager ? <span className="badge">line manager</span> : null}{" "}
                    {u.status === "disabled" ? <span className="badge badge-warn">disabled</span> : null}{" "}
                    {locked ? <span className="badge badge-warn">locked</span> : null}{" "}
                    {u.mustChangePassword ? <span className="badge badge-warn">on default password</span> : null}
                  </td>
                  <td>
                    <ActionForm action={resetPasswordAction} fields={{ staffId: u.staffId }} label="Reset password" confirmText={`Reset ${u.name}'s password to the default?`} />
                    {locked ? <ActionForm action={unlockAction} fields={{ staffId: u.staffId }} label="Unlock" /> : null}
                    <ActionForm
                      action={setStatusAction}
                      fields={{ staffId: u.staffId, status: u.status === "active" ? "disabled" : "active" }}
                      label={u.status === "active" ? "Disable" : "Enable"}
                      confirmText={u.status === "active" ? `Disable ${u.name}? They will be signed out.` : undefined}
                      danger={u.status === "active"}
                    />
                    <ActionForm action={setLineManagerAction} fields={{ staffId: u.staffId, value: u.isLineManager ? "false" : "true" }} label={u.isLineManager ? "Unset line manager" : "Set line manager"} />
                    <RoleForm action={setRoleAction} staffId={u.staffId} role={u.role} />
                  </td>
                </tr>
              );
            })}
            {users.length === 0 ? <tr><td colSpan={3} className="muted">No matching staff.</td></tr> : null}
          </tbody>
        </table>
      </div>

      <section className="card stack">
        <h2>Add a staff member</h2>
        <CreateStaffForm action={createStaffAction} example={auth.staffIdExample} />
      </section>
    </>
  );
}
