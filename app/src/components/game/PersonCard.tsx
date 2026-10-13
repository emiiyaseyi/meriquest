"use client";

import { useState } from "react";
import { PersonPortrait } from "./PersonPortrait";
import { interactAction } from "@/app/actions/world";
import type { GameState } from "@/lib/server/game/service";
import type { Npc } from "@/lib/world/types";

/**
 * What opens when you click someone, laid out like the reference game's player card: picture and name on top,
 * one big primary action, then the other things you can do. Their game systems arrive later, so they say so.
 */
export function PersonCard({ person, here, game, onGame, onClose, onReport }: { person: Npc; here: string; game: GameState; onGame: (g: GameState, message: string) => void; onClose: () => void; onReport: () => void }) {
  const first = person.name.split(" ")[0];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const run = async (id: string) => {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      const r = await interactAction(id, person.id);
      if (r.ok) onGame(r.state, r.message);
      else setError(r.error);
    } catch {
      setError("Could not do that just now. Please try again.");
    } finally {
      setBusy(null);
    }
  };
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
          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="act-grid">
            {game.interactions.map((i) => {
              const until = game.cooldowns[`${i.id}:${person.id}`] ?? 0;
              const waiting = until > now;
              const poor = game.points < i.cost;
              return (
                <button key={i.id} type="button" className="act" disabled={busy !== null || waiting || poor} onClick={() => void run(i.id)}>
                  <span aria-hidden="true">{i.icon}</span>
                  <span>
                    <strong>{i.label}</strong>
                    <em>{waiting ? `Again in ${Math.max(1, Math.ceil((until - now) / 60_000))} min` : [i.cost > 0 ? `${i.cost} pts` : "", ...i.tags].filter(Boolean).join(" · ")}</em>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mini-row">
            <button type="button" className="mini" onClick={onReport}>🚩 Report a concern</button>
          </div>
        </div>
      </div>
    </div>
  );
}
