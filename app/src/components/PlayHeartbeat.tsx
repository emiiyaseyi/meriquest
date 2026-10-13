"use client";

import { useEffect, useRef, useState } from "react";
import { playBeatAction, type BeatResult } from "@/app/actions/placement";

const BEAT_MS = 30_000;

/**
 * Sends a heartbeat every 30 seconds while the tab is visible. The server credits the time and
 * decides whether play continues; this component only displays the answer. Time is never counted
 * on the client, so closing or pausing the tab cannot be abused either way.
 */
export function PlayHeartbeat({ activity }: { activity: "world" | "learning" }) {
  const [state, setState] = useState<BeatResult | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    const beat = async () => {
      if (document.hidden) return; // paused while the tab is hidden
      try {
        const r = await playBeatAction(activity);
        if (alive) {
          setState(r);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    void beat();
    timer.current = setInterval(beat, BEAT_MS);
    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [activity]);

  if (failed && !state) return <p role="status" className="msg msg-error">Could not reach the server. Your time is paused.</p>;
  if (!state) return <p className="muted">Checking Work First…</p>;
  if (!state.allowed) {
    return (
      <div role="status" className="card stack">
        <h2>Work first</h2>
        <p>{state.message}</p>
      </div>
    );
  }
  const mins = state.remainingSeconds === null ? null : Math.ceil(state.remainingSeconds / 60);
  return (
    <div role="status" className="card stack">
      <h2>Play is open</h2>
      <p className="muted">{mins === null ? "No limit right now." : `About ${mins} minute${mins === 1 ? "" : "s"} left in this session.`}</p>
      {state.nudge ? <p className="msg msg-ok">You have played a while today. Time for a break?</p> : null}
      {state.weeklySoftCapReached ? <p className="msg msg-ok">You have reached this week&apos;s suggested play time.</p> : null}
    </div>
  );
}
