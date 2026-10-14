"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { finishTripAction, turnBackAction } from "@/app/actions/travel";
import type { TravelResult, TripView } from "@/lib/server/travel/service";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * A ride between offices, like the reference game's: the vehicle, the route, the time to go, anything on the road, and
 * buttons to skip the ride or turn back. The server keeps the time; this screen only counts down and then arrives.
 */
export function TripScreen({ trip, skipAllowed, turnBackAllowed, onArrive, onError }: { trip: TripView; skipAllowed: boolean; turnBackAllowed: boolean; onArrive: (r: Extract<TravelResult, { ok: true }>) => void; onError: (m: string) => void }) {
  const [now, setNow] = useState<number | null>(null);
  const [busy, start] = useTransition();
  const sent = useRef(false);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, []);

  const clock = now ?? 0;
  const left = trip.endsAt - clock;
  const over = now !== null && left <= 0;

  const finish = (skip: boolean) => {
    if (sent.current) return;
    sent.current = true;
    start(async () => {
      const r = await finishTripAction(skip);
      if (r.ok) onArrive(r);
      else {
        sent.current = false;
        onError(r.error);
      }
    });
  };

  // When the time is up, arrive (the server checks the time again)
  useEffect(() => {
    if (!over || sent.current) return;
    sent.current = true;
    void finishTripAction(false).then((r) => {
      if (r.ok) onArrive(r);
      else {
        sent.current = false;
        onError(r.error);
      }
    });
  }, [over, onArrive, onError]);

  const total = trip.endsAt - trip.startedAt;
  const pct = Math.min(100, Math.max(0, ((clock - trip.startedAt) / Math.max(1, total)) * 100));

  return (
    <div className="trip-screen" role="dialog" aria-label="On the road">
      <div className="trip-card">
        <p className="trip-title"><span aria-hidden="true">{trip.icon}</span> {trip.label} · {trip.fromName} → {trip.toName}</p>
        <div className="trip-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        <p className="trip-time" role="timer">{over ? "Arriving…" : `${mmss(left)} to go`}</p>
        <div className="trip-tags">
          {trip.event ? <span className="trip-tag">{trip.event.icon} {trip.event.label}</span> : null}
        </div>
        <p className="trip-note">Straight to work.</p>
        <div className="trip-actions">
          {skipAllowed ? <button type="button" className="trip-btn" disabled={busy} onClick={() => finish(true)}>Skip ride ›</button> : null}
          {turnBackAllowed ? (
            <button type="button" className="trip-btn ghost" disabled={busy} onClick={() => start(async () => { const r = await turnBackAction(); if (r.ok) onArrive(r); else onError(r.error); })}>↩ Turn back</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
