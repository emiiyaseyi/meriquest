import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/server/auth/dal";
import { listConcerns } from "@/lib/server/concerns/service";
import { STATUS_LABEL } from "@/lib/concerns";

export const metadata: Metadata = { title: "Conduct concerns" };

const fmt = (ms: number) => new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

export default async function ConcernsPage() {
  const admin = await requireRole("admin");
  const list = await listConcerns(admin);
  return (
    <>
      <h1>Conduct concerns</h1>
      <p className="muted">Reports sent by staff from the game. Times are Lagos time. Open one to read it, view the evidence and record the outcome.</p>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Reference</th><th>Kind</th><th>From</th><th>About</th><th>Sent</th><th>Status</th></tr>
          </thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={6} className="muted">No concerns have been reported.</td></tr> : null}
            {list.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/concerns/${c.id}`}><strong>{c.number}</strong></Link></td>
                <td>{c.category}</td>
                <td>{c.reporterName}<br /><span className="muted">{c.reporterId}</span></td>
                <td>{c.aboutName || <span className="muted">Not stated</span>}</td>
                <td>{fmt(c.submittedAt)}</td>
                <td><span className={`badge${c.status === "new" ? " badge-warn" : ""}`}>{STATUS_LABEL[c.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
