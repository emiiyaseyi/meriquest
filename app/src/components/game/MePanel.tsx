"use client";

import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { useState } from "react";
import { LookEditor } from "./LookEditor";
import { PersonPortrait } from "./PersonPortrait";
import { levelFor, type Needs } from "@/lib/world/player";
import type { Npc, Skin } from "@/lib/world/types";

export type MeTab = "profile" | "needs" | "goals" | "skills" | "people" | "career" | "settings";

const TABS: { id: MeTab; label: string; icon?: string }[] = [
  { id: "profile", label: "Profile", icon: "✏️" },
  { id: "needs", label: "Needs" },
  { id: "goals", label: "Goals" },
  { id: "skills", label: "Skills" },
  { id: "people", label: "People" },
  { id: "career", label: "Career" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const NEEDS: { key: keyof Needs; label: string; icon: string; color: string }[] = [
  { key: "energy", label: "Energy", icon: "⚡", color: "#2f6fe0" },
  { key: "focus", label: "Focus", icon: "🎯", color: "#1fa89a" },
  { key: "mood", label: "Mood", icon: "😊", color: "#e0a31b" },
  { key: "social", label: "Social", icon: "🤝", color: "#e0488a" },
];

export interface MePanelProps {
  tab: MeTab;
  onTab: (t: MeTab) => void;
  onClose: () => void;
  name: string;
  staffId: string;
  title: string;
  role: string;
  look: Skin;
  needs: Needs;
  points: number;
  moodText: string;
  here: string;
  people: Npc[];
  onPerson: (n: Npc) => void;
  path: { name: string; emoji: string; blurb: string } | null;
  levels: { name: string; xp: number }[];
  terms: { points: string; todaysPlan: string; academy: string };
  mode: "iso" | "flat";
  onMode: (m: "iso" | "flat") => void;
  onTour: () => void;
  onShortcuts: () => void;
  onLookSaved: (l: Skin) => void;
}

function Soon({ children = "Soon" }: { children?: string }) {
  return <span className="soon-chip">{children}</span>;
}

/**
 * "Me": the player's own panel, laid out like the reference game's menu (a card with the player's picture and
 * mood on top, a row of tabs, scrolling content). Everything shown comes from real data; sections whose game
 * systems are not built yet say so instead of showing made-up numbers.
 */
export function MePanel(p: MePanelProps) {
  const level = levelFor(p.points, p.levels);
  const [editing, setEditing] = useState(false);
  return (
    <div className="me-panel" role="dialog" aria-label="Me">
      <div className="grab" aria-hidden="true" />
      <header className="me-head">
        <PersonPortrait look={p.look} size={60} label="Your picture" />
        <div className="me-id">
          <h2>{p.name}</h2>
          <p>{p.moodText} · {p.here}</p>
        </div>
        <button type="button" className="round-btn sm" onClick={p.onClose} aria-label="Close">✕</button>
      </header>
      <div className="me-tabs" role="tablist" aria-label="Me sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={p.tab === t.id} className={`me-tab${p.tab === t.id ? " on" : ""}`} onClick={() => p.onTab(t.id)}>
            {t.icon ? <span aria-hidden="true">{t.icon} </span> : null}
            {t.label}
          </button>
        ))}
      </div>

      <div className="me-body" role="tabpanel">
        {p.tab === "profile" && editing ? <LookEditor look={p.look} onSaved={p.onLookSaved} onDone={() => setEditing(false)} /> : null}
        {p.tab === "profile" && !editing ? (
          <div className="stack">
            <div className="me-stage"><PersonPortrait look={p.look} size={260} full label="Your character" /></div>
            <div className="me-row"><strong>{p.name}</strong><span className="muted">{p.title}</span></div>
            <div className="me-row"><span className="muted">Staff ID</span><strong>{p.staffId}</strong></div>
            <button type="button" className="me-wide" onClick={() => setEditing(true)}>🎨 Change my look</button>
            <Link href="/dashboard" className="me-wide">📋 My dashboard</Link>
          </div>
        ) : null}

        {p.tab === "needs" ? (
          <div className="stack">
            {NEEDS.map((n) => (
              <div key={n.key} className="need-row">
                <span className="need-badge" aria-hidden="true">{n.icon}</span>
                <div className="need-main">
                  <div className="need-line"><span>{n.label}</span><span>{p.needs[n.key]}%</span></div>
                  <div className="bar" role="progressbar" aria-label={n.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.needs[n.key]}>
                    <span style={{ width: `${p.needs[n.key]}%`, background: n.color }} />
                  </div>
                </div>
              </div>
            ))}
            <p className="me-label">FEELINGS</p>
            <p className="muted small">Feelings appear here as your day goes: a good coffee, a win in a meeting, a long stretch at your desk.</p>
          </div>
        ) : null}

        {p.tab === "goals" ? (
          <div className="stack">
            <div className="goal-plan">
              <span className="goal-icon" aria-hidden="true">🎁</span>
              <div><strong>{p.terms.todaysPlan}</strong><span className="muted">Your daily missions arrive in a later update</span></div>
              <Soon>Soon</Soon>
            </div>
            {p.path ? (
              <div className="goal-path">
                <p className="eyebrow">YOUR STARTING PATH</p>
                <h3><span aria-hidden="true">{p.path.emoji}</span> {p.path.name}</h3>
                <p>{p.path.blurb}</p>
              </div>
            ) : null}
            <div className="me-row"><span className="muted">{p.terms.points}</span><strong>✨ {p.points.toLocaleString("en-GB")}</strong></div>
            <p className="me-label">CERTIFICATES</p>
            <p className="muted small">Certificates you earn in {p.terms.academy} will show here.</p>
          </div>
        ) : null}

        {p.tab === "skills" ? (
          <div className="stack">
            <p className="muted">Your skills grow as you finish {p.terms.academy} modules and practise real Meristem situations. Each skill has levels, and you will see them here.</p>
            <Soon>Coming soon</Soon>
          </div>
        ) : null}

        {p.tab === "people" ? (
          <div className="stack">
            <p className="me-label">PEOPLE HERE · {p.here.toUpperCase()}</p>
            {p.people.length === 0 ? <p className="muted">Nobody else is here right now.</p> : null}
            {p.people.map((n) => (
              <button key={n.id} type="button" className="person-row" onClick={() => p.onPerson(n)}>
                <PersonPortrait look={n.look} size={44} label={`${n.name}'s picture`} />
                <span><strong>{n.name}</strong><span className="muted">{n.role}</span></span>
              </button>
            ))}
          </div>
        ) : null}

        {p.tab === "career" ? (
          <div className="stack">
            <div className="career-card">
              <span className="muted small">{p.title}</span>
              <strong className="career-level">{level.name}</strong>
              <span className="muted">{level.next ? `${level.next.needed.toLocaleString("en-GB")} more ${p.terms.points.toLowerCase()} to reach ${level.next.name}` : "You are at the top level."}</span>
            </div>
            <div className="ladder" aria-label="Growth levels">
              {p.levels.map((l, i) => (
                <span key={l.name} className={`rung${i <= level.index ? " done" : ""}`} title={l.name} />
              ))}
            </div>
            <div className="ladder-labels"><span>{p.levels[0]?.name}</span><span>{p.levels[p.levels.length - 1]?.name}</span></div>
          </div>
        ) : null}

        {p.tab === "settings" ? (
          <div className="stack">
            <p className="me-label">DISPLAY</p>
            <div className="setting">
              <strong>Lite graphics</strong>
              <p className="muted small">Skips the 3D extras so MeriQuest loads fast on a slow network. The map, the phone and every button stay the same.</p>
              <div className="seg" role="radiogroup" aria-label="Graphics">
                <button type="button" role="radio" aria-checked={p.mode === "iso"} className={p.mode === "iso" ? "on" : ""} onClick={() => p.onMode("iso")}>Off (full 3D)</button>
                <button type="button" role="radio" aria-checked={p.mode === "flat"} className={p.mode === "flat" ? "on" : ""} onClick={() => p.onMode("flat")}>On</button>
              </div>
            </div>
            <p className="me-label">HELP</p>
            <button type="button" className="me-wide" onClick={p.onShortcuts}>⌨️ Keyboard shortcuts</button>
            <button type="button" className="me-wide" onClick={p.onTour}>👋 Replay the welcome tour</button>
            <p className="me-label">ACCOUNT</p>
            {p.role === "admin" ? <Link href="/admin" className="me-wide">🛠️ Admin</Link> : null}
            <Link href="/change-password" className="me-wide">🔑 Change password</Link>
            <form action={logoutAction}><button type="submit" className="me-wide">🚪 Sign out</button></form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
