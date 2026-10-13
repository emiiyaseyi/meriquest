"use client";

import { PersonPortrait } from "./PersonPortrait";
import type { Npc } from "@/lib/world/types";

/**
 * What opens when you click someone, laid out like the reference game's player card: picture and name on top,
 * one big primary action, then the other things you can do. Their game systems arrive later, so they say so.
 */
export function PersonCard({ person, here, onClose }: { person: Npc; here: string; onClose: () => void }) {
  const first = person.name.split(" ")[0];
  return (
    <div className="me-panel person-card" role="dialog" aria-label={`${person.name}'s profile`}>
      <div className="grab" aria-hidden="true" />
      <header className="me-head">
        <PersonPortrait look={person.look} size={60} label={`${person.name}'s picture`} />
        <div className="me-id">
          <h2>{person.name}</h2>
          <p>{person.role} · {here}</p>
        </div>
        <button type="button" className="round-btn sm" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="me-body">
        <div className="stack">
          <button type="button" className="primary-wide" disabled>💬 Chat <span className="soon-chip light">Soon</span></button>
          <button type="button" className="me-wide" disabled>📄 View {first}&apos;s profile <span className="soon-chip">Soon</span></button>
          <div className="act-grid">
            <button type="button" className="act" disabled><span aria-hidden="true">👋</span><span><strong>Say hello</strong><em>+Social</em></span></button>
            <button type="button" className="act" disabled><span aria-hidden="true">💡</span><span><strong>Share a tip</strong><em>+Social</em></span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
