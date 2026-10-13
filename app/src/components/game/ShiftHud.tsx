"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { answerShiftAction, finishShiftAction, getShiftAction, leaveShiftAction, startShiftAction } from "@/app/actions/shift";
import type { ShiftResult, ShiftView } from "@/lib/server/shift/service";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Go to work, like the reference game's work shift: a green button to start, then a shift card with the time left and
 * the situations that come up, each with choices. A shift is paid when the time is up; leaving early is not.
 */
export function ShiftHud({ onPoints, onUpdate, hidden }: { onPoints: () => void; onUpdate: () => void; hidden: boolean }) {
  const [view, setView] = useState<ShiftView | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ verdict: string; text: string } | null>(null);
  const [open, setOpen] = useState(true);
  const [busy, start] = useTransition();

  useEffect(() => {
    let live = true;
    void getShiftAction().then((v) => live && setView(v));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const run = useCallback(
    (fn: () => Promise<ShiftResult>, after?: (r: Extract<ShiftResult, { ok: true }>) => void) => {
      start(async () => {
        const r = await fn();
        if (!r.ok) {
          setMsg(r.error);
          return;
        }
        setView(r.view);
        setMsg(r.message);
        after?.(r);
      });
    },
    [],
  );

  const a = view?.active ?? null;
  const clock = now ?? 0;
  // When a locked situation's time comes, ask the server for the new state (at most once every few seconds, in case the clocks differ)
  const lastFetch = useRef(0);
  const dueLocked = a?.tasks.some((t) => t.state === "locked" && t.opensAt <= clock) ?? false;
  useEffect(() => {
    if (!dueLocked) return;
    const t = Date.now();
    if (t - lastFetch.current < 4000) return;
    lastFetch.current = t;
    void getShiftAction().then(setView);
  }, [dueLocked, clock]);

  if (!view || hidden) return null;

  if (!a) {
    const spent = view.today.count >= view.today.max;
    return (
      <>
        <button type="button" className="shift-go" disabled={busy || spent} onClick={() => run(startShiftAction)} title={spent ? "You have done today's shifts" : `A shift lasts ${view.minutes} minute${view.minutes === 1 ? "" : "s"}`}>
          💼 {spent ? "Shifts done today" : "Go to work"}
        </button>
        {msg ? <p className="shift-msg" role="status">{msg}</p> : null}
      </>
    );
  }

  const left = a.endsAt - clock;
  const next = a.tasks.find((t) => t.state === "locked");
  const active = a.tasks.find((t) => t.state === "open");
  const total = a.endsAt - a.startedAt;

  return (
    <>
      <aside className="shift-card" aria-label="Work shift">
        <button type="button" className="shift-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <strong>💼 On shift</strong>
          <span className="shift-time" role="timer">{left > 0 ? mmss(left) : "Done"}</span>
        </button>
        {open ? (
          <div className="shift-body">
            <div className="shift-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, ((clock - a.startedAt) / total) * 100))}%` }} /></div>
            <p className="muted small" style={{ margin: 0 }}>{a.answered} of {a.tasks.length} situations handled{next ? ` · next in ${mmss(next.opensAt - clock)}` : ""}</p>
            {left > 0 ? <p className="shift-pay">No pay yet · stay {Math.ceil(left / 60_000)} min</p> : <p className="shift-pay ok">Shift time is up. You can finish and be paid.</p>}
            {msg ? <p className="muted small" role="status" style={{ margin: 0 }}>{msg}</p> : null}
            {left <= 0 ? (
              <button type="button" className="primary-wide" disabled={busy} onClick={() => run(finishShiftAction, () => onPoints())}>Finish shift and get paid</button>
            ) : (
              <button type="button" className="shift-leave" disabled={busy} onClick={() => run(leaveShiftAction)}>Leave now · no pay</button>
            )}
          </div>
        ) : null}
      </aside>

      {active && !feedback ? (
        <div className="shift-event" role="dialog" aria-label={active.title}>
          <h3>{active.title}</h3>
          <p>{active.story}</p>
          <div className="shift-choices">
            {(active.choices ?? []).map((c, i) => (
              <button
                key={i}
                type="button"
                className="shift-choice"
                disabled={busy}
                onClick={() =>
                  run(
                    () => answerShiftAction(active.id, i),
                    (r) => {
                      setFeedback({ verdict: r.verdict ?? "partly", text: r.feedback ?? r.message });
                      onUpdate();
                    },
                  )
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div className={`shift-event result ${feedback.verdict}`} role="dialog" aria-label="Result">
          <h3>{feedback.verdict === "best" ? "Well handled" : feedback.verdict === "partly" ? "Not bad" : "Not quite"}</h3>
          <p>{feedback.text}</p>
          <button type="button" className="primary-wide" onClick={() => setFeedback(null)}>Continue</button>
        </div>
      ) : null}
    </>
  );
}
