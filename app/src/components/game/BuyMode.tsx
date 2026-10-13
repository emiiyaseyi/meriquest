"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { buyAndPlaceAction, buyItemAction, getDecorAction, moveItemAction, placeItemAction, removeItemAction, setDecorModeAction } from "@/app/actions/decor";
import type { DecorResult, DecorView } from "@/lib/server/decor/service";
import { canPlace, firstFree, footprint, type DecorItem } from "@/lib/decor";

/** An item being put down: it shows in the room as a ghost until it is placed. */
export interface Ghost {
  item: string;
  x: number;
  y: number;
  rot: 0 | 1;
  ok: boolean;
  /** Set when an item already in the room is being moved. */
  uid?: string;
}

/**
 * Buy mode, like the reference game's: the live Workspace room stays on screen and the Catalogue slides up over it.
 * Pick an item and it appears in the room as a ghost; move it with the arrows (or the keys), turn it, then place it.
 * Things are bought with Merit points when they are placed.
 */
export function BuyMode({ initial, pointsLabel, onPoints, onClose, onView, onGhost }: { initial: DecorView | null; pointsLabel: string; onPoints: (n: number) => void; onClose: () => void; onView: (v: DecorView) => void; onGhost: (g: Ghost | null) => void }) {
  // Opens at once with what the room already knows, and refreshes in the background
  const [view, setView] = useState<DecorView | null>(initial);
  const [tab, setTab] = useState<string>(initial?.categories[0]?.id ?? "");
  const [ghost, setGhostState] = useState<Ghost | null>(null);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, start] = useTransition();

  const setGhost = useCallback(
    (g: Ghost | null) => {
      setGhostState(g);
      onGhost(g);
    },
    [onGhost],
  );

  useEffect(() => {
    let live = true;
    void getDecorAction().then((v) => {
      if (!live) return;
      setView(v);
      onView(v);
      setTab((t) => t || (v.categories[0]?.id ?? ""));
    });
    return () => {
      live = false;
      onGhost(null);
    };
  }, [onView, onGhost]);

  const byId = useMemo(() => new Map<string, DecorItem>((view?.items ?? []).map((i) => [i.id, i])), [view]);

  const apply = useCallback(
    (r: DecorResult): boolean => {
      if (!r.ok) {
        setMsg({ text: r.error, bad: true });
        return false;
      }
      setView(r.view);
      onView(r.view);
      onPoints(r.view.points);
      setMsg({ text: r.message, bad: false });
      return true;
    },
    [onView, onPoints],
  );

  const check = useCallback(
    (g: Omit<Ghost, "ok">): Ghost => {
      const it = byId.get(g.item);
      const ok = !!view && !!it && canPlace(view.decor.placed, byId, view.grid.w, view.grid.d, it, g.x, g.y, g.uid, g.rot);
      return { ...g, ok };
    },
    [byId, view],
  );

  const pickItem = (id: string) => {
    if (!view) return;
    const it = byId.get(id);
    if (!it) return;
    // Start in the first free spot, so the ghost appears where it can go
    const spot = firstFree(view.decor.placed, byId, view.grid.w, view.grid.d, it) ?? { x: 0, y: 0 };
    setMsg(null);
    setGhost(check({ item: id, x: spot.x, y: spot.y, rot: 0 }));
  };

  const move = useCallback(
    (dx: number, dy: number) => {
      if (!ghost || !view) return;
      const it = byId.get(ghost.item);
      if (!it) return;
      const f = footprint(it, ghost.rot);
      const x = Math.max(0, Math.min(view.grid.w - f.w, ghost.x + dx));
      const y = Math.max(0, Math.min(view.grid.d - f.d, ghost.y + dy));
      setGhost(check({ ...ghost, x, y }));
    },
    [ghost, view, byId, check, setGhost],
  );

  const turnIt = useCallback(() => {
    if (!ghost || !view) return;
    const it = byId.get(ghost.item);
    if (!it) return;
    const rot: 0 | 1 = ghost.rot === 1 ? 0 : 1;
    const f = footprint(it, rot);
    setGhost(check({ ...ghost, rot, x: Math.min(ghost.x, view.grid.w - f.w), y: Math.min(ghost.y, view.grid.d - f.d) }));
  }, [ghost, view, byId, check, setGhost]);

  const place = useCallback(
    (another: boolean) => {
      if (!ghost || !view || !ghost.ok || busy) return;
      const it = byId.get(ghost.item);
      if (!it) return;
      const stored = (view.decor.owned[it.id] ?? 0) - view.decor.placed.filter((p) => p.item === it.id).length;
      start(async () => {
        const r = ghost.uid ? await moveItemAction(ghost.uid, ghost.x, ghost.y, ghost.rot) : stored > 0 ? await placeItemAction(it.id, ghost.x, ghost.y, ghost.rot) : await buyAndPlaceAction(it.id, ghost.x, ghost.y, ghost.rot);
        if (!apply(r)) return;
        if (another && !ghost.uid && r.ok) {
          const spot = firstFree(r.view.decor.placed, new Map(r.view.items.map((i) => [i.id, i])), r.view.grid.w, r.view.grid.d, it);
          if (spot) {
            setGhost({ item: it.id, x: spot.x, y: spot.y, rot: ghost.rot, ok: true });
            return;
          }
        }
        setGhost(null);
      });
    },
    [ghost, view, byId, busy, apply, setGhost],
  );

  // Keys while placing: arrows move (as they look on screen), R turns, Enter places, Esc cancels
  useEffect(() => {
    if (!ghost) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setGhost(null);
      } else if (k === "Enter") {
        e.preventDefault();
        place(false);
      } else if (k === "r" || k === "R") {
        e.preventDefault();
        e.stopImmediatePropagation();
        turnIt();
      } else if (k === "ArrowUp") {
        e.preventDefault();
        move(-1, -1);
      } else if (k === "ArrowRight") {
        e.preventDefault();
        move(1, -1);
      } else if (k === "ArrowDown") {
        e.preventDefault();
        move(1, 1);
      } else if (k === "ArrowLeft") {
        e.preventDefault();
        move(-1, 1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [ghost, move, place, turnIt, setGhost]);

  if (!view) return <div className="buy-loading" role="status">Loading the catalogue…</div>;

  const stored = (id: string) => (view.decor.owned[id] ?? 0) - view.decor.placed.filter((p) => p.item === id).length;
  const yours = Object.keys(view.decor.owned).filter((id) => stored(id) > 0 && byId.has(id));
  const items = view.items.filter((i) => i.category === tab);
  const gi = ghost ? byId.get(ghost.item) : undefined;
  const short = !!gi && !ghost?.uid && stored(gi.id) <= 0 && view.points < gi.price;
  const mine = view.decor.placed;

  return (
    <>
      <div className="buy-top" role="group" aria-label="Buy mode">
        <span className="buy-chip">Buy mode</span>
        <button type="button" className="round-btn sm buy-close" onClick={onClose} aria-label="Close Buy mode">✕</button>
      </div>
      {msg ? <p className={`buy-msg${msg.bad ? " bad" : ""}`} role="status">{msg.text}</p> : null}

      {ghost && gi ? (
        <section className="buy-sheet placing" aria-label="Place the item">
          <div className="place-head">
            <div>
              <h2>{gi.name}</h2>
              <p className="muted small">Arrow keys move · R turns · Enter places · Esc cancels</p>
            </div>
            <strong className={`place-price${short ? " short" : ""}`}>{ghost.uid || stored(gi.id) > 0 ? "Yours" : `${gi.price} pts`}</strong>
          </div>
          <div className="place-body">
            <div className="place-pad" role="group" aria-label="Move the item">
              <button type="button" onClick={() => move(-1, 0)} aria-label="Move up left">↖</button>
              <button type="button" onClick={() => move(0, -1)} aria-label="Move up right">↗</button>
              <button type="button" className="turn" onClick={turnIt} aria-label="Turn the item">⟳</button>
              <button type="button" onClick={() => move(0, 1)} aria-label="Move down left">↙</button>
              <button type="button" onClick={() => move(1, 0)} aria-label="Move down right">↘</button>
            </div>
            <div className="place-actions">
              <button type="button" className="place-btn go" disabled={!ghost.ok || short || busy} onClick={() => place(false)}>✓ {ghost.uid ? "Move here" : "Place"}</button>
              {!ghost.uid ? <button type="button" className="place-btn" disabled={!ghost.ok || short || busy} onClick={() => place(true)}>✓ Place + 1 more</button> : null}
              {ghost.uid ? <button type="button" className="place-btn" disabled={busy} onClick={() => { const uid = ghost.uid as string; start(async () => { if (apply(await removeItemAction(uid))) setGhost(null); }); }}>Put away</button> : null}
              <button type="button" className="place-btn" onClick={() => setGhost(null)}>✕ Cancel</button>
            </div>
          </div>
          {!ghost.ok ? <p className="place-note">That spot is not free: the green tile turns red when it is blocked.</p> : short ? <p className="place-note">You need {gi.price} {pointsLabel} for this.</p> : null}
        </section>
      ) : (
        <section className={`buy-sheet${hidden ? " hidden" : ""}`} aria-label="Catalogue">
          <div className="buy-sheet-head">
            <h2>Catalogue</h2>
            <div className="buy-mode" role="group" aria-label="How new things are placed">
              <button type="button" className={view.decor.mode === "grid" ? "on" : ""} onClick={() => start(async () => void apply(await setDecorModeAction("grid")))}>Place myself</button>
              <button type="button" className={view.decor.mode === "auto" ? "on" : ""} onClick={() => start(async () => void apply(await setDecorModeAction("auto")))}>Place for me</button>
            </div>
            <button type="button" className="buy-hide" onClick={() => setHidden((h) => !h)}>{hidden ? "Show" : "Hide"}</button>
          </div>
          {!hidden ? (
            <>
              <div className="buy-tabs" role="tablist" aria-label="Catalogue tabs">
                {view.categories.map((c) => (
                  <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} className={`buy-tab${tab === c.id ? " on" : ""}`} onClick={() => setTab(c.id)}>
                    <span aria-hidden="true">{c.icon}</span> {c.label}
                  </button>
                ))}
                {yours.length > 0 ? <button type="button" role="tab" aria-selected={tab === "__stored"} className={`buy-tab${tab === "__stored" ? " on" : ""}`} onClick={() => setTab("__stored")}>🎒 In storage ({yours.reduce((n, id) => n + stored(id), 0)})</button> : null}
                {mine.length > 0 ? <button type="button" role="tab" aria-selected={tab === "__room"} className={`buy-tab${tab === "__room" ? " on" : ""}`} onClick={() => setTab("__room")}>🏠 In my room ({mine.length})</button> : null}
              </div>
              <div className="buy-grid">
                {tab === "__room"
                  ? mine.map((p) => {
                      const it = byId.get(p.item);
                      if (!it) return null;
                      return (
                        <button key={p.uid} type="button" className="buy-card" onClick={() => setGhost(check({ item: p.item, x: p.x, y: p.y, rot: p.rot ?? 0, uid: p.uid }))}>
                          <span className="buy-size">{it.w}×{it.d}</span>
                          <span className="buy-art" aria-hidden="true">{it.icon}</span>
                          <span className="buy-name">{it.name}</span>
                          <span className="buy-effect">&nbsp;</span>
                          <span className="buy-price own">Move or put away</span>
                        </button>
                      );
                    })
                  : tab === "__stored"
                    ? yours.map((id) => {
                        const it = byId.get(id) as DecorItem;
                        return (
                          <button key={id} type="button" className="buy-card" onClick={() => pickItem(id)}>
                            <span className="buy-size">{it.w}×{it.d}</span>
                            <span className="buy-art" aria-hidden="true">{it.icon}</span>
                            <span className="buy-name">{it.name}</span>
                            <span className="buy-effect">&nbsp;</span>
                            <span className="buy-price own">{stored(id)} to place</span>
                          </button>
                        );
                      })
                    : items.map((it) => {
                        const poor = view.points < it.price;
                        return (
                          <button
                            key={it.id}
                            type="button"
                            className="buy-card"
                            disabled={busy}
                            onClick={() => (view.decor.mode === "auto" ? start(async () => void apply(await buyItemAction(it.id))) : pickItem(it.id))}
                            aria-label={`${it.name}, ${it.price} ${pointsLabel}${poor ? ", not enough points" : ""}`}
                          >
                            <span className="buy-size">{it.w}×{it.d}</span>
                            {it.stars > 0 ? <span className="buy-stars" aria-label={`${it.stars} stars`}>{"★".repeat(it.stars)}</span> : null}
                            <span className="buy-art" aria-hidden="true">{it.icon}</span>
                            <span className="buy-name">{it.name}</span>
                            <span className="buy-effect">{it.effect ? `Helps ${it.effect.need}` : " "}</span>
                            <span className={`buy-price${poor ? " short" : ""}`}>{it.price} pts</span>
                          </button>
                        );
                      })}
              </div>
            </>
          ) : null}
        </section>
      )}
    </>
  );
}
