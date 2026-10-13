"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WorldCanvas } from "./WorldCanvas";
import { Tour } from "./Tour";
import { MePanel, type MeTab } from "./MePanel";
import { PersonCard } from "./PersonCard";
import { Shortcuts } from "./Shortcuts";
import { LiftPanel } from "./LiftPanel";
import { PhoneUI } from "./PhoneUI";
import { AcademyApp } from "@/components/AcademyApp";
import { PlaceCard } from "./PlaceCard";
import { CityMap, type MapPick } from "./CityMap";
import type { FloorStatus } from "@/lib/world/access";
import { ReportForm, type ConcernRules } from "./ReportForm";
import { useViewMode } from "./viewMode";
import { playBeatAction, type BeatResult } from "@/app/actions/placement";
import { claimBonusAction, claimMissionAction, completeTourAction, gameStateAction, spotAction, travelMapAction, travelPortalAction } from "@/app/actions/world";
import type { GameState } from "@/lib/server/game/service";
import { BUILDINGS, SCENES, getScene } from "@/lib/world/scenes";
import { NEED_ICON } from "./needs";
import { NEED_LABEL } from "@/lib/game";
import { NEED_KEYS, moodLabel } from "@/lib/world/player";
import { nextQuarter, type Quarter } from "@/lib/iso/rotate";
import { countdown } from "@/lib/format";
import type { Hotspot, Npc, Portal, Scene, Skin } from "@/lib/world/types";

export interface PhoneApp {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  soon: boolean;
}

export interface GameShellProps {
  name: string;
  staffId: string;
  title: string;
  levels: { name: string; xp: number }[];
  concernRules: ConcernRules;
  /** For each floor: whether this person is kept out of it, and why. */
  floorStatus: Record<string, FloorStatus>;
  role: string;
  initialScene: string;
  look: Skin;
  game: GameState;
  timezone: string;
  terms: { workspace: string; workPhone: string; points: string; todaysPlan: string; academy: string };
  apps: PhoneApp[];
  adminPreview: boolean;
  /** The welcome tour: shown on first entry, and again if replayed from the menu. */
  showTour: boolean;
  path: { name: string; emoji: string; blurb: string } | null;
  session: { enabled: boolean; maxMinutes: number; pauseMinutes: number };
}

