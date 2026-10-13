"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WorldCanvas } from "./WorldCanvas";
import { Tour } from "./Tour";
import { useViewMode } from "./viewMode";
import { playBeatAction, type BeatResult } from "@/app/actions/placement";
import { logoutAction } from "@/app/actions/auth";
import { completeTourAction, travelMapAction, travelPortalAction } from "@/app/actions/world";
import { BUILDINGS, SCENES, getScene } from "@/lib/world/scenes";
import { moodLabel, type Needs } from "@/lib/world/player";
import type { Hotspot, Portal, Skin } from "@/lib/world/types";

export interface PhoneApp {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  soon: boolean;
}

export interface GameShellProps {
  name: string;
  role: string;
  initialScene: string;
  look: Skin;
  needs: Needs;
  points: number;
  timezone: string;
  terms: { workspace: string; workPhone: string; points: string };
  apps: PhoneApp[];
  adminPreview: boolean;
  /** The welcome tour: shown on first entry, and again if replayed from the menu. */
  showTour: boolean;
  path: { name: string; emoji: string; blurb: string } | null;
  session: { enabled: boolean; maxMinutes: number; pauseMinutes: number };
}

type Overlay = "map" | "phone" | "menu" | null;

const BEAT_MS = 30_000;

function useLagosClock(timezone: string): string {
  const fmt = useMemo(() => new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), [timezone]);
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () => setNow(fmt.format(new Date()).replace(",", ""));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [fmt]);
  return now;
}

/** Heartbeat to the server every 30 seconds while the tab is visible. The server decides if play continues. */
function usePlayBeat(): BeatResult | null {
  const [beat, setBeat] = useState<BeatResult | null>(null);
  useEffect(() => {
    let alive = true;
    let expiry: ReturnType<typeof setTimeout> | null = null;
    const send = async () => {
      if (document.hidden) return;
      try {
        const r = await playBeatAction("world");
        if (!alive) return;
        setBeat(r);
        // Ask again exactly when this session's time runs out, so the break screen appears promptly
        if (expiry) clearTimeout(expiry);
        if (r.allowed && r.remainingSeconds !== null) expiry = setTimeout(() => void send(), Math.max(1000, r.remainingSeconds * 1000 + 800));
      } catch {
        /* a brief network hiccup: keep the last answer */
      }
    };
    void send();
    const id = setInterval(send, BEAT_MS);
    return () => {
      alive = false;
      clearInterval(id);
      if (expiry) clearTimeout(expiry);
    };
  }, []);
  return beat;
}

