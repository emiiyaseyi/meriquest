import Link from "next/link";
import type { Metadata } from "next";
import { requireArea } from "@/lib/server/auth/dal";
import { listCourseMeta } from "@/lib/server/academy/content";
import { getConfig } from "@/lib/server/config/registry";
import { ActionForm } from "@/components/ActionForm";
import { MoveCourseForm } from "@/components/CourseAdmin";
import { deleteCourseAction, moveCourseAction, restoreBuiltInsAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Academy courses" };

export default async function AcademyAdminPage() {
  await requireArea("academy");
  const [courses, academy] = await Promise.all([listCourseMeta(), getConfig("academy")]);
  const groups = [...academy.groups.map((g) => ({ ...g, courses: courses.filter((c) => c.group === g.id) })), { id: "", label: "No group (shown under More courses)", icon: "📚", courses: courses.filter((c) => !academy.groups.some((g) => g.id === c.group)) }];
  return (
    <>
      <h1>Meristem Academy</h1>
      <p className="muted">
        Every course in the Academy. Edit one to change its lessons, notes, questions (Easy, Medium, Hard), scenarios and case studies, move it to another group or out of every group, or delete it.
        How classes run, and the groups themselves, are under <Link href="/admin/config/academy">Settings → Meristem Academy</Link>.
      </p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <Link href="/admin/academy/new" className="btn">Add a course</Link>
        <ActionForm action={restoreBuiltInsAction} fields={{}} label="Restore missing built-in courses" />
      </div>
      {groups.map((g) => (
        <div key={g.id || "none"} className="card table-wrap">
          <h2>{g.icon} {g.label}</h2>
          <table>
            <thead><tr><th>Course</th><th>For</th><th>Lessons</th><th>Group</th><th></th></tr></thead>
            <tbody>
              {g.courses.length === 0 ? <tr><td colSpan={5} className="muted">No courses here.</td></tr> : null}
              {g.courses.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.icon} {c.title}</strong><br /><span className="muted">{c.kicker} · {c.scenarios} scenario{c.scenarios === 1 ? "" : "s"} · {c.cases} case stud{c.cases === 1 ? "y" : "ies"}</span></td>
                  <td>{c.units.includes("*") ? "Everyone" : c.units.join(", ")}</td>
                  <td>{c.lessonIds.length}</td>
                  <td><MoveCourseForm action={moveCourseAction} id={c.id} group={c.group} groups={academy.groups} /></td>
                  <td>
                    <Link href={`/admin/academy/${c.id}`} className="btn btn-ghost btn-sm">Edit</Link>{" "}
                    <ActionForm action={deleteCourseAction} fields={{ id: c.id }} label="Delete" confirmText={`Delete the course "${c.title}"? People's progress in it stays on record but the course disappears.`} danger />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
