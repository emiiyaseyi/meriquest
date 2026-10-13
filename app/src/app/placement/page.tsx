import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PlacementForm } from "@/components/PlacementForm";
import { requireUser } from "@/lib/server/auth/dal";
import { getConfig } from "@/lib/server/config/registry";
import { getPlacement, retakeStatus } from "@/lib/server/placement/service";

export const metadata: Metadata = { title: "Find your path" };

export default async function PlacementPage() {
  const user = await requireUser();
  const cfg = await getConfig("placement");
  if (!cfg.enabled) redirect("/");
  const existing = await getPlacement(user.staffId);
  if (existing) {
    // A retake is only possible when the rules allow it; the server re-checks on submit.
    const d = await retakeStatus(user, existing);
    if (!d.allowed) redirect("/");
  }
  // Send only question text and option labels to the browser (never the scores).
  const questions = cfg.questions.map((q) => ({ id: q.id, text: q.text, options: q.options.map((o) => ({ id: o.id, label: o.label })) }));
  return (
    <main className="auth-shell" style={{ justifyContent: "flex-start" }}>
      <Logo variant="light" width={200} />
      <div className="auth-card stack" style={{ maxWidth: 640 }}>
        <h1>{existing ? "Dispute my placement" : "Let's find your starting path"}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {existing
            ? "Answer again and add a note if you think your path was wrong. There is no penalty."
            : "A few quick questions so MeriQuest can start you in the right place. There are no wrong answers, and you can dispute the result."}
        </p>
        <PlacementForm questions={questions} isRetake={Boolean(existing)} />
      </div>
    </main>
  );
}
