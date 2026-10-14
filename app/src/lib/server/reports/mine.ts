import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer } from "../world/service";
import { getAcademy } from "../academy/service";
import { getPortfolio } from "../market/service";
import { levelFor } from "@/lib/world/player";
import { withStats } from "@/lib/stats";
import { skillStanding } from "@/lib/game";

/** The person's own progress report for the Reports app on the Work Phone. Only their own records are read. */
export interface MyReport {
  points: number;
  level: string;
  nextLevel: { name: string; needed: number } | null;
  streak: { current: number; best: number };
  learning: { lessonsPassed: number; coursesStarted: number; certificates: number; coursesTotal: number };
  work: { shifts: number; leadRuns: number };
  clients: { served: number; avgCsat: number | null; breaches: number };
  kudosReceived: number;
  portfolio: { total: number; pnl: number; pnlPct: number } | null;
  topSkills: { label: string; icon: string; level: number }[];
}

type User = Pick<UserDTO, "staffId" | "unit" | "tenureYears">;

export async function myReport(user: User, now: number = Date.now()): Promise<MyReport> {
  const [player, levels, gameplay, home, kudos, portfolioDoc] = await Promise.all([
    getOrCreatePlayer(user, now),
    getConfig("levels"),
    getConfig("gameplay"),
    getAcademy(user, now),
    getStore().get<{ total: number }>("kudos_in", user.staffId),
    getStore().get<{ staffId: string }>("portfolios", user.staffId),
  ]);
  const lvl = levelFor(player.points, levels);
  const st = withStats(player.stats);
  const portfolio = portfolioDoc ? await getPortfolio(user, now) : null;
  return {
    points: player.points,
    level: lvl.name,
    nextLevel: lvl.next,
    streak: { current: player.streak?.count ?? 0, best: player.streak?.best ?? 0 },
    learning: {
      lessonsPassed: home.courses.reduce((n, c) => n + c.passed, 0),
      coursesStarted: home.courses.filter((c) => c.passed > 0).length,
      certificates: home.courses.filter((c) => c.certified && c.level !== null).length,
      coursesTotal: home.courses.length,
    },
    work: { shifts: st.shifts, leadRuns: st.leadRuns },
    clients: { served: st.clientsServed, avgCsat: st.clientsServed > 0 ? Math.round((st.csatTotal / st.clientsServed) * 10) / 10 : null, breaches: st.clientBreaches },
    kudosReceived: kudos?.total ?? 0,
    portfolio: portfolio ? { total: portfolio.total, pnl: portfolio.pnl, pnlPct: portfolio.pnlPct } : null,
    topSkills: gameplay.skills
      .map((s) => ({ label: s.label, icon: s.icon, level: skillStanding(s, player.skillXp?.[s.id] ?? 0).level }))
      .sort((a, b) => b.level - a.level)
      .slice(0, 4),
  };
}
