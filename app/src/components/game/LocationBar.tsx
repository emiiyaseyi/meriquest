"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { cancelActivityAction, completeActivityAction, startActivityAction } from "@/app/actions/world";
import { getMine } from "@/lib/client/api";
import type { ActivityResult, LocationView } from "@/lib/server/game/activities";
import type { GameState } from "@/lib/server/game/service";

const secs = (ms: number) => Math.max(0, Math.ceil(ms / 1000));
const minsLeft = (ms: number) => `${Math.max(1, Math.ceil(ms / 60_000))} min`;

/**
 * The location bar, like the reference game's: the room's name and a line about it, its zones as tabs, and the
 * activities in each zone as cards with a timer, what they lift and the points they earn. The server keeps the time.
 */
export function LocationBar({ sceneId, hidden, onGame, onToast }: { sceneId: string; hidden: boolean; onGame: (g: GameState) => void; onToast: (t: string) => void }) {
  const [loc, setLoc] = useState<LocationView | null>(null);
  const [zone, setZone] = useState("");
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [busy, start] = useTransition();
  const finishing = useRef(false);

  useEffect(() => {
    let live = true;
    getMine<LocationView | null>("location").then((l) => {
      if (!live) return;
      setLoc(l);
      setZone(l?.zones[0]?.id ?? "");
    });
    return () => {
      live = false;
    };
  }, [sceneId]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, []);

  const apply = useCallback(
    (r: ActivityResult) => {
      if (!r.ok) {
        onToast(r.error);
        return;
      }
      setLoc(r.location);
      if (r.state) onGame(r.state);
      onToast(r.message);
    },
    [onGame, onToast],
  );

  // The timer starts at once in the browser; the server is told in the background and the screen is corrected if it says no
  const begin = useCallback((act: { id: string; label: string; seconds: number } | null) => {
    const before = loc;
    if (act && loc) setLoc({ ...loc, running: { id: act.id, label: act.label, endsAt: Date.now() + act.seconds * 1000 } });
    else if (loc) setLoc({ ...loc, running: null });
    start(async () => {
      const r = act ? await startActivityAction(act.id) : await cancelActivityAction();
      if (!r.ok) setLoc(before);
      // On success the screen already shows it, so only a refusal changes anything
      if (!r.ok) onToast(r.error);
    });
  }, [loc, onToast]);

  const running = loc?.running ?? null;
  const clock = now ?? 0;
  const due = running !== null && clock >= running.endsAt;
  useEffect(() => {
    // When the time is up, collect the reward (once)
    if (!due || finishing.current) return;
    finishing.current = true;
    void completeActivityAction().then((r) => {
      finishing.current = false;
      if (r.ok) apply(r);
      else void getMine<LocationView | null>("location").then(setLoc).catch(() => undefined);
    });
  }, [due, apply]);

  if (!loc || hidden || loc.scene !== sceneId) return null;
  const current = loc.zones.find((z) => z.id === zone) ?? loc.zones[0];

  return (
    <section className={`locbar${open ? " open" : ""}`} aria-label="What to do here">
      <button type="button" className="locbar-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="locbar-pin" aria-hidden="true">📍</span>
        <span className="locbar-title">
          <strong>{loc.name}</strong>
          <span className="muted small">{running ? `${running.label}… ${secs(running.endsAt - clock)}s` : loc.status}</span>
        </span>
        <span className="locbar-chev" aria-hidden="true">{open ? "⌄" : "⌃"}</span>
      </button>
      {open ? (
        <>
          <div className="locbar-tabs" role="tablist" aria-label="Zones">
            {loc.zones.map((z) => (
              <button key={z.id} type="button" role="tab" aria-selected={current.id === z.id} className={`locbar-tab${current.id === z.id ? " on" : ""}`} onClick={() => setZone(z.id)}>
                <span aria-hidden="true">{z.icon}</span> {z.label}
              </button>
            ))}
          </div>
          <div className="locbar-cards">
            {current.activities.map((a) => {
              const isRunning = running?.id === a.id;
              const wait = a.readyAt && a.readyAt > clock ? a.readyAt - clock : 0;
              const disabled = busy || running !== null || wait > 0;
              return (
                <button key={a.id} type="button" className={`locbar-card${isRunning ? " running" : ""}`} disabled={disabled && !isRunning} onClick={() => (isRunning ? begin(null) : begin(a))}>
                  <span className="locbar-card-top">
                    <span className="locbar-icon" aria-hidden="true">{a.icon}</span>
                    <span className="locbar-secs">⏱ {isRunning && running ? `${secs(running.endsAt - clock)}s` : `${a.seconds}s`}</span>
                  </span>
                  <strong>{a.label}</strong>
                  <span className="locbar-tags">
                    {a.tags.map((t) => <em key={t}>{t}</em>)}
                  </span>
                  {isRunning && running ? (
                    <span className="locbar-prog" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, 100 - ((running.endsAt - clock) / (a.seconds * 1000)) * 100))}%` }} /></span>
                  ) : wait > 0 ? (
                    <span className="muted small">Again in {minsLeft(wait)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