function Bar({ label, icon, value }: { label: string; icon: string; value: number }) {
  const tone = value < 25 ? "low" : value < 50 ? "mid" : "ok";
  return (
    <div className="need" title={`${label}: ${value}%`}>
      <span className="need-icon" aria-hidden="true">{icon}</span>
      <span className="need-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span className={`need-fill need-${tone}`} style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "ME";
}

export function GameShell(props: GameShellProps) {
  const { name, look, needs, points, terms, apps, adminPreview } = props;
  const [sceneId, setSceneId] = useState(props.initialScene);
  const scene = getScene(sceneId) ?? SCENES[props.initialScene];
  const [arrive, setArrive] = useState<{ x: number; y: number }>(() => (getScene(props.initialScene) ?? SCENES[props.initialScene]).spawn);
  const [mode, setMode] = useViewMode();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [spot, setSpot] = useState<Hotspot | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clean, setClean] = useState(false);
  const [touring, setTouring] = useState(props.showTour);
  const clock = useLagosClock(props.timezone);
  const beat = usePlayBeat();

  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 3500);
  }, []);

  const goTo = useCallback(
    async (call: () => Promise<{ ok: true; scene: string; arrive: { x: number; y: number } } | { ok: false; error: string }>) => {
      if (busy) return;
      setBusy(true);
      setSpot(null);
      try {
        const r = await call();
        if (r.ok) {
          setSceneId(r.scene);
          setArrive(r.arrive);
          setOverlay(null);
        } else flash(r.error);
      } catch {
        flash("Could not move just now. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, flash],
  );

  const onPortal = useCallback((p: Portal) => void goTo(() => travelPortalAction(p.id)), [goTo]);
  const onHotspot = useCallback((h: Hotspot) => setSpot(h), []);

  const closed = beat !== null && !beat.allowed;
  const mood = moodLabel(needs);
  const building = BUILDINGS.find((b) => b.id === scene.building);

  const toggleMode = () => setMode(mode === "iso" ? "flat" : "iso");

  const finishTour = () => {
    setTouring(false);
    void completeTourAction().catch(() => undefined); // remembered on the server; a failure only means it may show once more
  };

  return (
    <div className="game">
      <WorldCanvas scene={scene} start={arrive} look={look} name={name.split(" ")[0] || "You"} mode={mode} paused={busy || closed || touring || overlay !== null} onPortal={onPortal} onHotspot={onHotspot} onHover={setHover} />

      {closed ? (
        <div className="overlay-screen" role="alertdialog" aria-labelledby="wf-title">
          <div className="auth-card stack">
            <h1 id="wf-title">{beat?.title ?? "Work first"}</h1>
            <p className="muted" style={{ margin: 0 }}>{beat?.message}</p>
            <Link href="/dashboard" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>Open my dashboard</Link>
          </div>
        </div>
      ) : null}

      {!clean ? (
        <>
          <header className="hud-top" aria-label="Status">
            <span className="chip">🕒 {clock || "…"}</span>
            <span className="chip chip-mood">😊 {mood}</span>
            {adminPreview ? <span className="chip chip-preview" title="Work First is not applied to admins">Admin preview</span> : beat?.remainingSeconds != null ? <span className="chip">⏳ {Math.max(1, Math.ceil(beat.remainingSeconds / 60))} min left</span> : null}
            <span className="chip chip-points" title={terms.points}>✨ {points.toLocaleString("en-GB")} {terms.points.toLowerCase().includes("point") ? "pts" : ""}</span>
          </header>

          <aside className="hud-left">
            <div className="venue">
              <p className="eyebrow">{building?.name ?? "Meristem"}</p>
              <h2>{scene.name}</h2>
              <p className="muted">{scene.subtitle}</p>
              <button type="button" className="btn btn-sm" disabled title="Your work shift starts in the next update">Go to work · soon</button>
            </div>
            <div className="status">
              <div className="avatar-badge" aria-hidden="true">{initials(name)}</div>
              <div className="needs">
                <Bar label="Energy" icon="⚡" value={needs.energy} />
                <Bar label="Focus" icon="🎯" value={needs.focus} />
                <Bar label="Mood" icon="😊" value={needs.mood} />
                <Bar label="Social" icon="🤝" value={needs.social} />
              </div>
            </div>
          </aside>

          <aside className="hud-right">
            <button type="button" className="round-btn" onClick={() => setOverlay(overlay === "menu" ? null : "menu")} title="Menu" aria-label="Menu">☰</button>
            <button type="button" className="round-btn" onClick={toggleMode} title={mode === "iso" ? "Switch to the lighter 2D view" : "Switch to the full isometric view"} aria-label="Switch view">{mode === "iso" ? "2D" : "3D"}</button>
            <button type="button" className="round-btn" onClick={() => setClean(true)} title="Hide the screen furniture" aria-label="Clean screen">🖼️</button>
          </aside>

          <nav className="hud-nav" aria-label="Game menu">
            <button type="button" className="nav-btn nav-active" onClick={() => void goTo(() => travelMapAction("ikoyi-floor"))}>
              <span aria-hidden="true">🏢</span>
              {terms.workspace}
            </button>
            <button type="button" className="nav-btn" disabled title="Desk items arrive in a later update">
              <span aria-hidden="true">🪑</span>
              Desk items
            </button>
            <button type="button" className="nav-btn" onClick={() => setOverlay(overlay === "map" ? null : "map")}>
              <span aria-hidden="true">🗺️</span>
              Map
            </button>
            <button type="button" className="nav-btn" onClick={() => setOverlay(overlay === "phone" ? null : "phone")}>
              <span aria-hidden="true">📱</span>
              {terms.workPhone}
            </button>
          </nav>

          {hover ? <div className="hover-tip" aria-hidden="true">{hover}</div> : null}
        </>
      ) : (
        <button type="button" className="round-btn clean-back" onClick={() => setClean(false)} aria-label="Show the screen furniture">☰</button>
      )}

      {overlay === "map" ? (
        <div className="sheet" role="dialog" aria-label="Map">
          <div className="sheet-head">
            <h2>Map</h2>
            <button type="button" className="round-btn sm" onClick={() => setOverlay(null)} aria-label="Close map">✕</button>
          </div>
          {BUILDINGS.map((b) => (
            <section key={b.id} className="stack">
              <p className="eyebrow">{b.name} · {b.city}</p>
              <div className="stack" style={{ gap: 8 }}>
                {b.levels.map((lv) => {
                  const rooms = Object.values(SCENES).filter((s) => s.building === b.id && s.level === lv.id);
                  return (
                    <div key={lv.id} className={`level-row${rooms.length === 0 ? " empty" : ""}`}>
                      <span className="level-label">{lv.label}</span>
                      <div className="venue-grid">
                        {rooms.length === 0 ? (
                          <span className="muted small">Not open yet</span>
                        ) : (
                          rooms.map((s) => (
                            <button key={s.id} type="button" className={`venue-card${s.id === sceneId ? " here" : ""}`} onClick={() => void goTo(() => travelMapAction(s.id))} disabled={s.id === sceneId || busy}>
                              <strong>{s.name}</strong>
                              <span className="muted">{s.id === sceneId ? "You are here" : s.subtitle}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="muted small">Yaba, and travel between offices, arrive in a later update.</p>
        </div>
      ) : null}

      {overlay === "phone" ? (
        <div className="phone-wrap" role="dialog" aria-label={terms.workPhone}>
          <div className="phone">
            <div className="phone-top"><span>{clock}</span><button type="button" className="round-btn sm" onClick={() => setOverlay(null)} aria-label="Close phone">✕</button></div>
            <div className="app-grid">
              {apps.filter((a) => a.enabled).map((a) => (
                <button key={a.id} type="button" className="app" disabled={a.soon} title={a.soon ? "Coming soon" : a.label} onClick={() => flash(`${a.label} is coming soon.`)}>
                  <span className="app-icon" aria-hidden="true">{a.icon}</span>
                  <span className="app-label">{a.label}</span>
                  {a.soon ? <span className="soon">soon</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {spot ? (
        <div className="sheet sheet-low" role="dialog" aria-label={spot.label}>
          <div className="sheet-head">
            <div>
              <p className="eyebrow">{scene.name}</p>
              <h2>{spot.label}</h2>
              <p className="muted">{spot.hint}</p>
            </div>
            <button type="button" className="round-btn sm" onClick={() => setSpot(null)} aria-label="Close">✕</button>
          </div>
          <div className="activity-row">
            {spot.kind === "workspace" ? (
              <>
                <div className="activity locked"><strong>Start my day</strong><span className="muted">Coming next</span></div>
                <div className="activity locked"><strong>Customise my desk</strong><span className="muted">Coming soon</span></div>
              </>
            ) : spot.kind === "coffee" ? (
              <div className="activity locked"><strong>Coffee break</strong><span className="muted">Coming soon · restores energy</span></div>
            ) : spot.kind === "meeting" ? (
              <div className="activity locked"><strong>Join a meeting</strong><span className="muted">Coming soon</span></div>
            ) : (
              <div className="activity locked"><strong>Ask a question</strong><span className="muted">Coming soon</span></div>
            )}
          </div>
        </div>
      ) : null}

      {overlay === "menu" ? (
        <div className="sheet sheet-small" role="dialog" aria-label="Menu">
          <div className="sheet-head">
            <h2>Menu</h2>
            <button type="button" className="round-btn sm" onClick={() => setOverlay(null)} aria-label="Close menu">✕</button>
          </div>
          <div className="menu-list">
            <Link href="/dashboard" className="menu-item">📋 My dashboard</Link>
            <button type="button" className="menu-item" onClick={() => { setOverlay(null); setTouring(true); }}>👋 Replay the welcome tour</button>
            {props.role === "admin" ? <Link href="/admin" className="menu-item">🛠️ Admin</Link> : null}
            <Link href="/change-password" className="menu-item">🔑 Change password</Link>
            <form action={logoutAction}><button type="submit" className="menu-item">🚪 Sign out</button></form>
          </div>
        </div>
      ) : null}

      {touring ? <Tour firstName={name.split(" ")[0] || "there"} path={props.path} session={props.session} onDone={finishTour} /> : null}

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
