"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface TourProps {
  firstName: string;
  path: { name: string; emoji: string; blurb: string } | null;
  session: { enabled: boolean; maxMinutes: number; pauseMinutes: number };
  onDone: () => void;
}

interface Step {
  title: string;
  body: string;
  /** CSS selector of the part of the screen to spotlight. */
  target?: string;
}

function span(minutes: number): string {
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/** "2-hour" or "30-minute", for use before a noun. */
function adjective(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60}-hour` : `${minutes}-minute`;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(selector?: string): Box | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * A short, skippable welcome tour, like the one in the reference game. The first card shows the person's
 * Starting Path; the rest point at the status bars, the menu and the clock.
 */
export function Tour({ firstName, path, session, onDone }: TourProps) {
  const steps: Step[] = [
    { title: `Welcome to MeriQuest, ${firstName}!`, body: "Learn the way you work: practise real Meristem situations, build your skills and see how you are growing. Here is a quick look around." },
    { title: "Walk around Ikoyi HQ", body: "Click anywhere on the floor, or use the arrow keys or W, A, S and D. Walk onto a glowing green door to go to another room." },
    { title: "Your status bars", body: "Energy, Focus, Mood and Social show how your day is going. Look after them and you will perform better.", target: ".status" },
    { title: "Map and Work Phone", body: "The Map takes you to any room in the building, on any floor. Your Work Phone holds your apps. Workspace takes you to your desk.", target: ".hud-nav" },
    {
      title: "Work comes first",
      body: session.enabled
        ? `You can play for ${span(session.maxMinutes)} at a time, then take a ${adjective(session.pauseMinutes)} break. The clock at the top shows how long you have left.`
        : "Play whenever you can, but real work always comes first. The clock at the top shows your time.",
      target: ".hud-top",
    },
  ];

  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const idx = useRef(0);
  const step = steps[i];

  const go = useCallback((n: number, list: Step[]) => {
    idx.current = n;
    setI(n);
    setBox(measure(list[n]?.target));
  }, []);

  // Keep the spotlight on its target when the window is resized
  useEffect(() => {
    const onResize = () => setBox(measure(steps[idx.current]?.target));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // `steps` is rebuilt every render but only its targets matter, and those never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = i === steps.length - 1;
  const pad = 8;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const cardStyle: React.CSSProperties = box
    ? box.top > vh / 2
      ? { bottom: vh - box.top + pad + 14, left: "50%", transform: "translateX(-50%)" }
      : { top: box.top + box.height + pad + 14, left: "50%", transform: "translateX(-50%)" }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Welcome tour">
      {box ? (
        <div className="tour-spot" style={{ top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-card" style={cardStyle}>
        {i === 0 && path ? (
          <div className="tour-path" aria-label={`Your starting path: ${path.name}`}>
            <span className="tour-path-emoji" aria-hidden="true">{path.emoji}</span>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Your starting path</p>
              <strong>{path.name}</strong>
              <p className="muted small">{path.blurb}</p>
            </div>
          </div>
        ) : null}
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="tour-dots" aria-hidden="true">
          {steps.map((_, k) => (
            <span key={k} className={k === i ? "on" : ""} />
          ))}
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Skip tour</button>
          <button type="button" className="btn btn-sm" onClick={() => (last ? onDone() : go(i + 1, steps))} autoFocus>
            {last ? "Let's go" : i === 0 ? "Show me around" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
