"use client";

import type { FloorStatus } from "@/lib/world/access";
import type { Building, Scene } from "@/lib/world/types";

/**
 * Shown when you step into a lift: the floors of the building, top to bottom. Floors that are restricted for
 * you show a lock and why; floors with no rooms built yet say so. The server checks the choice again.
 */
export function LiftPanel({ building, scenes, hereLevel, status, busy, onPick, onClose }: { building: Building; scenes: Scene[]; hereLevel: string; status: Record<string, FloorStatus>; busy: boolean; onPick: (sceneId: string) => void; onClose: () => void }) {
  return (
    <div className="me-panel lift-panel" role="dialog" aria-label="Lift">
      <div className="grab" aria-hidden="true" />
      <header className="me-head">
        <span className="kbd-badge" aria-hidden="true">🛗</span>
        <div className="me-id">
          <h2>Which floor?</h2>
          <p>{building.name} · {building.city}</p>
        </div>
        <button type="button" className="round-btn sm" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="me-body">
        <div className="stack" style={{ gap: 8 }}>
          {building.levels.map((lv) => {
            const rooms = scenes.filter((s) => s.building === building.id && s.level === lv.id);
            const st = status[lv.id];
            const here = lv.id === hereLevel;
            const locked = st?.blocked === true;
            const empty = rooms.length === 0;
            return (
              <button key={lv.id} type="button" className={`floor-btn${here ? " here" : ""}${locked ? " locked" : ""}`} disabled={busy || here || locked || empty} onClick={() => onPick(rooms[0].id)}>
                <strong>{lv.label}</strong>
                <span className="muted">{here ? "You are here" : locked ? `🔒 ${st.note}` : empty ? "Not open yet" : rooms.map((r) => r.name).join(" · ")}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
