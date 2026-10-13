"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** A live countdown to when play opens again. When it reaches zero the page reloads into the game. */
export function BreakCountdown({ resumeAt }: { resumeAt: number }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, resumeAt - Date.now());
      setLeft(ms);
      if (ms === 0) router.refresh();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [resumeAt, router]);

  if (left === null) return null;
  const s = Math.ceil(left / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <div className="break-clock" role="timer" aria-live="off" aria-label={`Play opens again in ${mm} minutes ${ss} seconds`}>
      <span className="break-time">{mm}:{ss}</span>
      <span className="muted">until you can play again</span>
    </div>
  );
}
