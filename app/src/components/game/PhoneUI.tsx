"use client";

import { ChatApp } from "./ChatApp";
import { DirectoryApp, KudosApp, RoleApp } from "./PeopleApps";
import { MarketApp, PortfolioApp } from "./MarketApps";
import { ClientsApp } from "./ClientsApp";
import { ComplianceApp } from "./ComplianceApp";
import { ReportsApp } from "./ReportsApp";
import { useEffect, useState } from "react";
import { markNoticesReadAction, messagesAction } from "@/app/actions/notices";
import type { Announcement, Notice } from "@/lib/server/notices/service";
import type { PhoneApp } from "./GameShell";

type View = "home" | "messages" | "updates" | "directory" | "kudos" | "my-role" | "market" | "portfolio" | "clients" | "compliance" | "reports";

const TONES = ["#e07a2f", "#2f6fe0", "#8a5cd6", "#e0488a", "#1fa89a", "#d4a62a", "#2d5d41", "#17b2a6", "#c8503c", "#5b6b61"];

function ago(ms: number, now: number): string {
  const m = Math.floor((now - ms) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * The Work Phone, laid out like the reference game's phone: a frame with a lock-screen header, a banner for the
 * latest announcement, a grid of coloured app icons, and screens that open inside the phone (Messages with a
 * bell for Updates, Courses). Apps that are not built yet say "soon".
 */
export function PhoneUI({ startView = null, apps, clock, timezone, unread, onUnread, onClose, onGoals, onSettings }: { startView?: View | null; apps: PhoneApp[]; clock: string; timezone: string; unread: number; onUnread: (n: number) => void; onClose: () => void; onGoals: () => void; onSettings: () => void }) {
  const [view, setView] = useState<View>(startView ?? "home");
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<"chats" | "groups">("chats");
  const [startConv, setStartConv] = useState<string | null>(null);
  const [kudosTo, setKudosTo] = useState<{ staffId: string; name: string } | null>(null);

  // The banner and the Messages screen need the announcements; load them when the phone opens
  useEffect(() => {
    let alive = true;
    void messagesAction()
      .then((r) => {
        if (!alive) return;
        setNotices(r.notices);
        setAnnouncements(r.announcements);
        setNow(Date.now());
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const date = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date(now));
  const hhmm = clock.replace(/^[A-Za-z]+\s*/, "");
  const latest = announcements[0];

  const openUpdates = () => {
    setView("updates");
    setNow(Date.now());
  };
  const done = () => {
    void markNoticesReadAction().then(() => {
      setNotices((n) => (n ? n.map((x) => ({ ...x, read: true })) : n));
      onUnread(0);
    });
    setView("messages");
  };

  const open = (a: PhoneApp) => {
    if (a.soon) return;
    if (a.id === "messages") setView("messages");
    else if (a.id === "directory" || a.id === "kudos" || a.id === "my-role" || a.id === "market" || a.id === "portfolio" || a.id === "clients" || a.id === "compliance" || a.id === "reports") {
      setKudosTo(null);
      setView(a.id);
    } else if (a.id === "todays-plan") onGoals();
    else if (a.id === "settings") onSettings();
  };

  return (
    <div className="phone-wrap" role="dialog" aria-label="Work Phone" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button type="button" className="phone-close" onClick={onClose}>✕ Close</button>
      <div className="phone2">
        <div className="notch" aria-hidden="true" />
        <div className="phone-status"><span>{hhmm}</span><span aria-hidden="true">●●● 4G ▮</span></div>

        {view === "home" ? (
          <div className="phone-home">
            <p className="lock-time">{hhmm}</p>
            <p className="lock-date">{date} · Lagos</p>
            {latest ? (
              <button type="button" className="banner" onClick={() => setView("messages")}>
                <span aria-hidden="true">📣</span>
                <span><strong>{latest.title}</strong><em>{latest.text}</em></span>
                <span className="go">Read</span>
              </button>
            ) : null}
            <div className="icon-grid">
              {apps.filter((a) => a.enabled).map((a, i) => (
                <button key={a.id} type="button" className={`icon-app${a.soon ? " is-soon" : ""}`} onClick={() => open(a)} aria-label={a.soon ? `${a.label} (coming soon)` : a.label}>
                  <span className="tile" style={{ background: `linear-gradient(145deg, ${TONES[i % TONES.length]}, ${TONES[(i + 3) % TONES.length]})` }} aria-hidden="true">{a.icon}</span>
                  {a.id === "messages" && unread > 0 ? <span className="badge-dot">{unread > 9 ? "9+" : unread}</span> : null}
                  <span className="tile-label">{a.label}</span>
                  {a.soon ? <span className="tile-soon">soon</span> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {view === "messages" ? (
          <div className="screen">
            <header className="screen-head">
              <button type="button" className="back" onClick={() => { setStartConv(null); setView("home"); }} aria-label="Back">‹</button>
              <h2>Messages</h2>
              <button type="button" className="bell" onClick={openUpdates} aria-label={`Updates${unread ? `, ${unread} unread` : ""}`}>
                🔔{unread > 0 ? <span className="badge-dot">{unread > 9 ? "9+" : unread}</span> : null}
              </button>
            </header>
            <div className="seg" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "chats"} className={tab === "chats" ? "on" : ""} onClick={() => setTab("chats")}>Chats</button>
              <button type="button" role="tab" aria-selected={tab === "groups"} className={tab === "groups" ? "on" : ""} onClick={() => setTab("groups")}>Groups</button>
            </div>
            {announcements.map((a, i) => (
              <div key={a.id} className={`announce${i === 0 ? " pinned" : ""}`}>
                <span aria-hidden="true">📣</span>
                <span><strong>{a.title}</strong><em>{a.text}</em><small>Meristem team · {ago(a.at, now)}</small></span>
              </div>
            ))}
            {announcements.length === 0 ? <p className="phone-note">No announcements right now.</p> : null}
            <ChatApp key={`${tab}-${startConv ?? ""}`} kind={tab === "chats" ? "direct" : "group"} initialConv={startConv} />
          </div>
        ) : null}

        {view === "directory" || view === "kudos" || view === "my-role" || view === "market" || view === "portfolio" || view === "clients" || view === "compliance" || view === "reports" ? (
          <div className="screen">
            <header className="screen-head">
              <button type="button" className="back" onClick={() => setView("home")} aria-label="Back">‹</button>
              <h2>{view === "directory" ? "Directory" : view === "kudos" ? "Kudos" : view === "market" ? "Market" : view === "portfolio" ? "My Portfolio" : view === "clients" ? "Clients" : view === "compliance" ? "Compliance Desk" : view === "reports" ? "Reports" : "My Role"}</h2>
              <span />
            </header>
            {view === "directory" ? (
              <DirectoryApp
                onMessage={(conv) => {
                  setTab("chats");
                  setStartConv(conv);
                  setView("messages");
                }}
                onKudos={(staffId, name) => {
                  setKudosTo({ staffId, name });
                  setView("kudos");
                }}
              />
            ) : null}
            {view === "kudos" ? <KudosApp key={kudosTo?.staffId ?? "none"} to={kudosTo} /> : null}
            {view === "my-role" ? <RoleApp /> : null}
            {view === "market" ? <MarketApp /> : null}
            {view === "portfolio" ? <PortfolioApp /> : null}
            {view === "clients" ? <ClientsApp /> : null}
            {view === "compliance" ? <ComplianceApp /> : null}
            {view === "reports" ? <ReportsApp /> : null}
          </div>
        ) : null}

        {view === "updates" ? (
          <div className="screen">
            <header className="screen-head">
              <button type="button" className="back" onClick={() => setView("messages")} aria-label="Back">‹</button>
              <h2>Updates</h2>
              <button type="button" className="done" onClick={done}>Done</button>
            </header>
            {notices === null ? <p className="phone-note">Loading…</p> : null}
            {notices?.length === 0 ? <p className="phone-note">Nothing yet. Updates about your classes, missions and reports appear here.</p> : null}
            {notices?.map((n) => (
              <div key={n.id} className={`notice ${n.tone}`}>
                <span className="n-icon" aria-hidden="true">{n.icon}</span>
                <span className="n-main"><span>{n.text}</span><small>{ago(n.at, now)}</small></span>
                {!n.read ? <span className="dot" aria-label="Unread" /> : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="home-bar" aria-hidden="true" />
      </div>
    </div>
  );
}
