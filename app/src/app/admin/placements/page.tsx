import { requireArea } from "@/lib/server/auth/dal";
import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PathForm } from "@/components/StaffForms";
import { getConfig } from "@/lib/server/config/registry";
import { listUsers } from "@/lib/server/auth/users";
import { listPlacements } from "@/lib/server/placement/service";
import { resetPlacementAction, setPathAction, setRetakeLockAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Placements" };

export default async function PlacementsPage() {
  // Every admin page checks its own area: a layout is not a security boundary
  await requireArea("placements");
  const [cfg, users, placements] = await Promise.all([getConfig("placement"), listUsers(), listPlacements()]);
  const byStaff = new Map(placements.map((p) => [p.staffId, p]));
  const pathName = (id: string) => cfg.paths.find((p) => p.id === id)?.name ?? id;
  return (
    <>
      <h1>Placements</h1>
      <p className="muted">
        Who was placed where and how. Retakes are {cfg.retakeEnabled ? `on (up to ${cfg.maxRetakes})` : "off"} globally. Edit the questions
        and rules under Settings → Starting placement questionnaire.
      </p>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Staff</th><th>Path</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const p = byStaff.get(u.staffId);
              return (
                <tr key={u.staffId}>
                  <td>
                    <strong>{u.name}</strong>
                    <br />
                    <span className="muted">{u.staffId} · {u.unit} · {u.tenureYears} yrs</span>
                  </td>
                  <td>
                    {p ? (
                      <>
                        <span className="badge">{pathName(p.pathId)}</span>{" "}
                        <span className="muted">{p.source === "admin" ? "set by admin" : `questionnaire, ${p.attempts} attempt${p.attempts === 1 ? "" : "s"}`}</span>
                        {p.retakeLocked ? <> <span className="badge badge-warn">retake locked</span></> : null}
                      </>
                    ) : (
                      <span className="muted">Not placed yet</span>
                    )}
                  </td>
                  <td>
                    <PathForm action={setPathAction} staffId={u.staffId} paths={cfg.paths.map((x) => ({ id: x.id, name: x.name }))} current={p?.pathId ?? ""} />
                    {p ? (
                      <>
                        <ActionForm action={setRetakeLockAction} fields={{ staffId: u.staffId, locked: p.retakeLocked ? "false" : "true" }} label={p.retakeLocked ? "Allow retake" : "Block retake"} />
                        <ActionForm action={resetPlacementAction} fields={{ staffId: u.staffId }} label="Reset" confirmText={`Remove ${u.name}'s placement so they answer the questions again?`} danger />
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
