"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { buyItemAction, getDecorAction, moveItemAction, placeItemAction, removeItemAction, setDecorModeAction } from "@/app/actions/decor";
import type { DecorResult, DecorView } from "@/lib/server/decor/service";
import { canPlace, type DecorItem } from "@/lib/decor";

type Pick = { kind: "place"; itemId: string } | { kind: "move"; uid: string } | null;

const TW = 64;
const TH = 32;

/**
 * Buy mode, like the reference game's: your Workspace from above, and a Catalogue with tabs and item cards. Things are
 * bought with Merit points. You either place them yourself on the tiles, or have them placed for you.
 */
export function BuyMode({ pointsLabel, onPoints, onClose }: { pointsLabel: string; onPoints: (n: number) => void; onClose: () => void }) {
  const [view, setView] = useState<DecorView | null>(null);
  const [tab, setTab] = useState<string>("");
  const [pick, setPick] = useState<Pick>(null);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, start] = useTransition();

  useEffect(() => {
    let live = true;
    void getDecorAction().then((v) => {
      if (!live) return;
      setView(v);
      setTab(v.categories[0]?.id ?? "");
    });
    return () => {
      live = false;
    };
  }, []);

  const byId = useMemo(() => new Map<string, DecorItem>((view?.items ?? []).map((i) => [i.id, i])), [view]);

  const run = (fn: () => Promise<DecorResult>, then?: (r: Extract<DecorResult, { ok: true }>) => void) => {
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setMsg({ text: r.error, bad: true });
        return;
      }
      setView(r.view);
      onPoints(r.view.points);
      setMsg({ text: r.message, bad: false });
      then?.(r);
    });
  };

  if (!view) return <div className="buy-screen" role="dialog" aria-label="Buy mode"><p className="buy-loading">Loading the catalogue…</p></div>;

  const { grid, decor } = view;
  const stored = (id: string) => (decor.owned[id] ?? 0) - decor.placed.filter((p) => p.item === id).length;
  const storage = Object.keys(decor.owned).filter((id) => stored(id) > 0 && byId.has(id));
  const items = view.items.filter((i) => i.category === tab);

  const onTile = (x: number, y: number) => {
    if (!pick || busy) return;
    if (pick.kind === "place") run(() => placeItemAction(pick.itemId, x, y), (r) => setPick(r.view.decor.owned[pick.itemId] && r.view.decor.owned[pick.itemId] > r.view.decor.placed.filter((p) => p.item === pick.itemId).length ? pick : null));
    else run(() => moveItemAction(pick.uid, x, y), () => setPick(null));
  };

  const sx = (x: number, y: number) => ((x - y) * TW) / 2 + (grid.d * TW) / 2;
  const sy = (x: number, y: number) => ((x + y) * TH) / 2;
  const W = ((grid.w + grid.d) * TW) / 2;
  const H = ((grid.w + grid.d) * TH) / 2 + 60;
  const pickItem = pick?.kind === "place" ? byId.get(pick.itemId) : pick?.kind === "move" ? byId.get(decor.placed.find((p) => p.uid === pick.uid)?.item ?? "") : undefined;
  const pickUid = pick?.kind === "move" ? pick.uid : undefined;

  return (
    <div className="buy-screen" role="dialog" aria-label="Buy mode">
      <header className="buy-top">
        <span className="buy-chip">Buy mode</span>
        <span className="buy-chip points">✨ {view.points} {pointsLabel}</span>
        <button type="button" className="round-btn sm" onClick={onClose} aria-label="Close Buy mode">✕</button>
      </header>

      <div className="buy-room">
        <svg viewBox={`0 0 ${W} ${H}`} className="buy-svg" role="group" aria-label="Your Workspace">
          {Array.from({ length: grid.w * grid.d }, (_, n) => {
            const x = n % grid.w;
            const y = Math.floor(n / grid.w);
            const cx = sx(x, y);
            const cy = sy(x, y) + 40;
            const ok = pickItem ? canPlace(decor.placed, byId, grid.w, grid.d, pickItem, x, y, pickUid) : false;
            return (
              <polygon
                key={n}
                points={`${cx},${cy} ${cx + TW / 2},${cy + TH / 2} ${cx},${cy + TH} ${cx - TW / 2},${cy + TH / 2}`}
                className={`buy-tile${pickItem ? (ok ? " can" : " cannot") : ""}`}
                onClick={() => onTile(x, y)}
              />
            );
          })}
          {[...decor.placed]
            .sort((a, b) => a.x + a.y - (b.x + b.y))
            .map((p) => {
              const it = byId.get(p.item);
              if (!it) return null;
              const cx = sx(p.x + it.w / 2, p.y + it.d / 2);
              const cy = sy(p.x + it.w / 2, p.y + it.d / 2) + 40 + TH / 2;
              const on = pickUid === p.uid;
              return (
                <g key={p.uid} className={`buy-thing${on ? " on" : ""}`} onClick={() => setPick(on ? null : { kind: "move", uid: p.uid })} role="button" aria-label={`${it.name}. Tap to move or put away`}>
                  <ellipse cx={cx} cy={cy + 6} rx={(TW / 2) * Math.max(it.w, it.d) * 0.7} ry={(TH / 2) * Math.max(it.w, it.d) * 0.7} className="buy-shadow" />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={30 + 8 * Math.max(it.w, it.d)}>{it.icon}</text>
                </g>
              );
            })}
        </svg>
        {pick ? (
          <div className="buy-hint" role="status">
            {pick.kind === "place" ? `Tap a tile to place the ${pickItem?.name ?? "item"}.` : `Tap a tile to move the ${pickItem?.name ?? "item"}.`}
            {pick.kind === "move" ? <button type="button" className="buy-link" onClick={() => run(() => removeItemAction(pick.uid), () => setPick(null))}>Put away</button> : null}
            <button type="button" className="buy-link" onClick={() => setPick(null)}>Cancel</button>
          </div>
        ) : null}
        {msg ? <p className={`buy-msg${msg.bad ? " bad" : ""}`} role="status">{msg.text}</p> : null}
      </div>

      <section className={`buy-sheet${hidden ? " hidden" : ""}`} aria-label="Catalogue">
        <div className="buy-sheet-head">
          <h2>Catalogue</h2>
          <div className="buy-mode" role="group" aria-label="How new things are placed">
            <button type="button" className={decor.mode === "grid" ? "on" : ""} onClick={() => run(() => setDecorModeAction("grid"))}>Place myself</button>
            <button type="button" className={decor.mode === "auto" ? "on" : ""} onClick={() => run(() => setDecorModeAction("auto"))}>Place for me</button>
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
              {storage.length > 0 ? (
                <button type="button" role="tab" aria-selected={tab === "__stored"} className={`buy-tab${tab === "__stored" ? " on" : ""}`} onClick={() => setTab("__stored")}>🎒 Yours ({storage.reduce((n, id) => n + stored(id), 0)})</button>
              ) : null}
            </div>
            <div className="buy-grid">
              {tab === "__stored"
                ? storage.map((id) => {
                    const it = byId.get(id) as DecorItem;
                    return (
                      <button key={id} type="button" className="buy-card" onClick={() => setPick({ kind: "place", itemId: id })}>
                        <span className="buy-size">{it.w}×{it.d}</span>
                        <span className="buy-art" aria-hidden="true">{it.icon}</span>
                        <span className="buy-name">{it.name}</span>
                        <span className="buy-price own">{stored(id)} to place</span>
                      </button>
                    );
                  })
                : items.map((it) => {
                    const short = view.points < it.price;
                    return (
                      <button key={it.id} type="button" className="buy-card" disabled={busy} onClick={() => run(() => buyItemAction(it.id), (r) => { if (r.view.decor.mode === "grid") setPick({ kind: "place", itemId: it.id }); })} aria-label={`${it.name}, ${it.price} ${pointsLabel}${short ? ", not enough points" : ""}`}>
                        <span className="buy-size">{it.w}×{it.d}</span>
                        {it.stars > 0 ? <span className="buy-stars" aria-label={`${it.stars} stars`}>{"★".repeat(it.stars)}</span> : null}
                        <span className="buy-art" aria-hidden="true">{it.icon}</span>
                        <span className="buy-name">{it.name}</span>
                        {it.effect ? <span className="buy-effect">Helps {it.effect.need}</span> : null}
                        <span className={`buy-price${short ? " short" : ""}`}>{it.price} pts</span>
                      </button>
                    );
                  })}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
