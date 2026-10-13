"use client";

import { useSyncExternalStore } from "react";

export type ViewMode = "iso" | "flat";

const KEY = "mq_mode";
const EVENT = "mq-mode-change";

/** The person's choice if they made one, otherwise the lighter view on slow connections or tiny screens. */
function read(): ViewMode {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "iso" || saved === "flat") return saved;
  } catch {
    /* private window or blocked storage */
  }
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || ["slow-2g", "2g", "3g"].includes(c?.effectiveType ?? "") || window.innerWidth < 460) return "flat";
  return "iso";
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Full isometric by default; flat 2D "Lite" automatically when it suits the device. Safe for server rendering. */
export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => "iso" as ViewMode);
  const set = (m: ViewMode) => {
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [mode, set];
}
