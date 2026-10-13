import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/server/auth/dal";
import { getConcern } from "@/lib/server/concerns/service";
import { ConcernReview } from "@/components/ConcernReview";
import { updateConcernAction } from "@/app/admin/actions";

const fmt = (ms: number) => new Date(ms).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "medium", timeZone: "Africa/Lagos" });

export default async function ConcernPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireArea("concerns");
  const { id } = await params;
  const c = await getConcern(admin, id);
  if (!c) notFound();
  return (
    <>
      <p><Link href="/admin/concerns">← All concerns</Link></p>
      <h1>{c.number}</h1>
      <div className="card stack">
        <dl className="facts">
          <dt>Kind</dt><dd>{c.category}</dd>
          <dt>Reported by</dt><dd>{c.reporterName} ({c.reporterId})</dd>
          <dt>About</dt><dd>{c.aboutName || "Not stated"}</dd>
          <dt>Happened</dt><dd>{fmt(c.occurredAt)} <span className="muted">(as stated by the reporter)</span></dd>
          <dt>Received</dt><dd>{fmt(c.submittedAt)} <span className="muted">(recorded by the system)</span></dd>
          <dt>Where in the game</dt><dd>{c.context.scene}</dd>
        </dl>
        <h2>What happened</h2>
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{c.description}</p>
      </div>
      <div className="card stack">
        <h2>Evidence</h2>
        {c.evidence.length === 0 ? <p className="muted">No files were attached.</p> : null}
        {c.evidence.map((e) => (
          <div key={e.n} className="evidence">
            <p style={{ margin: 0 }}>
              <strong>{e.name}</strong> <span className="muted">· {e.type} · {Math.ceil(e.size / 1024)} KB</span>
            </p>
            <p className="muted small" style={{ margin: 0 }}>
              Received {fmt(e.addedAt)}. File last changed {e.fileModifiedAt ? `${fmt(e.fileModifiedAt)} (reported by the device)` : "at an unknown time"}. SHA-256 {e.sha256.slice(0, 16)}…
            </p>
            <a className="btn btn-ghost btn-sm" href={`/admin/concerns/${c.id}/evidence/${e.n}`}>Download</a>
          </div>
        ))}
      </div>
      <ConcernReview action={updateConcernAction} id={c.id} status={c.status} notes={c.notes.map((n) => ({ at: fmt(n.at), by: n.by, text: n.text }))} />
    </>
  );
}
