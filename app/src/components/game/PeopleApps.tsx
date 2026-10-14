"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { giveKudosAction } from "@/app/actions/people";
import { getMine } from "@/lib/client/api";
import type { DirectoryRow, KudosView, RoleView } from "@/lib/server/people/service";

const ago = (ms: number) => {
  const m = Math.floor((Date.now() - ms) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ago` : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Directory: find a colleague, then message them or send them kudos. */
export function DirectoryApp({ onMessage, onKudos }: { onMessage: (conv: string) => void; onKudos: (staffId: string, name: string) => void }) {
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("");
  const [data, setData] = useState<{ people: DirectoryRow[]; units: string[]; more: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      const qs = `?kind=directory&q=${encodeURIComponent(q.trim())}&unit=${encodeURIComponent(unit)}`;
      getMine<{ people: DirectoryRow[]; units: string[]; more: boolean }>("people", qs).then((r) => live && setData(r)).catch(() => live && setData({ people: [], units: [], more: false }));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, unit]);

  return (
    <div className="people">
      <label className="sr-only" htmlFor="dir-q">Find a colleague</label>
      <input id="dir-q" className="chat-find" placeholder="Search by name or job title" value={q} maxLength={40} onChange={(e) => setQ(e.target.value)} />
      <label className="sr-only" htmlFor="dir-unit">Unit</label>
      <select id="dir-unit" className="people-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
        <option value="">All units</option>
        {(data?.units ?? []).map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      {data === null ? <p className="phone-note">Loading…</p> : null}
      {data && data.people.length === 0 ? <p className="phone-note">No one found.</p> : null}
      {data?.people.map((p) => (
        <div key={p.staffId} className="people-row">
          <span className="chat-ico" aria-hidden="true">🙂</span>
          <span className="chat-main"><strong>{p.name}</strong><small>{p.title} · {p.unit}</small></span>
          <span className="people-actions">
            <button type="button" onClick={() => onMessage(p.conv)} aria-label={`Message ${p.name}`}>💬</button>
            <button type="button" onClick={() => onKudos(p.staffId, p.name)} aria-label={`Send kudos to ${p.name}`}>🌟</button>
          </span>
        </div>
      ))}
      {data?.more ? <p className="phone-note">Showing the first 40. Search to narrow it down.</p> : null}
    </div>
  );
}

/** Kudos: thank a colleague, and see the kudos you have received. */
export function KudosApp({ to }: { to: { staffId: string; name: string } | null }) {
  const [view, setView] = useState<KudosView | null>(null);
  const [who, setWho] = useState(to?.staffId ?? "");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<DirectoryRow[]>([]);
  const [name, setName] = useState(to?.name ?? "");
  const [busy, start] = useTransition();

  const load = useCallback(() => {
    getMine<KudosView>("people", "?kind=kudos").then(setView).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (who || q.trim().length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      getMine<{ people: DirectoryRow[] }>("people", `?kind=directory&q=${encodeURIComponent(q.trim())}`).then((r) => live && setFound(r.people.slice(0, 5))).catch(() => undefined);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, who]);

  const send = () => {
    if (!who || !value || busy) return;
    start(async () => {
      const r = await giveKudosAction(who, value, note);
      if (r.ok) {
        setMsg({ ok: true, text: r.message });
        setWho("");
        setName("");
        setValue("");
        setNote("");
        setQ("");
        setFound([]);
        load();
      } else setMsg({ ok: false, text: r.error });
    });
  };

  return (
    <div className="people kudos">
      <p className="phone-note">Thank a colleague. You keep all your Merit points{view && view.receiverPoints > 0 ? `; the game gives them ${view.receiverPoints}` : ""}. {view ? `You can give ${view.leftToday} more today.` : ""}</p>
      {who ? (
        <p className="kudos-to">To <strong>{name || who}</strong> <button type="button" className="linklike" onClick={() => { setWho(""); setName(""); }}>change</button></p>
      ) : (
        <>
          <label className="sr-only" htmlFor="kudos-q">Find a colleague</label>
          <input id="kudos-q" className="chat-find" placeholder="Find a colleague to thank" value={q} maxLength={40} onChange={(e) => setQ(e.target.value)} />
          {found.map((f) => (
            <button key={f.staffId} type="button" className="chat-row" onClick={() => { setWho(f.staffId); setName(f.name); }}>
              <span className="chat-ico" aria-hidden="true">🙂</span>
              <span><strong>{f.name}</strong><small>{f.title}</small></span>
            </button>
          ))}
        </>
      )}
      <div className="kudos-values" role="radiogroup" aria-label="Kind of kudos">
        {view?.values.map((v) => (
          <button key={v.id} type="button" role="radio" aria-checked={value === v.id} className={`kudos-chip${value === v.id ? " on" : ""}`} onClick={() => setValue(v.id)}>{v.icon} {v.label}</button>
        ))}
      </div>
      {view && view.maxNote > 0 ? (
        <>
          <label className="sr-only" htmlFor="kudos-note">Add a short note (optional)</label>
          <input id="kudos-note" className="chat-find" placeholder="Add a short note (optional)" value={note} maxLength={view.maxNote} onChange={(e) => setNote(e.target.value)} />
        </>
      ) : null}
      {msg ? <p role="status" className={msg.ok ? "chat-note ok" : "chat-note"}>{msg.text}</p> : null}
      <button type="button" className="kudos-send" disabled={!who || !value || busy || (view?.leftToday ?? 0) === 0} onClick={send}>🌟 Send kudos</button>

      <h3 className="people-h">Kudos you received{view ? ` (${view.total})` : ""}</h3>
      {view && view.received.length === 0 ? <p className="phone-note">None yet. Kind work gets noticed.</p> : null}
      {view?.received.map((k, i) => (
        <div key={`${k.at}-${i}`} className="kudos-card">
          <span aria-hidden="true">{k.icon}</span>
          <span><strong>{k.label}</strong> from {k.from}{k.note ? <em>“{k.note}”</em> : null}<small>{ago(k.at)}</small></span>
        </div>
      ))}
    </div>
  );
}

/** My Role: who you are in the firm, your skills, and the courses to work on next. */
export function RoleApp() {
  const [r, setR] = useState<RoleView | null>(null);
  useEffect(() => {
    getMine<RoleView>("people", "?kind=role").then(setR).catch(() => undefined);
  }, []);
  if (!r) return <p className="phone-note">Loading…</p>;
  return (
    <div className="people role">
      <div className="role-card">
        <strong>{r.name}</strong>
        <span>{r.title}</span>
        <small>{r.unit} · {r.tenureYears} {r.tenureYears === 1 ? "year" : "years"} at Meristem{r.isLineManager ? " · Line manager" : ""}</small>
      </div>
      <h3 className="people-h">Your skills</h3>
      <div className="role-skills">
        {r.skills.map((s) => <span key={s.id} className="kudos-chip">{s.icon} {s.label} · level {s.level}</span>)}
      </div>
      <h3 className="people-h">Next for your role</h3>
      {r.courses.length === 0 ? <p className="phone-note">You are up to date with the courses for your unit.</p> : null}
      {r.courses.map((c) => (
        <a key={c.id} href="/academy" className="chat-row">
          <span className="chat-ico" aria-hidden="true">{c.icon}</span>
          <span className="chat-main"><strong>{c.title}</strong><small>{c.passed} of {c.lessons} lessons passed</small></span>
        </a>
      ))}
      <p className="phone-note">🌟 {r.kudosReceived} kudos received</p>
    </div>
  );
}
