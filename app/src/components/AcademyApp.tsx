"use client";

import { useCallback, useEffect, useState } from "react";
import { academyHomeAction, attendAction, caseAction, courseAction, notesAction, quizAction, scenarioAction, scenarioAnswerAction, submitQuizAction } from "@/app/actions/academy";
import { LEVEL_NAME, type AcademyHome, type CaseView, type CourseCard, type CourseView, type LessonNotes, type Level, type QuizResult, type QuizSet, type ScenarioOutcome, type ScenarioPlay } from "@/lib/academy";

import { LeadershipSim } from "@/components/LeadershipSim";

type View =
  | { kind: "home" }
  | { kind: "lead" }
  | { kind: "course"; id: string }
  | { kind: "notes"; course: string; lesson: string }
  | { kind: "quiz"; course: string; lesson: string }
  | { kind: "scenario"; course: string; id: string }
  | { kind: "case"; course: string; id: string };

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Ring({ done, total }: { done: number; total: number }) {
  const frac = total === 0 ? 0 : done / total;
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <span className="ring" aria-label={`${done} of ${total} lessons`}>
      <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#e1e7e2" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#2d5d41" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 20 20)" />
      </svg>
      <b>{done}/{total}</b>
    </span>
  );
}

const levelTone = (l: Level | null) => (l === null ? "done" : l === 1 ? "easy" : l === 2 ? "medium" : "hard");

/**
 * Meristem Academy, in the Work Phone and on its own page. Courses sit in groups; each course has lessons
 * (a timed class, then notes, then a quiz), three levels that unlock as you pass, scenarios and case studies.
 * Everything comes from the server, which also holds the right answers.
 */
