"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitPlacementAction, type PlacementFormState } from "@/app/actions/placement";

export interface QuestionDTO {
  id: string;
  text: string;
  options: { id: string; label: string }[];
}

const initial: PlacementFormState = {};

/**
 * One question at a time. The chosen answers are kept in state and sent together, as hidden fields, when
 * the last question is confirmed. Scores and paths are never sent to the browser: only question text and
 * option labels. The server still validates every answer.
 */
export function PlacementForm({ questions, isRetake }: { questions: QuestionDTO[]; isRetake: boolean }) {
  const [state, action, pending] = useActionState(submitPlacementAction, initial);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLParagraphElement>(null);

  const total = questions.length;
  const q = questions[step];
  const isLast = step === total - 1;
  const chosen = answers[q.id];
  const percent = Math.round(((step + (chosen ? 1 : 0)) / total) * 100);

  // Move focus to the new question so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  return (
    <form
      action={action}
      className="stack"
      onKeyDown={(e) => {
        // Enter must not submit the form half-way through: it moves to the next question instead.
        if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type === "radio") {
          e.preventDefault();
          if (chosen && !isLast) setStep(step + 1);
        }
      }}
    >
      {/* The real answers, sent only on submit. Only answered questions have a field. */}
      {questions.map((x) => (answers[x.id] ? <input key={x.id} type="hidden" name={x.id} value={answers[x.id]} /> : null))}

      <div className="stack" style={{ gap: 6 }}>
        <p className="eyebrow" style={{ margin: 0 }} aria-live="polite">Question {step + 1} of {total}</p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progress">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div key={q.id} role="radiogroup" aria-labelledby={`q-${q.id}`} className="card stack question question-enter">
        <p id={`q-${q.id}`} ref={headingRef} tabIndex={-1} className="label question-text">{q.text}</p>
        {q.options.map((o) => (
          <label key={o.id} className="check option">
            {/* Unnamed on purpose: the hidden fields above carry the answers, so nothing is sent twice. */}
            <input
              type="radio"
              name={`choice-${q.id}`}
              value={o.id}
              checked={chosen === o.id}
              onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>

      {isLast && isRetake ? (
        <div className="stack">
          <label htmlFor="note" className="label">Why do you think your placement was wrong? (optional)</label>
          <textarea id="note" name="note" rows={3} maxLength={300} className="input" />
        </div>
      ) : null}

      {state.error ? <p role="alert" className="msg msg-error">{state.error}</p> : null}

      <div className="row" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || pending}>Back</button>
        {isLast ? (
          <button type="submit" className="btn" disabled={!chosen || pending}>
            {pending ? "Placing you…" : isRetake ? "Submit again" : "See my path"}
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => setStep(step + 1)} disabled={!chosen}>Next</button>
        )}
      </div>
    </form>
  );
}
