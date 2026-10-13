import type { Metadata } from "next";
import Link from "next/link";
import { AcademyApp } from "@/components/AcademyApp";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/server/auth/dal";

export const metadata: Metadata = { title: "Meristem Academy" };

/** Learning is open at any time, also outside play hours, so the Academy has its own page as well as the Work Phone. */
export default async function AcademyPage() {
  await requireUser();
  return (
    <main className="auth-shell" style={{ alignItems: "flex-start" }}>
      <Logo variant="light" width={190} />
      <div className="auth-card stack" style={{ width: "min(720px, 100%)" }}>
        <AcademyApp embedded />
        <p style={{ margin: 0 }}><Link href="/">Back to the game</Link> · <Link href="/dashboard">My dashboard</Link></p>
      </div>
    </main>
  );
}
