import type { Metadata } from "next";
import { requireArea } from "@/lib/server/auth/dal";
import { READINESS_LABEL, getSuccession } from "@/lib/server/succession/service";
import { listUsers } from "@/lib/server/auth/users";
import { NominateForm, RemoveNominationForm } from "@/components/SuccessionForms";
import { nominateAction, removeNominationAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Succession" };

export default async function SuccessionPage() {
  const actor = await requireArea("succession");
  const [view, users] = await Promise.all([getSuccession(actor), listUsers()]);
  return (
    <>
      <h1>Succession</h1>
      <p className="muted">
        For each line manager&apos;s role: who could step into it, and how soon. Suggestions are people in the same unit with at least {view.minTenure} years at Meristem, ranked by leadership simulator results, certificates and lessons passed.
        People are not told they are on this list.
      </p>

      <div className="card">
        <h2>Leadership simulator due</h2>
        {view.leadershipDue.length === 0 ? <p className="muted">Every line manager is up to date.</p> : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {view.leadershipDue.map((m) => <li key={m.staffId}>{m.name} <span className="muted">{m.staffId} · {m.unit}</span></li>)}
          </ul>
        )}
      </div>

      {view.roles.length === 0 ? <p className="card">There are no line managers yet.</p> : null}
      {view.roles.map((r) => (
        <div key={r.incumbent.staffId} className="card stack">
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong>{r.incumbent.title}</strong> <span className="muted">· {r.incumbent.name} ({r.incumbent.staffId}) · {r.incumbent.unit} · {r.incumbent.tenureYears} years</span>
            </div>
            <span className={r.incumbent.leadershipDone ? "badge" : "muted"}>{r.incumbent.leadershipDone ? "Leadership simulator up to date" : "Leadership simulator due"}</span>
          </div>

          <div>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>Named successors</p>
            {r.nominees.length === 0 ? <p className="muted" style={{ margin: 0 }}>No one named yet.</p> : (
              <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>
                {r.nominees.map((n) => (
                  <li key={n.id}>
                    <strong>{n.name}</strong> <span className="muted">{n.title} · {READINESS_LABEL[n.readiness]}{n.note ? ` · ${n.note}` : ""}</span>{" "}
                    <RemoveNominationForm action={removeNominationAction} id={n.id} name={n.name} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {r.suggestions.length > 0 ? (
            <div>
              <p className="eyebrow" style={{ margin: "0 0 4px" }}>Suggested</p>
              <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>
                {r.suggestions.map((c) => (
                  <li key={c.staffId}>
                    {c.name} <span className="muted">{c.title} · {c.tenureYears} yrs · {c.leadRuns} leadership run{c.leadRuns === 1 ? "" : "s"} ({c.leadGreat} great) · {c.certificates} certificate{c.certificates === 1 ? "" : "s"} · {c.lessonsPassed} lessons</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <NominateForm
            action={nominateAction}
            incumbent={r.incumbent.staffId}
            people={users.filter((u) => u.status === "active" && u.unit === r.incumbent.unit && u.staffId !== r.incumbent.staffId && u.tenureYears >= view.minTenure).map((u) => ({ staffId: u.staffId, label: `${u.name} · ${u.title}` }))}
          />
        </div>
      ))}
    </>
  );
}
