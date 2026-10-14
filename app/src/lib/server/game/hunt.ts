import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import { notify } from "../notices/service";
import type { PlayerRecord } from "../world/service";
import { dayKey } from "@/lib/game";
import { hashString } from "@/lib/iso/geometry";

type Cfg = Awaited<ReturnType<typeof getConfig<"hunt">>>;

export interface HuntView {
  clue: string;
  hint: string;
  found: boolean;
  /** Merit points for finding it now (full points while the first window is open). */
  pointsNow: number;
  /** When the faster reward ends (epoch ms), or null once found. */
  fastUntil: number | null;
}

/** The same clue all day for the same person, a different one each day. */
export function clueFor(cfg: Cfg, staffId: string, day: string) {
  return cfg.clues[hashString(`${staffId}|hunt|${day}`) % cfg.clues.length];
}

export function huntView(p: Pick<PlayerRecord, "staffId" | "hunt">, cfg: Cfg, now: number, day: string): HuntView | null {
  if (cfg.clues.length === 0) return null;
  const c = clueFor(cfg, p.staffId, day);
  const h = p.hunt?.day === day ? p.hunt : undefined;
  const shownAt = h?.shownAt ?? now;
  const fast = now <= shownAt + cfg.settings.fastMinutes * 60_000;
  return { clue: c.clue, hint: c.hint, found: h?.found === true, pointsNow: fast ? cfg.settings.pointsFast : cfg.settings.pointsLater, fastUntil: h?.found ? null : shownAt + cfg.settings.fastMinutes * 60_000 };
}

/** Remember when today's clue was first shown, so the faster reward counts from then. */
export async function ensureHunt(staffId: string, now: number): Promise<void> {
  const [cfg, work] = await Promise.all([getConfig("hunt"), getConfig("workFirst")]);
  if (cfg.clues.length === 0) return;
  const day = dayKey(now, work.timezone);
  await getStore().update<PlayerRecord>("players", staffId, (cur) => {
    if (!cur || cur.hunt?.day === day) return cur;
    return { ...cur, hunt: { day, shownAt: now, found: false } };
  });
}

/** Called when someone arrives in a room: finding today's room pays once. */
export async function checkHunt(staffId: string, sceneId: string, now: number): Promise<void> {
  try {
    const [cfg, work] = await Promise.all([getConfig("hunt"), getConfig("workFirst")]);
    if (cfg.clues.length === 0) return;
    const day = dayKey(now, work.timezone);
    const target = clueFor(cfg, staffId, day);
    if (target.scene !== sceneId) return;
    let points = 0;
    await getStore().update<PlayerRecord>("players", staffId, (cur) => {
      if (!cur) return cur;
      const h = cur.hunt?.day === day ? cur.hunt : { day, shownAt: now, found: false };
      if (h.found) return cur;
      points = now <= h.shownAt + cfg.settings.fastMinutes * 60_000 ? cfg.settings.pointsFast : cfg.settings.pointsLater;
      return { ...cur, points: cur.points + points, hunt: { ...h, found: true }, updatedAt: now };
    });
    if (points > 0) await notify(staffId, { icon: "🧭", text: `You found today's clue. +${points} Merit points.`, tone: "good" }, now);
  } catch {
    // The clue is a bonus: it must never break travelling
    console.error("[hunt] could not check the clue");
  }
}
