import type { Metadata } from "next";
import { requireArea } from "@/lib/server/auth/dal";
import { buildReport } from "@/lib/server/reports/service";

export const metadata: Metadata = { title: "Reports" };

const MAX_Q = 60;
const day = (t: number | null) => (t ? new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Never");

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; unit?: string | string[] }> }) {
  await requireArea("reports");
  const sp = await searchParams;
  // Search and filter values are user input: take one value, trim, cap the length; they only filter what is shown
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim().slice(0, MAX_Q).toLowerCase();
  const unit = one(sp.unit).trim().slice(0, 30);
  const r = await buildReport();
  const people = r.people.filter((p) => (!unit || p.unit === unit) && (!q || [p.staffId, p.name, p.title].some((f) => f.toLowerCase().includes(q))));
  return (
    <>
      <h1>Reports</h1>
      <p className="muted">Learning progress and engagement, from what people have done in MeriQuest. Updated each time you open this page.</p>

      <div className="cards">
        <div className="card"><h2>{r.totals.online}</h2><p className="muted">online now (seen in the last 2 minutes)</p></div>
        <div className="card"><h2>{r.totals.signInsToday}</h2><p className="muted">signed in during the last 24 hours</p></div>
        <div className="card"><h2>{r.totals.activeDay} · {r.totals.activeWeek} · {r.totals.activeMonth}</h2><p className="muted">active in the last 24 hours · 7 days · 30 days (of {r.totals.people} people)</p></div>
        <div className="card"><h2>{r.totals.playHours}</h2><p className="muted">hours played in total</p></div>
        <div className="card"><h2>{r.totals.shifts}</h2><p className="muted">work shifts finished</p></div>
        <div className="card"><h2>{r.totals.leadRuns}</h2><p className="muted">leadership simulator runs</p></div>
        <div className="card"><h2>{r.totals.lessonsPassed}</h2><p className="muted">lessons passed in the Academy</p></div>
        <div className="card"><h2>{r.totals.certificates}</h2><p className="muted">certificates earned</p></div>
        <div className="card"><h2>{r.totals.avgPoints}</h2><p className="muted">average Merit points</p></div>
      </div>

      <div className="card table-wrap">
        <h2>By unit</h2>
        <table>
          <thead><tr><th>Unit</th><th>People</th><th>Online now</th><th>Active (7 days)</th><th>Avg points</th><th>Avg lessons passed</th><th>Certificates</th></tr></thead>
          <tbody>
            {r.units.map((u) => (
              <tr key={u.unit}><td>{u.unit}</td><td>{u.people}</td><td>{u.online}</td><td>{u.activeWeek}</td><td>{u.avgPoints}</td><td>{u.avgLessons}</td><td>{u.certificates}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap">
        <h2>By course</h2>
        <table>
          <thead><tr><th>Course</th><th>Lessons</th><th>Started by</th><th>Certified</th><th>Average progress</th></tr></thead>
          <tbody>
            {r.courses.map((c) => (
              <tr key={c.id}><td>{c.title}</td><td>{c.lessons}</td><td>{c.learners}</td><td>{c.completed}</td><td>{c.learners ? `${c.avgProgress}%` : "-"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0 }}>People</h2>
          <a href="/admin/reports/export" className="btn btn-ghost btn-sm" download>Download as spreadsheet (CSV)</a>
        </div>
        <form method="get" className="row" role="search" style={{ gap: 8, flexWrap: "wrap" }}>
          <label htmlFor="q" className="sr-only">Search people</label>
          <input id="q" name="q" defaultValue={q} maxLength={MAX_Q} placeholder="Search by ID, name, title" className="input" />
          <label htmlFor="unit" className="sr-only">Unit</label>
          <select id="unit" name="unit" defaultValue={unit} className="input">
            <option value="">All units</option>
            {r.units.map((u) => <option key={u.unit} value={u.unit}>{u.unit}</option>)}
          </select>
          <button type="submit" className="btn btn-ghost">Filter</button>
        </form>
        <table>
          <thead><tr><th>Person</th><th>Unit</th><th>Points</th><th>Level</th><th>Streak</th><th>Lessons passed</th><th>Certificates</th><th>Play time</th><th>Shifts</th><th>Leadership</th><th>Last seen</th></tr></thead>
          <tbody>
            {people.length === 0 ? <tr><td colSpan={11} className="muted">No one matches.</td></tr> : null}
            {people.map((p) => (
              <tr key={p.staffId}>
                <td><strong>{p.name}</strong><br /><span className="muted">{p.staffId} · {p.title}</span></td>
                <td>{p.unit}</td>
                <td>{p.points}</td>
                <td>{p.level}</td>
                <td>{p.streak}{p.bestStreak > p.streak ? <span className="muted"> (best {p.bestStreak})</span> : null}</td>
                <td>{p.lessonsPassed}{p.hardLessons > 0 ? <span className="muted"> ({p.hardLessons} at Hard)</span> : null}</td>
                <td>{p.certificates}</td>
                <td>{p.playMinutes} min</td>
                <td>{p.shifts}</td>
                <td>{p.leadRuns > 0 ? `${p.leadRuns} run${p.leadRuns === 1 ? "" : "s"}, latest ${p.leadLast}` : "-"}</td>
                <td>{p.online ? <span className="badge">online</span> : day(p.lastSeen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
