import "server-only";
import { getStore } from "../store";

/**
 * How many colleagues are online now: the game has heard from them (a heartbeat while the game is open) in the last
 * two minutes. Everyone sees the same number, so it is worked out once and kept for a few seconds instead of on every screen.
 */
const ONLINE_MS = 2 * 60_000;
const KEEP_MS = 15_000;

interface Beat {
  lastBeat?: number | null;
}

let cached: { at: number; n: number } | null = null;

export async function onlineNow(now: number = Date.now()): Promise<number> {
  if (cached && now - cached.at < KEEP_MS && now >= cached.at) return cached.n;
  const rows = await getStore().list<Beat>("play_sessions");
  const n = rows.filter((r) => typeof r.lastBeat === "number" && now - r.lastBeat <= ONLINE_MS && r.lastBeat <= now + 5_000).length;
  cached = { at: now, n };
  return n;
}

/** For tests only. */
export const resetOnlineCache = (): void => {
  cached = null;
};
