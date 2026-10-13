import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GameShell } from "@/components/game/GameShell";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/server/auth/dal";
import { getConfig } from "@/lib/server/config/registry";
import { getPlacement } from "@/lib/server/placement/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { getGameState } from "@/lib/server/game/service";
import { floorStatuses } from "@/lib/world/access";
import { BUILDINGS } from "@/lib/world/scenes";
import { playStatus } from "@/lib/server/workfirst/service";
import { closedTitle } from "@/lib/workfirst";

export const metadata: Metadata = { title: "MeriQuest" };

/**
 * The home screen IS the game, like the reference: after signing in you are in the world, greeted by a
 * short welcome tour the first time. The old dashboard now lives at /dashboard.
 */
export default async function HomePage() {
  const user = await requireUser();
  const placementCfg = await getConfig("placement");
  const placement = await getPlacement(user.staffId);
  // Everyone except admins answers the placement questionnaire once, at first sign-in.
  if (placementCfg.enabled && !placement && user.role !== "admin") redirect("/placement");

  // Work First: when play is closed (a break, a busy period...), no world data is sent to the browser at all.
  const status = await playStatus(user, "world");
  if (!status.allowed) {
    return (
      <main className="auth-shell">
        <Logo variant="light" width={220} />
        <div className="auth-card stack">
          <h1>{closedTitle(status.code)}</h1>
          <p className="muted" style={{ margin: 0 }}>{status.message}</p>
          <Link href="/academy" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>Open Meristem Academy</Link>
          <Link href="/dashboard" className="btn btn-ghost" style={{ textAlign: "center", textDecoration: "none" }}>Open my dashboard</Link>
        </div>
      </main>
    );
  }

  const [player, terms, workFirst, apps, levels, concerns, floors] = await Promise.all([
    getOrCreatePlayer(user),
    getConfig("terminology"),
    getConfig("workFirst"),
    getConfig("phoneApps"),
    getConfig("levels"),
    getConfig("concerns"),
    getConfig("floors"),
  ]);
  const game = await getGameState(user);
  const path = placement ? placementCfg.paths.find((p) => p.id === placement.pathId) : undefined;

  return (
    <GameShell
      name={user.name}
      staffId={user.staffId}
      title={user.title}
      levels={levels}
      concernRules={{ categories: concerns.categories, maxFiles: concerns.maxFiles, maxFileMb: concerns.maxFileMb }}
      role={user.role}
      initialScene={player.scene}
      look={player.look}
      game={game}
      floorStatus={floorStatuses(floors, BUILDINGS.flatMap((b) => b.levels), user)}
      timezone={workFirst.timezone}
      terms={{ workspace: terms.workspace, workPhone: terms.workPhone, points: terms.points, todaysPlan: terms.todaysPlan, academy: terms.academy }}
      apps={apps}
      adminPreview={status.code === "admin_preview"}
      showTour={!player.toured}
      path={path ? { name: path.name, emoji: path.emoji, blurb: path.blurb } : null}
      session={workFirst.sessionLimit}
    />
  );
}
