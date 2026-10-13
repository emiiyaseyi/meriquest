import "server-only";
import { getStore } from "../store";
import { getConfig } from "../config/registry";
import { dayKey, pickMissions } from "@/lib/game";

/** One person's missions for one day. */
export interface MissionDay {
  id: string; // staffId:YYYY-MM-DD
  staffId: string;
  day: string;
  picks: string[];
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
  bonusClaimed: boolean;
}

export async function ensureMissionDay(staffId: string, now: number): Promise<MissionDay> {
  const [gameplay, work] = await Promise.all([getConfig("gameplay"), getConfig("workFirst")]);
  const day = dayKey(now, work.timezone);
  const id = `${staffId}:${day}`;
  const saved = await getStore().update<MissionDay>("missions", id, (cur) => {
    if (cur) return cur;
    return { id, staffId, day, picks: pickMissions(gameplay.missions, gameplay.missionsPerDay, staffId, day).map((m) => m.id), progress: {}, claimed: {}, bonusClaimed: false };
  });
  return saved as MissionDay;
}

/** Count something the person just did towards today's missions (only missions that were picked for them). */
export async function recordEvent(staffId: string, event: string, now: number = Date.now()): Promise<void> {
  try {
    const gameplay = await getConfig("gameplay");
    const doc = await ensureMissionDay(staffId, now);
    const hits = gameplay.missions.filter((m) => doc.picks.includes(m.id) && m.event === event);
    if (hits.length === 0) return;
    await getStore().update<MissionDay>("missions", doc.id, (cur) => {
      if (!cur) return cur;
      const progress = { ...cur.progress };
      for (const m of hits) progress[m.id] = Math.min(m.target, (progress[m.id] ?? 0) + 1);
      return { ...cur, progress };
    });
  } catch {
    // Missions are a bonus: never let them break the action that triggered them
    console.error("[missions] could not record event", event);
  }
}
