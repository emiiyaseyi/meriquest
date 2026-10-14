"use client";

import { useEffect, useState } from "react";
import { getMine } from "@/lib/client/api";
import type { MyReport } from "@/lib/server/reports/mine";

const money = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

/** Reports: your own progress at a glance, from what you have done in MeriQuest. */
export function ReportsApp() {
  const [r, setR] = useState<MyReport | null>(null);
  useEffect(() => {
    getMine<MyReport>("report").then(setR).catch(() => undefined);
  }, []);
  if (!r) return <p className="phone-note">Loading…</p>;
  const row = (big: string, small: string) => <div className="people-row"><span className="chat-main"><strong>{big}</strong><small>{small}</small></span></div>;
  return (
    <div className="people reports">
      <div className="role-card">
        <small>Growth level</small>
        <strong>{r.level}</strong>
        <span>{r.points} Merit points{r.nextLevel ? ` · ${r.nextLevel.needed} more to ${r.nextLevel.name}` : " · top level"}</span>
        <small>Streak {r.streak.current} day{r.streak.current === 1 ? "" : "s"} (best {r.streak.best})</small>
      </div>
      <h3 className="people-h">Learning</h3>
      {row(`${r.learning.lessonsPassed}`, "lessons passed")}
      {row(`${r.learning.coursesStarted} of ${r.learning.coursesTotal}`, "courses started")}
      {row(`${r.learning.certificates}`, "certificates earned")}
      <h3 className="people-h">Work</h3>
      {row(`${r.work.shifts}`, "work shifts finished")}
      {row(`${r.work.leadRuns}`, "leadership simulator runs")}
      {row(r.clients.avgCsat === null ? "No clients yet" : `${r.clients.avgCsat} of 5`, `average client rating over ${r.clients.served} client${r.clients.served === 1 ? "" : "s"}${r.clients.breaches > 0 ? ` · ${r.clients.breaches} with a breach recorded` : ""}`)}
      {row(`${r.kudosReceived}`, "kudos received")}
      {r.portfolio ? row(money(r.portfolio.total), `practice portfolio · ${r.portfolio.pnl >= 0 ? "+" : ""}${money(r.portfolio.pnl)} (${r.portfolio.pnlPct}%)`) : null}
      <h3 className="people-h">Strongest skills</h3>
      <div className="role-skills">{r.topSkills.map((s) => <span key={s.label} className="kudos-chip">{s.icon} {s.label} · level {s.level}</span>)}</div>
      <p className="phone-note">This is for your own development. It is never used for pay or ratings.</p>
    </div>
  );
}