export function AcademyApp({ onBack, embedded = false }: { onBack?: () => void; embedded?: boolean }) {
  const [view, setView] = useState<View>({ kind: "home" });
  const [home, setHome] = useState<AcademyHome | null>(null);
  const [course, setCourse] = useState<CourseView | null>(null);
  const [notes, setNotes] = useState<LessonNotes | null>(null);
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [scenario, setScenario] = useState<ScenarioPlay | null>(null);
  const [outcome, setOutcome] = useState<ScenarioOutcome | null>(null);
  const [kase, setKase] = useState<CaseView | null>(null);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const run = useCallback(async <T,>(fn: () => Promise<{ ok: true; value: T } | { ok: false; error: string }>, then: (v: T) => void) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      if (r.ok) then(r.value);
      else setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadHome = useCallback(() => {
    void academyHomeAction().then((h) => {
      setHome(h);
      setNow(Date.now());
    }).catch(() => setError("Could not load the Academy."));
  }, []);
  const loadCourse = useCallback((id: string) => void run(() => courseAction(id), (c) => { setCourse(c); setNow(Date.now()); }), [run]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  // A running class: tick every second, and look again when it ends so the notes open
  const endsAt = home?.attending?.endsAt ?? null;
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= endsAt) {
        loadHome();
        if (view.kind === "course") loadCourse(view.id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, loadHome, loadCourse, view]);

  const go = (v: View) => {
    setError(null);
    setView(v);
    if (v.kind === "course") loadCourse(v.id);
    if (v.kind === "home") loadHome();
  };

  const open = (c: CourseCard) => go({ kind: "course", id: c.id });

  const readNotes = (courseId: string, lessonId: string) => {
    setNotes(null);
    setView({ kind: "notes", course: courseId, lesson: lessonId });
    void run(() => notesAction(courseId, lessonId), setNotes);
  };

  const startQuiz = (courseId: string, lessonId: string) =>
    void run(() => quizAction(courseId, lessonId), (q) => {
      setQuiz(q);
      setAnswers(Array(q.questions.length).fill(-1));
      setStep(0);
      setResult(null);
      setView({ kind: "quiz", course: courseId, lesson: lessonId });
    });

  const submit = (courseId: string, lessonId: string) =>
    void run(() => submitQuizAction(courseId, lessonId, answers), (r) => {
      setNow(Date.now());
      setResult(r);
    });

  const wrap = (children: React.ReactNode) => <div className={`academy${embedded ? " embedded" : ""}`}>{children}</div>;
  const back = (to: View, label: string) => (
    <button type="button" className="ac-back" onClick={() => go(to)}>‹ {label}</button>
  );
  const err = error ? <p className="error" role="alert">{error}</p> : null;

  /* ------------------------------------- home ------------------------------------- */
  if (view.kind === "lead") return wrap(<LeadershipSim onBack={() => go({ kind: "home" })} />);

  if (view.kind === "home") {
    const byGroup = home ? [...home.groups.map((g) => ({ ...g, courses: home.courses.filter((c) => c.group === g.id) })), { id: "", label: "More courses", icon: "📚", courses: home.courses.filter((c) => !home.groups.some((g) => g.id === c.group)) }].filter((g) => g.courses.length > 0) : [];
    return wrap(
      <>
        <header className="screen-head">
          {onBack ? <button type="button" className="back" onClick={onBack} aria-label="Back">‹</button> : null}
          <h2>Meristem Academy</h2>
        </header>
        <div className="ac-hero">
          <p className="ac-kicker">LEARN. PRACTISE. GROW.</p>
          <h3>Courses for every colleague</h3>
          <p>Each lesson is a class, then your notes, then a quiz. Pass every lesson to unlock the next level: Easy, Medium, then Hard. Finish Hard for your certificate.</p>
          {home ? <span className="ac-pill">Classes today: {home.classesToday}/{home.classesPerDay}</span> : null}
        </div>
        {home?.attending ? (
          <div className="ac-class">🕘 In class: <b>{home.attending.lessonTitle}</b> · notes open in {mmss(home.attending.endsAt - now)}</div>
        ) : null}
        {err}
        {!home ? <p className="phone-note">Loading…</p> : null}
        <button type="button" className="ac-lead-card" onClick={() => go({ kind: "lead" })}>
          <span className="ac-icon" aria-hidden="true">🧭</span>
          <span><strong>Leadership simulator</strong><span className="muted small"> Make people-management decisions and see what they do to your team, delivery, clients and compliance</span></span>
        </button>
        {byGroup.map((g) => (
          <section key={g.id} className="ac-group">
            <h4><span aria-hidden="true">{g.icon}</span> {g.label}</h4>
            <div className="ac-grid">
              {g.courses.map((c) => (
                <button key={c.id} type="button" className="ac-card" onClick={() => open(c)}>
                  <span className="ac-top"><span className="ac-icon" aria-hidden="true">{c.icon}</span><Ring done={c.certified ? c.lessons : c.passed} total={c.lessons} /></span>
                  <span className="ac-kick">{c.kicker}</span>
                  <strong>{c.title}</strong>
                  <span className="ac-meta">{c.lessons} lessons{c.recommended && c.audience !== "For everyone" ? " · for your role" : ""}</span>
                  <span className={`ac-level ${levelTone(c.level)}`}>{c.certified ? "Certified ✓" : `${LEVEL_NAME[c.level ?? 3]}${c.next ? ` · next: lesson ${c.next}` : ""}`}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {home ? <p className="phone-note">Up to {home.classesPerDay} new classes a day. Come back tomorrow for more.</p> : null}
      </>,
    );
  }

  /* ------------------------------------- course ------------------------------------- */
  if (view.kind === "course") {
    const c = course;
    return wrap(
      <>
        {back({ kind: "home" }, "Academy")}
        {!c ? <p className="phone-note">Loading…</p> : (
          <>
            <header className="ac-title">
              <span className="ac-icon big" aria-hidden="true">{c.card.icon}</span>
              <div><h2>{c.card.title}</h2><p className="muted">{c.card.kicker} · {c.card.audience}</p></div>
            </header>
            <p className="muted" style={{ margin: 0 }}>{c.card.intro}</p>
            <div className={`ac-banner ${levelTone(c.card.level)}`}>
              {c.card.level === null ? (
                <>🎓 You finished every lesson at every level. Certificate: <b>{c.card.certificate}</b>.</>
              ) : (
                <>Working on <b>{LEVEL_NAME[c.card.level]}</b> questions. Pass all {c.card.lessons} lessons to {c.card.level < 3 ? `unlock ${LEVEL_NAME[(c.card.level + 1) as Level]}` : `earn the “${c.card.certificate}” certificate and ${c.card.rewardPoints} Merit points`}.</>
              )}
            </div>
            {err}
            <p className="me-label">LESSONS</p>
            <div className="stack" style={{ gap: 8 }}>
              {c.lessons.map((l) => (
                <div key={l.id} className={`ac-lesson ${l.status}`}>
                  <span className="num">{l.status === "passed" ? "✓" : l.number}</span>
                  <span className="main">
                    <strong>{l.title}</strong>
                    <span className="muted small">
                      {l.status === "passed" ? `Passed${l.best ? ` · best ${LEVEL_NAME[Math.min(3, l.best) as Level]}` : ""} · tap to read again` : l.status === "attending" ? "In class now…" : l.status === "notes" ? "Notes ready · quiz due" : l.status === "next" ? "Next: attend the class" : "🔒 After the lesson before"}
                    </span>
                  </span>
                  {l.status === "passed" || l.status === "notes" ? <button type="button" className="mini" onClick={() => readNotes(c.card.id, l.id)}>Notes</button> : null}
                  {l.status === "notes" ? <button type="button" className="mini go" disabled={busy} onClick={() => startQuiz(c.card.id, l.id)}>Quiz</button> : null}
                </div>
              ))}
            </div>
            {c.retryAt && c.retryAt > now ? <p className="muted small">You can retry the quiz in {mmss(c.retryAt - now)}. Read the notes again meanwhile.</p> : null}
            {c.card.level !== null ? (
              c.canAttend ? (
                <button type="button" className="primary-wide" disabled={busy} onClick={() => void run(() => attendAction(c.card.id), (v) => { setCourse(v); loadHome(); })}>
                  Attend lesson {c.card.next} · {c.classMinutes} min
                </button>
              ) : c.blocked ? <p className="muted small">{c.blocked}</p> : null
            ) : null}
            {c.scenarios.length > 0 ? (
              <>
                <p className="me-label">SCENARIOS</p>
                {c.scenarios.map((s) => (
                  <button key={s.id} type="button" className="ac-row" onClick={() => void run(() => scenarioAction(c.card.id, s.id), (v) => { setScenario(v); setOutcome(null); setView({ kind: "scenario", course: c.card.id, id: s.id }); })}>
                    <span><strong>{s.title}</strong><span className="muted small">{LEVEL_NAME[s.level]}</span></span>
                    <span className="soon-chip">{s.done === "best" ? "Best ✓" : s.done === "partly" ? "Partly" : s.done === "wrong" ? "Try again" : "New"}</span>
                  </button>
                ))}
              </>
            ) : null}
            {c.cases.length > 0 ? (
              <>
                <p className="me-label">CASE STUDIES</p>
                {c.cases.map((k) => (
                  <button key={k.id} type="button" className="ac-row" onClick={() => void run(() => caseAction(c.card.id, k.id), (v) => { setKase(v); setReveal(false); setView({ kind: "case", course: c.card.id, id: k.id }); })}>
                    <span><strong>{k.title}</strong><span className="muted small">Read, think, then compare</span></span>
                    <span className="soon-chip">Read</span>
                  </button>
                ))}
              </>
            ) : null}
          </>
        )}
      </>,
    );
  }

  /* ------------------------------------- notes ------------------------------------- */
  if (view.kind === "notes") {
    return wrap(
      <>
        {back({ kind: "course", id: view.course }, notes?.courseTitle ?? "Course")}
        {err}
        {!notes ? <p className="phone-note">Loading…</p> : (
          <>
            <p className="ac-kicker">LESSON {notes.number} OF {notes.total}</p>
            <h2 style={{ margin: 0 }}>{notes.title}</h2>
            {notes.video ? (
              <div className="ac-video">
                {notes.video.kind === "frame" ? (
                  <iframe src={notes.video.src} title={`Video: ${notes.title}`} allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                ) : (
                  <video src={notes.video.src} controls preload="metadata" />
                )}
              </div>
            ) : null}
            {notes.paragraphs.map((p, i) => <p key={i} className="ac-notes">{p}</p>)}
            {notes.quizDue ? (
              notes.retryAt && notes.retryAt > now ? (
                <p className="muted small">You can retry the quiz in {mmss(notes.retryAt - now)}.</p>
              ) : (
                <>
                  <button type="button" className="primary-wide" disabled={busy} onClick={() => startQuiz(view.course, view.lesson)}>Take the {LEVEL_NAME[notes.level]} quiz ›</button>
                  <p className="muted small" style={{ textAlign: "center" }}>{notes.passCorrect} of {notes.quizCount} right passes the lesson. If you miss, read again and retry in {notes.retryMinutes} minutes.</p>
                </>
              )
            ) : null}
          </>
        )}
      </>,
    );
  }

  /* ------------------------------------- quiz ------------------------------------- */
  if (view.kind === "quiz") {
    if (result) {
      return wrap(
        <>
          <div className={`ac-result ${result.passed ? "pass" : "fail"}`}>
            <p className="ac-kicker">{LEVEL_NAME[result.level].toUpperCase()} QUIZ</p>
            <h2>{result.passed ? "You passed!" : "Not this time"}</h2>
            <p>{result.correct} of {result.total} right. {result.passed ? `${result.need} were needed.` : `You needed ${result.need}. Read the notes again and retry${result.retryAt ? ` in ${mmss(result.retryAt - now)}` : ""}.`}</p>
            {result.points > 0 ? <p><b>+{result.points} Merit points</b></p> : null}
            {result.unlocked ? <p>🔓 <b>{LEVEL_NAME[result.unlocked]}</b> questions unlocked for this course.</p> : null}
            {result.finished ? <p>🎓 Course complete! Certificate “{result.finished.certificate}” and {result.finished.points} Merit points.</p> : null}
          </div>
          <button type="button" className="primary-wide" onClick={() => { setResult(null); go({ kind: "course", id: view.course }); }}>Back to the course</button>
        </>,
      );
    }
    if (!quiz) return wrap(<p className="phone-note">Loading…</p>);
    const q = quiz.questions[step];
    const last = step === quiz.questions.length - 1;
    return wrap(
      <>
        <button type="button" className="ac-back" onClick={() => go({ kind: "course", id: view.course })}>‹ Leave the quiz</button>
        <div className="ac-steps" aria-label={`Question ${step + 1} of ${quiz.questions.length}`}>
          {quiz.questions.map((_, i) => <span key={i} className={i < step ? "done" : i === step ? "now" : ""} />)}
        </div>
        <p className="ac-kicker">{LEVEL_NAME[quiz.level].toUpperCase()} · QUESTION {step + 1} OF {quiz.questions.length}</p>
        <h3 className="ac-q">{q.question}</h3>
        <div className="stack" style={{ gap: 8 }} role="radiogroup" aria-label={q.question}>
          {q.options.map((o, i) => (
            <button key={i} type="button" role="radio" aria-checked={answers[step] === i} className={`ac-opt${answers[step] === i ? " on" : ""}`} onClick={() => setAnswers((a) => a.map((v, k) => (k === step ? i : v)))}>{o}</button>
          ))}
        </div>
        {err}
        <div className="ed-actions" style={{ gridTemplateColumns: "1fr 2fr" }}>
          <button type="button" className="me-wide" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          {last ? (
            <button type="button" className="primary-wide" disabled={busy || answers.some((a) => a < 0)} onClick={() => submit(view.course, view.lesson)}>{busy ? "Marking…" : "Finish the quiz"}</button>
          ) : (
            <button type="button" className="primary-wide" disabled={answers[step] < 0} onClick={() => setStep(step + 1)}>Next</button>
          )}
        </div>
      </>,
    );
  }

  /* ------------------------------------- scenario ------------------------------------- */
  if (view.kind === "scenario") {
    if (!scenario) return wrap(<p className="phone-note">Loading…</p>);
    return wrap(
      <>
        {back({ kind: "course", id: view.course }, "Course")}
        <p className="ac-kicker">SCENARIO · {LEVEL_NAME[scenario.level].toUpperCase()}</p>
        <h2 style={{ margin: 0 }}>{scenario.title}</h2>
        <p className="ac-notes">{scenario.story}</p>
        {err}
        {!outcome ? (
          <div className="stack" style={{ gap: 8 }}>
            <p className="me-label">WHAT DO YOU DO?</p>
            {scenario.choices.map((c, i) => (
              <button key={i} type="button" className="ac-opt" disabled={busy} onClick={() => void run(() => scenarioAnswerAction(view.course, view.id, i), setOutcome)}>{c}</button>
            ))}
          </div>
        ) : (
          <div className={`ac-result ${outcome.verdict === "best" ? "pass" : outcome.verdict === "partly" ? "part" : "fail"}`}>
            <h3>{outcome.verdict === "best" ? "Best choice" : outcome.verdict === "partly" ? "Partly right" : "Not the best choice"}</h3>
            <p>{outcome.feedback}</p>
            {outcome.verdict !== "best" ? <p><b>The best choice:</b> {outcome.best}</p> : null}
            {outcome.points > 0 ? <p><b>+{outcome.points} Merit points</b></p> : null}
            <button type="button" className="me-wide" onClick={() => go({ kind: "course", id: view.course })}>Back to the course</button>
          </div>
        )}
      </>,
    );
  }

  /* ------------------------------------- case ------------------------------------- */
  if (!kase) return wrap(<p className="phone-note">Loading…</p>);
  return wrap(
    <>
      {back({ kind: "course", id: view.course }, "Course")}
      <p className="ac-kicker">CASE STUDY</p>
      <h2 style={{ margin: 0 }}>{kase.title}</h2>
      <p className="ac-notes">{kase.story}</p>
      <p className="muted small">Think about what you would do and why. Then compare with the key points.</p>
      {!reveal ? (
        <button type="button" className="primary-wide" onClick={() => setReveal(true)}>Show the key points</button>
      ) : (
        <div className="ac-result part">
          <h3>Key points</h3>
          {kase.keyPoints.length === 0 ? <p>No model answer has been added yet.</p> : null}
          <ul style={{ margin: 0, paddingLeft: 18 }}>{kase.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
        </div>
      )}
    </>,
  );
}
