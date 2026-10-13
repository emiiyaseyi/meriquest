import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GameShell } from "@/components/game/GameShell";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/server/auth/dal";
import { getConfig } from "@/lib/server/config/registry";
import { getPlacement } from "@/lib/server/placement/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { playStatus } from "@/lib/server/workfirst/service";
import { closedTitle } from "@/lib/workfirst";

export const metadata: Metadata = { title: "Play" };

export default async function PlayPage() {
  const user = await requireUser();
  if (user.role !== "admin" && !(await getPlacement(user.staffId))) redirect("/placement");

  // Work First: when play is closed, no world data is sent to the browser at all.
  const status = await playStatus(user, "world");
  if (!status.allowed) {
    return (
      <main className="auth-shell">
        <Logo variant="light" width={220} />
        <div className="auth-card stack">
          <h1>{closedTitle(status.code)}</h1>
          <p className="muted" style={{ margin: 0 }}>{status.message}</p>
          <Link href="/" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>Back to the dashboard</Link>
        </div>
      </main>
    );
  }

  const [player, terms, workFirst, apps] = await Promise.all([
    getOrCreatePlayer(user),
    getConfig("terminology"),
    getConfig("workFirst"),
    getConfig("phoneApps"),
  ]);

  return (
    <GameShell
      name={user.name}
      role={user.role}
      initialScene={player.scene}
      look={player.look}
      needs={player.needs}
      points={player.points}
      timezone={workFirst.timezone}
      terms={{ workspace: terms.workspace, workPhone: terms.workPhone, points: terms.points }}
      apps={apps}
      adminPreview={status.code === "admin_preview"}
    />
  );
}
