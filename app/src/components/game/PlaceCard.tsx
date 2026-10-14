"use client";

import type { GameState } from "@/lib/server/game/service";
import type { Building, Scene } from "@/lib/world/types";

/** What each kind of spot is, when it is not one of the recharge spots from the settings. */
const OTHER: Record<string, { icon: string; label: string; note: string }> = {
  workspace: { icon: "🏢", label: "My Workspace", note: "Start your day and customise your desk" },
  meeting: { icon: "🤝", label: "Client meeting", note: "Meet a client" },
  info: { icon: "💬", label: "Ask a question", note: "Find a colleague to ask" },
};

/**
 * A place on the map, like the venue cards in the reference game: its name and floor, a line about it, the
 * things you can do there as chips, who is there, and a button to go. The activities come from the room's own
 * data and the settings, so they are always the ones that really exist.
 */
export function PlaceCard({ scene, building, game, here, locked, busy, onGo, onClose }: { scene: Scene; building: Building | undefined; game: GameState; here: boolean; locked: string | null; busy: boolean; onGo: () => void; onClose: () => void }) {
  const level = building?.levels.find((l) => l.id === scene.level)?.label ?? "";
  const things = scene.hotspots.map((h) => {
    const spot = game.spots[h.kind];
    if (spot) return { id: h.id, icon: spot.icon, label: spot.label, note: spot.tags.join(" · "), where: h.label };
    const o = OTHER[h.kind];
    return { id: h.id, icon: o?.icon ?? "✨", label: o?.label ?? h.label, note: o?.note ?? h.hint, where: h.label };
  });
  const lifts = scene.portals.some((p) => p.lift);
  return (
    <div className="me-panel person-card" role="dialog" aria-label={scene.name}>
      <div className="grab" aria-hidden="true" />
      <header className="me-head">
        <span className="kbd-badge" aria-hidden="true">📍</span>
        <div className="me-id">
          <h2>{scene.name}</h2>
          <p>{[building?.name, level].filter(Boolean).join(" · ")}</p>
        </div>
        <button type="button" className="round-btn sm" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="me-body">
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>{scene.subtitle}</p>
          {things.length > 0 ? (
            <>
              <p className="me-label">THINGS TO DO HERE</p>
              <div className="chips">
                {things.map((t) => (
                  <span key={t.id} className="thing" title={t.note}>
                    <span aria-hidden="true">{t.icon}</span> {t.label}
                    {t.note ? <em>{t.note}</em> : null}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {scene.npcs.length > 0 ? <p className="muted small">People here: {scene.npcs.map((n) => n.name).join(", ")}</p> : null}
          {lifts ? <p className="muted small">🛗 Lifts to the other floors are here.</p> : null}
          <button type="button" className="primary-wide" onClick={onGo} disabled={here || busy || locked !== null}>
            {here ? "You are here" : locked ? `🔒 ${locked}` : `Go to ${scene.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
