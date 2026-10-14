"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { reportMessageAction, sendMessageAction } from "@/app/actions/chat";
import { getMine } from "@/lib/client/api";
import type { ChatResult, ConversationRow, MessageView } from "@/lib/server/chat/service";

type Thread = Extract<ChatResult<{ title: string; icon: string; messages: MessageView[]; canPost: boolean }>, { ok: true }>;
type Found = { staffId: string; name: string; title: string; conv: string };

const clock = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * Chats and groups on the Work Phone. Groups are for everyone or a unit; chats are direct messages. Messages are
 * checked by the server before they are sent, and anything that upsets you can be reported with the flag button.
 */
export function ChatApp({ kind, initialConv = null }: { kind: "direct" | "group"; initialConv?: string | null }) {
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [conv, setConv] = useState<string | null>(initialConv);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);

  const reload = useCallback(() => {
    getMine<ConversationRow[]>("chat", "?list=1").then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(reload, [reload]);

  useEffect(() => {
    if (kind !== "direct" || q.trim().length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      getMine<Found[]>("chat", `?q=${encodeURIComponent(q.trim())}`).then((r) => live && setFound(Array.isArray(r) ? r : [])).catch(() => undefined);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, kind]);

  if (conv) return <ThreadView conv={conv} onBack={() => { setConv(null); reload(); }} />;

  const list = (rows ?? []).filter((r) => r.kind === kind);
  return (
    <div className="chat-list">
      {kind === "direct" ? (
        <>
          <label className="sr-only" htmlFor="chat-find">Find a colleague</label>
          <input id="chat-find" className="chat-find" placeholder="Find a colleague to message" value={q} maxLength={40} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setFound([]); }} />
          {q.trim().length >= 2 ? found.map((f) => (
            <button key={f.staffId} type="button" className="chat-row" onClick={() => setConv(f.conv)}>
              <span className="chat-ico" aria-hidden="true">🙂</span>
              <span><strong>{f.name}</strong><small>{f.title}</small></span>
            </button>
          )) : null}
          {q.trim().length >= 2 && found.length === 0 ? <p className="phone-note">No one found.</p> : null}
        </>
      ) : null}
      {rows === null ? <p className="phone-note">Loading…</p> : null}
      {rows && list.length === 0 && q.trim().length < 2 ? <p className="phone-note">{kind === "direct" ? "No chats yet. Find a colleague above to start one." : "There are no groups for you yet."}</p> : null}
      {list.map((r) => (
        <button key={r.id} type="button" className="chat-row" onClick={() => setConv(r.id)}>
          <span className="chat-ico" aria-hidden="true">{r.icon}</span>
          <span className="chat-main"><strong>{r.title}</strong><small>{r.last ? `${r.last.mine ? "You: " : ""}${r.last.text}` : "No messages yet"}</small></span>
          {r.last ? <span className="chat-time">{clock(r.last.at)}</span> : null}
        </button>
      ))}
    </div>
  );
}

function ThreadView({ conv, onBack }: { conv: string; onBack: () => void }) {
  const [t, setT] = useState<Thread | null>(null);
  const [denied, setDenied] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [reporting, setReporting] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    getMine<ChatResult<{ title: string; icon: string; messages: MessageView[]; canPost: boolean }>>("chat", `?conv=${encodeURIComponent(conv)}`)
      .then((r) => (r.ok ? setT(r) : setDenied(true)))
      .catch(() => undefined);
  }, [conv]);

  // Look for new messages every few seconds while the conversation is open
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, 4000);
    return () => clearInterval(id);
  }, [load]);

  const count = t?.messages.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const send = () => {
    const body = text.trim();
    if (!body || busy) return;
    start(async () => {
      const r = await sendMessageAction(conv, body);
      if (r.ok) {
        setText("");
        setNote(null);
        load();
      } else setNote(r.error);
    });
  };

  const report = (id: string, reason: string) => {
    start(async () => {
      const r = await reportMessageAction(conv, id, reason);
      setReporting(null);
      setNote(r.ok ? "Thank you. The admin team will look at it." : r.error);
      if (r.ok) load();
    });
  };

  if (denied) return <div className="chat-thread"><button type="button" className="back" onClick={onBack}>‹ Back</button><p className="phone-note">That conversation is not available.</p></div>;

  return (
    <div className="chat-thread">
      <div className="chat-head">
        <button type="button" className="back" onClick={onBack} aria-label="Back">‹</button>
        <strong>{t ? `${t.icon} ${t.title}` : "Loading…"}</strong>
      </div>
      <div className="chat-msgs" role="log" aria-live="polite">
        {t?.messages.length === 0 ? <p className="phone-note">No messages yet. Say hello.</p> : null}
        {t?.messages.map((m) => (
          <div key={m.id} className={`chat-msg${m.mine ? " mine" : ""}`}>
            {!m.mine ? <small className="chat-who">{m.name}</small> : null}
            <span className="chat-bubble">{m.text}</span>
            <small className="chat-at">{clock(m.at)}</small>
            {!m.mine ? (
              reporting === m.id ? (
                <span className="chat-report">
                  {["Rude or unkind", "Bullying or harassment", "Not appropriate for work", "Other"].map((r) => <button key={r} type="button" onClick={() => report(m.id, r)} disabled={busy}>{r}</button>)}
                  <button type="button" onClick={() => setReporting(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="chat-flag" onClick={() => setReporting(m.id)} aria-label="Report this message" title="Report this message">⚑</button>
              )
            ) : null}
          </div>
        ))}
        <div ref={end} />
      </div>
      {note ? <p className="chat-note" role="status">{note}</p> : null}
      {t && !t.canPost ? <p className="chat-note">You cannot send messages right now.</p> : (
        <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="sr-only" htmlFor="chat-text">Message</label>
          <input id="chat-text" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Write a message" autoComplete="off" />
          <button type="submit" disabled={busy || text.trim().length === 0} aria-label="Send">➤</button>
        </form>
      )}
    </div>
  );
}