type Overlay = "map" | "phone" | "me" | "keys" | "report" | "lift" | "academy" | null;

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
function usePlayBeat(): { beat: BeatResult; at: number } | null {
  const [beat, setBeat] = useState<{ beat: BeatResult; at: number } | null>(null);
  useEffect(() => {
    let alive = true;
    let expiry: ReturnType<typeof setTimeout> | null = null;
    const send = async () => {
      if (document.hidden) return;
      try {
        const r = await playBeatAction("world");
        if (!alive) return;
        setBeat({ beat: r, at: Date.now() });
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

/** Seconds left in this play session, counting down every second between server answers. */
function useSecondsLeft(b: { beat: BeatResult; at: number } | null): number | null {
  const [now, setNow] = useState(0);
  const remaining = b?.beat.allowed ? b.beat.remainingSeconds : null;
  useEffect(() => {
    if (remaining === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  if (!b || remaining === null) return null;
  return Math.max(0, remaining - Math.max(0, now - b.at) / 1000);
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
  const { name, terms, apps, adminPreview } = props;
  const [game, setGame] = useState<GameState>(props.game);
  const { needs, points } = game;
  const [look, setLook] = useState<Skin>(props.look);
  const [sceneId, setSceneId] = useState(props.initialScene);
  const scene = getScene(sceneId) ?? SCENES[props.initialScene];
  const [arrive, setArrive] = useState<{ x: number; y: number }>(() => (getScene(props.initialScene) ?? SCENES[props.initialScene]).spawn);
  const [mode, setMode] = useViewMode();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [academyCard, setAcademyCard] = useState(false);
  const [mapPick, setMapPick] = useState<MapPick | null>(null);
  const [spot, setSpot] = useState<Hotspot | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clean, setClean] = useState(false);
  const [touring, setTouring] = useState(props.showTour);
  const clock = useLagosClock(props.timezone);
  const beatState = usePlayBeat();
  const beat = beatState?.beat ?? null;
  const secondsLeft = useSecondsLeft(beatState);
  const [rotation, setRotation] = useState<Quarter>(0);
  const [person, setPerson] = useState<Npc | null>(null);
  const [meTab, setMeTab] = useState<MeTab>("profile");
  const [reportAbout, setReportAbout] = useState("");
  const [place, setPlace] = useState<string | null>(null);
  const [walking, setWalking] = useState(false);
  const [skipTick, setSkipTick] = useState(0);
  const [gameAt, setGameAt] = useState(() => Date.now());

  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 3500);
  }, []);

  const onGame = useCallback(
    (g: GameState, message: string) => {
      setGame(g);
      setGameAt(Date.now());
      flash(message);
    },
    [flash],
  );

  // Needs fall with time on the server, so look again once a minute while the tab is open
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      void gameStateAction().then((g) => {
        setGame(g);
        setGameAt(Date.now());
      }).catch(() => undefined);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const runGame = useCallback(
    async (call: () => Promise<{ ok: true; state: GameState; message: string } | { ok: false; error: string }>) => {
      try {
        const r = await call();
        if (r.ok) onGame(r.state, r.message);
        else flash(r.error);
      } catch {
        flash("Could not do that just now. Please try again.");
      }
    },
    [onGame, flash],
  );

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

  const onPortal = useCallback(
    (p: Portal) => {
      // Lifts ask which floor; ordinary doors just go through
      if (p.lift) {
        setSpot(null);
        setOverlay("lift");
      } else void goTo(() => travelPortalAction(p.id));
    },
    [goTo],
  );
  const onHotspot = useCallback((h: Hotspot) => setSpot(h), []);
  const onNpc = useCallback((n: Npc) => {
    setOverlay(null);
    setPerson(n);
  }, []);
  const openMe = useCallback((t: MeTab) => {
    setPerson(null);
    setSpot(null);
    setMeTab(t);
    setOverlay("me");
  }, []);
  const onRotate = useCallback((by: 1 | -1) => setRotation((r) => nextQuarter(r, by)), []);
  const closeAll = useCallback(() => {
    setPlace(null);
    setAcademyCard(false);
    setMapPick(null);
    setOverlay(null);
    setSpot(null);
    setPerson(null);
  }, []);
  const anyOpen = overlay !== null || spot !== null || person !== null;

  // Escape closes whatever is open
  useEffect(() => {
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyOpen, closeAll]);

  const closed = beat !== null && !beat.allowed;
  const mood = moodLabel(needs);

  // Letter shortcuts, as in the reference game: M map, P phone, S needs, E people here, H Workspace, ? help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (touring || closed || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (k === "m") setOverlay((o) => (o === "map" ? null : "map"));
      else if (k === "p") setOverlay((o) => (o === "phone" ? null : "phone"));
      else if (k === "s") openMe("needs");
      else if (k === "e") openMe("people");
      else if (k === "?") setOverlay((o) => (o === "keys" ? null : "keys"));
      else if (k === "h") void goTo(() => travelMapAction("ikoyi-floor"));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [touring, closed, openMe, goTo]);
  const building = BUILDINGS.find((b) => b.id === scene.building);

  const toggleMode = () => setMode(mode === "iso" ? "flat" : "iso");

  const finishTour = () => {
    setTouring(false);
    void completeTourAction().catch(() => undefined); // remembered on the server; a failure only means it may show once more
  };

  return (
    <div className="game">
      <WorldCanvas scene={scene} start={arrive} look={look} name={name.split(" ")[0] || "You"} mode={mode} rotation={rotation} paused={busy || closed || touring || anyOpen} onPortal={onPortal} onHotspot={onHotspot} onNpc={onNpc} onRotate={onRotate} onHover={setHover} onWalking={setWalking} skipTick={skipTick} />

      {anyOpen && !touring ? <div className={`scrim${overlay === "me" || overlay === "keys" || overlay === "report" || overlay === "lift" || person ? " scrim-blur" : ""}`} onClick={closeAll} aria-hidden="true" /> : null}

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
            {adminPreview ? <span className="chip chip-preview" title="Work First is not applied to admins">Admin preview</span> : beat?.remainingSeconds != null ? <span className="chip chip-timer">⏳ {countdown(secondsLeft ?? beat.remainingSeconds)} left</span> : null}
            <span className="chip chip-points" title={terms.points}>✨ {points.toLocaleString("en-GB")} {terms.points.toLowerCase().includes("point") ? "pts" : ""}</span>
          </header>

          <aside className="hud-left">
            <div className="venue">
              <p className="eyebrow">{building?.name ?? "Meristem"}</p>
              <h2>{scene.name}</h2>
              <p className="muted">{scene.subtitle}</p>
              <button type="button" className="btn btn-sm" disabled title="Your work shift starts in the next update">Go to work · soon</button>
            </div>
            <button type="button" className="status" onClick={() => openMe("needs")} title="Your needs, goals and profile (S)" aria-label="Open my needs">
              <span className="avatar-badge" aria-hidden="true">{initials(name)}</span>
              <span className="needs">
                {NEED_KEYS.map((k) => <Bar key={k} label={NEED_LABEL[k]} icon={NEED_ICON[k]} value={needs[k]} />)}
              </span>
            </button>
          </aside>

          <aside className="hud-right">
            <button type="button" className="round-btn" onClick={() => (overlay === "me" ? setOverlay(null) : openMe("profile"))} title="Menu" aria-label="Menu">☰</button>
            <button type="button" className="round-btn" onClick={toggleMode} title={mode === "iso" ? "Switch to the lighter 2D view" : "Switch to the full isometric view"} aria-label="Switch view">{mode === "iso" ? "2D" : "3D"}</button>
            {mode === "iso" ? (
              <div className="turn-pair" role="group" aria-label="Turn the view">
                <button type="button" className="round-btn" onClick={() => onRotate(-1)} title="Turn the view left (Q)" aria-label="Turn the view left">↶</button>
                <button type="button" className="round-btn" onClick={() => onRotate(1)} title="Turn the view right (E)" aria-label="Turn the view right">↷</button>
              </div>
            ) : null}
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
              <span className="nav-wrap">{terms.workPhone}{game.unread > 0 ? <span className="badge-dot nav-badge">{game.unread > 9 ? "9+" : game.unread}</span> : null}</span>
            </button>
          </nav>

          {hover ? <div className="hover-tip" aria-hidden="true">{hover}</div> : null}
          {walking && !anyOpen ? <button type="button" className="skip-btn" onClick={() => setSkipTick((n) => n + 1)} title="Go straight there (Space)">Skip ⏭</button> : null}
        </>
      ) : (
        <button type="button" className="round-btn clean-back" onClick={() => setClean(false)} aria-label="Show the screen furniture">☰</button>
      )}

      {overlay === "map" && mapPick === null ? (
        <CityMap
          onClose={() => setOverlay(null)}
          onPick={(p) => {
            if (p === "academy") setAcademyCard(true);
            else setMapPick(p);
          }}
        />
      ) : null}

      {overlay === "map" && mapPick === "yaba" ? (
        <div className="me-panel person-card" role="dialog" aria-label="Yaba office">
          <div className="grab" aria-hidden="true" />
          <header className="me-head">
            <span className="kbd-badge" aria-hidden="true">📍</span>
            <div className="me-id"><h2>Yaba office</h2><p>213 Herbert Macaulay Way, Yaba</p></div>
            <button type="button" className="round-btn sm" onClick={() => setMapPick(null)} aria-label="Close">✕</button>
          </header>
          <div className="me-body"><p className="muted" style={{ margin: 0 }}>The Yaba office opens in a later update.</p></div>
        </div>
      ) : null}

      {overlay === "map" && mapPick === "hq" ? (
        <div className="sheet" role="dialog" aria-label="Meristem HQ">
          <div className="sheet-head">
            <button type="button" className="round-btn sm" onClick={() => setMapPick(null)} aria-label="Back to the map">‹</button>
            <h2>Meristem HQ, Ikoyi</h2>
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
                            <button key={s.id} type="button" className={`venue-card${s.id === sceneId ? " here" : ""}`} onClick={() => setPlace(s.id)} disabled={busy}>
                              <strong>{s.name}</strong>
                              <span className="muted">{s.id === sceneId ? "You are here" : props.floorStatus[s.level]?.blocked ? `🔒 ${props.floorStatus[s.level].note}` : s.subtitle}</span>
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
        <PhoneUI
          apps={apps.filter((a) => a.id !== "academy")}
          clock={clock}
          timezone={props.timezone}
          unread={game.unread}
          onUnread={(n) => setGame((g) => ({ ...g, unread: n }))}
          onClose={() => setOverlay(null)}
          onGoals={() => openMe("goals")}
          onSettings={() => openMe("settings")}
        />
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
            ) : game.spots[spot.kind] ? (
              <button type="button" className="activity" onClick={() => void runGame(() => spotAction(spot.kind))} disabled={(game.cooldowns[`spot:${spot.kind}`] ?? 0) > gameAt}>
                <strong>{game.spots[spot.kind].icon} {game.spots[spot.kind].label}</strong>
                <span className="muted">{(game.cooldowns[`spot:${spot.kind}`] ?? 0) > gameAt ? `Again in ${Math.max(1, Math.ceil(((game.cooldowns[`spot:${spot.kind}`] ?? 0) - gameAt) / 60_000))} min` : game.spots[spot.kind].tags.join(" · ")}</span>
              </button>
            ) : spot.kind === "meeting" ? (
              <div className="activity locked"><strong>Join a meeting</strong><span className="muted">Coming soon</span></div>
            ) : (
              <div className="activity locked"><strong>Ask a question</strong><span className="muted">Coming soon</span></div>
            )}
          </div>
        </div>
      ) : null}

      {person ? (
        <PersonCard
          person={person}
          here={scene.name}
          game={game}
          onGame={onGame}
          onClose={() => setPerson(null)}
          onReport={() => {
            setReportAbout(person.name);
            setPerson(null);
            setOverlay("report");
          }}
        />
      ) : null}
      {overlay === "report" ? <ReportForm rules={props.concernRules} about={reportAbout} onClose={() => setOverlay(null)} /> : null}

      {overlay === "me" ? (
        <MePanel
          tab={meTab}
          onTab={setMeTab}
          onClose={() => setOverlay(null)}
          name={name}
          staffId={props.staffId}
          title={props.title}
          role={props.role}
          look={look}
          needs={needs}
          points={points}
          moodText={mood}
          here={game.feelings[0]?.label ?? scene.name}
          game={game}
          sceneName={scene.name}
          onClaim={(id) => void runGame(() => claimMissionAction(id))}
          onClaimBonus={() => void runGame(() => claimBonusAction())}
          people={scene.npcs}
          onPerson={onNpc}
          path={props.path}
          levels={props.levels}
          terms={{ points: terms.points, todaysPlan: terms.todaysPlan, academy: terms.academy }}
          mode={mode}
          onMode={setMode}
          onTour={() => {
            setOverlay(null);
            setTouring(true);
          }}
          onShortcuts={() => setOverlay("keys")}
          onReport={() => {
            setReportAbout("");
            setOverlay("report");
          }}
          onLookSaved={(l) => {
            setLook(l);
            flash("Looking good! Your new look is saved.");
          }}
        />
      ) : null}

      {overlay === "keys" ? <Shortcuts onClose={() => setOverlay(null)} /> : null}

      {overlay === "map" && academyCard ? (
        <div className="me-panel person-card" role="dialog" aria-label={terms.academy}>
          <div className="grab" aria-hidden="true" />
          <header className="me-head">
            <span className="kbd-badge" aria-hidden="true">🎓</span>
            <div className="me-id">
              <h2>{terms.academy}</h2>
              <p>Learn at any time</p>
            </div>
            <button type="button" className="round-btn sm" onClick={() => setAcademyCard(false)} aria-label="Close">✕</button>
          </header>
          <div className="me-body">
            <div className="stack">
              <p className="muted" style={{ margin: 0 }}>Culture, compliance, products and services, customer experience and more. Courses are open to everyone.</p>
              <p className="me-label">THINGS TO DO HERE</p>
              <div className="chips">
                {["Attend a class", "Watch lesson videos", "Take quizzes", "Try scenarios", "Read case studies", "Earn certificates"].map((t) => <span key={t} className="thing">{t}</span>)}
              </div>
              <button type="button" className="primary-wide" onClick={() => { setAcademyCard(false); setOverlay("academy"); }}>Go to the {terms.academy}</button>
            </div>
          </div>
        </div>
      ) : null}

      {overlay === "academy" ? (
        <div className="academy-screen" role="dialog" aria-label={terms.academy}>
          <header className="academy-bar">
            <button type="button" className="round-btn sm" onClick={() => { setMapPick(null); setOverlay("map"); }} aria-label="Back to the map">‹</button>
            <h2>{terms.academy}</h2>
            <button type="button" className="round-btn sm" onClick={() => setOverlay(null)} aria-label="Close the Academy">✕</button>
          </header>
          <div className="academy-body"><AcademyApp embedded /></div>
        </div>
      ) : null}

      {overlay === "map" && place && getScene(place) ? (
        <PlaceCard
          scene={getScene(place) as Scene}
          building={BUILDINGS.find((b) => b.id === (getScene(place) as Scene).building)}
          game={game}
          here={place === sceneId}
          locked={props.floorStatus[(getScene(place) as Scene).level]?.blocked ? props.floorStatus[(getScene(place) as Scene).level].note : null}
          busy={busy}
          onGo={() => {
            const id = place;
            setPlace(null);
            void goTo(() => travelMapAction(id));
          }}
          onClose={() => setPlace(null)}
        />
      ) : null}

      {overlay === "lift" && building ? (
        <LiftPanel building={building} scenes={Object.values(SCENES)} hereLevel={scene.level} status={props.floorStatus} busy={busy} onPick={(id) => void goTo(() => travelMapAction(id))} onClose={() => setOverlay(null)} />
      ) : null}

      {touring ? <Tour firstName={name.split(" ")[0] || "there"} path={props.path} session={props.session} onDone={finishTour} /> : null}

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
