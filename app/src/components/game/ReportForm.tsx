"use client";

import { useEffect, useState } from "react";
import { myConcernsAction, submitConcernAction } from "@/app/actions/concerns";
import { STATUS_LABEL, type ConcernStatus } from "@/lib/concerns";

export interface ConcernRules {
  categories: { id: string; label: string }[];
  maxFiles: number;
  maxFileMb: number;
}

/** "2026-10-13T14:05" for a datetime-local box, in the person's own clock. */
function localInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Report a conduct concern to the admin team. The person says what happened and when, and can attach pictures
 * or a PDF as evidence. The server adds its own timestamps and records who sent it.
 */
export function ReportForm({ rules, about, onClose }: { rules: ConcernRules; about?: string; onClose: () => void }) {
  const [now] = useState(() => Date.now());
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [who, setWho] = useState(about ?? "");
  const [when, setWhen] = useState(() => localInput(now));
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [mine, setMine] = useState<{ number: string; category: string; submittedAt: number; status: ConcernStatus }[] | null>(null);

  useEffect(() => {
    let alive = true;
    void myConcernsAction().then((r) => alive && setMine(r)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [done]);

  const pick = (list: FileList | null) => {
    setError(null);
    const next = [...files, ...Array.from(list ?? [])];
    if (next.length > rules.maxFiles) return setError(`You can attach up to ${rules.maxFiles} files.`);
    if (next.some((f) => f.size > rules.maxFileMb * 1024 * 1024)) return setError(`Each file must be ${rules.maxFileMb} MB or smaller.`);
    setFiles(next);
  };

  const send = async () => {
    if (busy) return;
    if (!category) return setError("Please choose what kind of concern this is.");
    if (description.trim().length < 20) return setError("Please describe what happened in a few sentences.");
    const at = Date.parse(when);
    if (!Number.isFinite(at)) return setError("Please say when it happened.");
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("category", category);
      fd.set("description", description);
      fd.set("about", who);
      fd.set("occurredAt", String(at));
      for (const f of files) {
        fd.append("files", f);
        fd.append("fileModified", String(f.lastModified));
      }
      const r = await submitConcernAction(fd);
      if (r.ok) setDone(r.number);
      else setError(r.error);
    } catch {
      setError("Could not send just now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="me-panel" role="dialog" aria-label="Report a concern">
      <div className="grab" aria-hidden="true" />
      <header className="me-head">
        <span className="kbd-badge" aria-hidden="true">🛡️</span>
        <div className="me-id">
          <h2>Report a concern</h2>
          <p>Goes to the admin team to review</p>
        </div>
        <button type="button" className="round-btn sm" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="me-body">
        {done ? (
          <div className="stack">
            <div className="goal-path">
              <p className="eyebrow">RECEIVED</p>
              <h3>Reference {done}</h3>
              <p>The admin team has your report and will review it. You can follow its status below.</p>
            </div>
            <button type="button" className="me-wide" onClick={onClose}>Close</button>
          </div>
        ) : (
          <div className="stack">
            <p className="muted small">Your name is recorded with the report, and the time you send it. Only the admin team can read it. If someone is in danger, contact security or HR straight away.</p>
            <div className="ed-group">
              <label className="ed-label" htmlFor="rc-cat">What kind of concern is it?</label>
              <select id="rc-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Choose…</option>
                {rules.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="ed-group">
              <label className="ed-label" htmlFor="rc-who">Who is it about? (optional)</label>
              <input id="rc-who" className="field" value={who} maxLength={80} onChange={(e) => setWho(e.target.value)} placeholder="A name or description" />
            </div>
            <div className="ed-group">
              <label className="ed-label" htmlFor="rc-when">When did it happen?</label>
              <input id="rc-when" className="field" type="datetime-local" value={when} max={localInput(now + 60_000)} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div className="ed-group">
              <label className="ed-label" htmlFor="rc-what">What happened?</label>
              <textarea id="rc-what" className="field" rows={5} maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Say what you saw or experienced, where, and anyone else who was there." />
              <span className="muted small">{description.length} / 3000</span>
            </div>
            <div className="ed-group">
              <label className="ed-label" htmlFor="rc-files">Evidence (optional)</label>
              <input id="rc-files" className="field" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
              <span className="muted small">Up to {rules.maxFiles} files, {rules.maxFileMb} MB each. Pictures (PNG, JPEG, WebP) or PDF. The time each file was last changed is recorded too.</span>
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="me-row">
                  <span>{f.name}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFiles(files.filter((_, k) => k !== i))}>Remove</button>
                </div>
              ))}
            </div>
            {error ? <p className="error" role="alert">{error}</p> : null}
            <button type="button" className="primary-wide" onClick={() => void send()} disabled={busy}>{busy ? "Sending…" : "Send to the admin team"}</button>
          </div>
        )}
        {mine && mine.length > 0 ? (
          <div className="stack" style={{ marginTop: 18 }}>
            <p className="me-label">YOUR REPORTS</p>
            {mine.map((c) => (
              <div key={c.number} className="me-row">
                <span><strong>{c.number}</strong> <span className="muted">{c.category} · {new Date(c.submittedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></span>
                <span className="soon-chip">{STATUS_LABEL[c.status]}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
