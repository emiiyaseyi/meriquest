"use client";

import { useSyncExternalStore } from "react";

export type ViewMode = "iso" | "flat";

const KEY = "mq_mode";
const EVENT = "mq-mode-change";

/** The person's choice if they made one, otherwise the full isometric view. */
function read(): ViewMode {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "iso" || saved === "flat") return saved;
  } catch {
    /* private window or blocked storage */
  }
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

/** Full isometric by default; the flat 2D "Lite" view only when the person picks it. Safe for server rendering. */
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
