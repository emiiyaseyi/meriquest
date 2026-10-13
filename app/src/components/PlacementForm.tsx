"use client";

import { useActionState } from "react";
import { submitPlacementAction, type PlacementFormState } from "@/app/actions/placement";

export interface QuestionDTO {
  id: string;
  text: string;
  options: { id: string; label: string }[];
}

const initial: PlacementFormState = {};

/** Scores and paths are never sent to the browser: only the question text and option labels. */
export function PlacementForm({ questions, isRetake }: { questions: QuestionDTO[]; isRetake: boolean }) {
  const [state, action, pending] = useActionState(submitPlacementAction, initial);
  return (
    <form action={action} className="stack">
      {questions.map((q, i) => (
        // A card with the question inside it. (A <fieldset> would draw the question on top of the border.)
        <div key={q.id} role="radiogroup" aria-labelledby={`q-${q.id}`} className="card stack question">
          <p id={`q-${q.id}`} className="label question-text">{i + 1}. {q.text}</p>
          {q.options.map((o) => (
            <label key={o.id} className="check option">
              <input type="radio" name={q.id} value={o.id} required />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      ))}
      {isRetake ? (
        <div className="stack">
          <label htmlFor="note" className="label">Why do you think your placement was wrong? (optional)</label>
          <textarea id="note" name="note" rows={3} maxLength={300} className="input" />
        </div>
      ) : null}
      {state.error ? <p role="alert" className="msg msg-error">{state.error}</p> : null}
      <div className="row">
        <button type="submit" className="btn" disabled={pending}>{pending ? "Placing you…" : isRetake ? "Submit again" : "See my path"}</button>
      </div>
    </form>
  );
}
