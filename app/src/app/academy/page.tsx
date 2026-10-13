import type { Metadata } from "next";
import Link from "next/link";
import { AcademyApp } from "@/components/AcademyApp";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/server/auth/dal";

export const metadata: Metadata = { title: "Meristem Academy" };

/** Learning is open at any time, also outside play hours, so the Academy has its own full-screen page as well as the map. */
export default async function AcademyPage() {
  await requireUser();
  return (
    <div className="academy-page">
      <header className="academy-page-bar">
        <Logo variant="light" width={150} />
        <nav className="academy-page-links" aria-label="Academy">
          <Link href="/">Back to the game</Link>
          <Link href="/dashboard">My dashboard</Link>
        </nav>
      </header>
      <main className="academy-body">
        <AcademyApp embedded />
      </main>
    </div>
  );
}
