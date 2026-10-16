import { WHO_ICON, type Consequence } from "@/lib/consequence";

const TONE_WORD = { good: "good", bad: "bad", mixed: "mixed" } as const;

/**
 * What would happen next in real life, after a choice: the headline, the timeline (today, this week, this month),
 * who is affected, and notes when something will come back later or the choice leads to another situation.
 * Practice only: these are learning consequences, never real HR action.
 */
export function ConsequencePanel({ consequence, comesBack, nextTitle }: { consequence?: Consequence; comesBack?: boolean; nextTitle?: string }) {
  if (!consequence && !comesBack && !nextTitle) return null;
  return (
    <div className="conseq" aria-label="What happens next">
      {consequence ? (
        <>
          <p className="conseq-head">If this were real: {consequence.headline}</p>
          <ol className="conseq-timeline">
            {consequence.timeline.map((t, i) => (
              <li key={i}>
                <strong>{t.when}</strong>
                <span>{t.text}</span>
              </li>
            ))}
          </ol>
          {consequence.impact.length > 0 ? (
            <ul className="conseq-impact">
              {consequence.impact.map((m, i) => (
                <li key={i} className={`impact-${TONE_WORD[m.tone]}`}>
                  <span aria-hidden="true">{WHO_ICON[m.who]}</span>
                  <span><strong>{m.who}</strong> {m.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {nextTitle ? <p className="conseq-note">➡️ This leads to a new situation: <strong>{nextTitle}</strong></p> : null}
      {comesBack ? <p className="conseq-note">🔔 This may come back to you later. Keep an eye on your Updates.</p> : null}
    </div>
  );
}
