import type { Metadata } from "next";
import { recentAudit } from "@/lib/server/audit";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  const events = await recentAudit(200);
  return (
    <>
      <h1>Audit log</h1>
      <p className="muted">Most recent 200 admin and security events.</p>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>When (UTC)</th><th>Who</th><th>What</th><th>Target</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.at).toISOString().replace("T", " ").slice(0, 19)}</td>
                <td>{e.actor}</td>
                <td>{e.action}</td>
                <td>{e.target ?? ""}</td>
                <td>{e.detail ? JSON.stringify(e.detail) : ""}</td>
              </tr>
            ))}
            {events.length === 0 ? <tr><td colSpan={5} className="muted">Nothing yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
