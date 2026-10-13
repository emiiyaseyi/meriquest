import type { Metadata } from "next";
import { requireArea } from "@/lib/server/auth/dal";
import { listAnnouncements } from "@/lib/server/notices/service";
import { ActionForm } from "@/components/ActionForm";
import { AnnouncementForm } from "@/components/AnnouncementForm";
import { deleteAnnouncementAction, postAnnouncementAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Announcements" };

const fmt = (ms: number) => new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

export default async function AnnouncementsPage() {
  await requireArea("announcements");
  const list = await listAnnouncements(50);
  return (
    <>
      <h1>Announcements</h1>
      <p className="muted">Short messages from the Meristem team. The newest appears as the banner on every Work Phone and at the top of Messages.</p>
      <div className="card stack">
        <h2>New announcement</h2>
        <AnnouncementForm action={postAnnouncementAction} />
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Posted</th><th>Announcement</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td colSpan={3} className="muted">Nothing posted yet.</td></tr> : null}
            {list.map((a) => (
              <tr key={a.id}>
                <td>{fmt(a.at)}<br /><span className="muted">{a.by}</span></td>
                <td><strong>{a.title}</strong><br />{a.text}</td>
                <td><ActionForm action={deleteAnnouncementAction} fields={{ id: a.id }} label="Remove" confirmText="Remove this announcement?" danger /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
