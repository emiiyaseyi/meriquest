import type { Metadata } from "next";
import { requireArea } from "@/lib/server/auth/dal";
import { listReports } from "@/lib/server/chat/service";
import { ChatReviewForm } from "@/components/ChatReview";
import { reviewChatReportAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Chat reports" };

const when = (t: number) => new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function ChatReportsPage() {
  const actor = await requireArea("concerns");
  const reports = await listReports(actor);
  return (
    <>
      <h1>Chat reports</h1>
      <p className="muted">
        Messages people have reported in chats and groups. A message hidden by reports stays hidden until you decide. In a direct message you only see the reported message and a few around it. Blocked words, speed limits and the number of reports that hide a message are under Settings → Chats and groups.
      </p>
      {reports.length === 0 ? <p className="card">No reports.</p> : null}
      {reports.map((r) => (
        <div key={r.id} className="card stack">
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <strong>{r.title}</strong>
            <span className="muted">{when(r.at)} · reported by {r.reporter} · {r.status === "open" ? "needs review" : r.status}</span>
          </div>
          <p style={{ margin: 0 }}>Reason: <em>{r.reason}</em></p>
          <div className="stack" style={{ gap: 4, background: "#f6f8f6", borderRadius: 12, padding: 10 }}>
            {r.context.map((c, i) => (
              <div key={i} style={{ fontWeight: c.flagged ? 700 : 400 }}>
                <span className="muted">{when(c.at)} · {c.name}:</span> {c.text}
              </div>
            ))}
            {r.context.length === 0 ? <span className="muted">The message is no longer there.</span> : null}
          </div>
          {r.message ? <p className="muted" style={{ margin: 0 }}>Sent by {r.message.name} ({r.message.staffId}). {r.message.removed ? "Removed." : r.message.hidden ? "Hidden." : "Visible."}{r.muted ? " Sender is paused." : ""}</p> : null}
          {r.status === "open" ? <ChatReviewForm action={reviewChatReportAction} reportId={r.id} open /> : null}
        </div>
      ))}
    </>
  );
}
