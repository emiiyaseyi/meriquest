import type { Metadata } from "next";
import Link from "next/link";
import { PlayHeartbeat } from "@/components/PlayHeartbeat";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/server/auth/dal";
import { getPlacement } from "@/lib/server/placement/service";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Play" };

/**
 * Placeholder for the game world (M3). It already enforces Work First: the heartbeat both credits
 * time and shows the "Work first" screen when play is closed.
 */
export default async function PlayPage() {
  const user = await requireUser();
  if (user.role !== "admin" && !(await getPlacement(user.staffId))) redirect("/placement");
  return (
    <main className="auth-shell" style={{ justifyContent: "flex-start" }}>
      <Logo variant="light" width={200} />
      <div className="auth-card stack">
        <h1>The Workspace</h1>
        <PlayHeartbeat activity="world" />
        <p className="muted">The isometric Ikoyi HQ world arrives in the next milestone.</p>
        <Link href="/">Back to dashboard</Link>
      </div>
    </main>
  );
}
