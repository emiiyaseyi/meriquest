import "server-only";
import { randomBytes } from "node:crypto";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { assertArea } from "../auth/permissions";
import { rateLimit } from "../auth/ratelimit";
import { getUser } from "../auth/users";
import { notify } from "../notices/service";
import { recordEvent } from "../game/missions";
import type { UserDTO, UserRecord } from "../types";
import { CONV_RE, checkMessage, cleanMessage, dmId, groupId, isDm } from "@/lib/chat";

/**
 * Colleague chats: groups for everyone or for a unit, and direct messages. Safety comes first: messages are cleaned and
 * checked against a word list before they are sent, people are rate limited, anyone can report a message, enough reports
 * hide it until an admin looks, and admins can remove messages and mute people. Direct messages are private: only the two
 * people see them, and an admin only ever sees a message that someone has reported, with a few messages around it.
 */
export interface ChatMessage {
  id: string;
  staffId: string;
  name: string;
  text: string;
  at: number;
  /** Hidden after enough reports, or removed by an admin. Neither is shown to anyone but an admin. */
  hidden: boolean;
  removed: boolean;
  reports: string[];
}

interface Thread {
  id: string; // the conversation id
  messages: ChatMessage[];
}

export interface ChatReport {
  id: string;
  conv: string;
  messageId: string;
  reporter: string;
  reason: string;
  at: number;
  status: "open" | "removed" | "dismissed";
  reviewedBy?: string;
}

interface Mute {
  staffId: string;
  until: number;
  by: string;
  reason: string;
}

const MAX_KEPT = 200;
const REASON_MAX = 200;

export interface ConversationRow {
  id: string;
  title: string;
  icon: string;
  kind: "group" | "direct";
  last: { text: string; at: number; mine: boolean } | null;
}

export interface MessageView {
  id: string;
  name: string;
  text: string;
  at: number;
  mine: boolean;
}

export type ChatResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

async function threadOf(conv: string): Promise<Thread> {
  return (await getStore().get<Thread>("chat_threads", conv)) ?? { id: conv, messages: [] };
}

const visible = (m: ChatMessage) => !m.hidden && !m.removed;

/** May this person use this conversation? Returns its title, or null. */
async function access(user: Pick<UserDTO, "staffId" | "unit">, conv: unknown): Promise<{ title: string; icon: string; kind: "group" | "direct"; other?: UserRecord } | null> {
  if (typeof conv !== "string" || !CONV_RE.test(conv)) return null;
  const cfg = await getConfig("chat");
  if (!isDm(conv)) {
    const g = cfg.groups.find((x) => groupId(x.id) === conv);
    if (!g || !(g.units.includes("*") || g.units.includes(user.unit))) return null;
    return { title: g.label, icon: g.icon, kind: "group" };
  }
  if (!cfg.settings.directMessages) return null;
  const [, a, b] = conv.split(":");
  if (user.staffId !== a && user.staffId !== b) return null;
  const other = await getUser(user.staffId === a ? b : a);
  if (!other || other.status !== "active") return null;
  return { title: other.name, icon: "🙂", kind: "direct", other };
}

export async function listConversations(user: Pick<UserDTO, "staffId" | "unit">): Promise<ConversationRow[]> {
  const cfg = await getConfig("chat");
  const threads = await getStore().list<Thread>("chat_threads");
  const by = new Map(threads.map((t) => [t.id, t]));
  const last = (t: Thread | undefined): ConversationRow["last"] => {
    const m = t?.messages.filter(visible).at(-1);
    return m ? { text: m.text.slice(0, 80), at: m.at, mine: m.staffId === user.staffId } : null;
  };
  const groups: ConversationRow[] = cfg.groups
    .filter((g) => g.units.includes("*") || g.units.includes(user.unit))
    .map((g) => ({ id: groupId(g.id), title: g.label, icon: g.icon, kind: "group", last: last(by.get(groupId(g.id))) }));
  const directs: ConversationRow[] = [];
  if (cfg.settings.directMessages) {
    for (const t of threads) {
      if (!isDm(t.id) || !t.id.split(":").slice(1).includes(user.staffId)) continue;
      const row = await access(user, t.id);
      if (row) directs.push({ id: t.id, title: row.title, icon: row.icon, kind: "direct", last: last(t) });
    }
  }
  directs.sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0));
  return [...groups, ...directs];
}

export async function getThread(user: Pick<UserDTO, "staffId" | "unit">, conv: unknown): Promise<ChatResult<{ title: string; icon: string; messages: MessageView[]; canPost: boolean }>> {
  const a = await access(user, conv);
  if (!a) return { ok: false, error: "That conversation is not available." };
  const cfg = await getConfig("chat");
  const t = await threadOf(conv as string);
  const messages = t.messages.filter(visible).slice(-cfg.settings.historyLimit).map((m) => ({ id: m.id, name: m.name, text: m.text, at: m.at, mine: m.staffId === user.staffId }));
  const mute = await getStore().get<Mute>("chat_mutes", user.staffId);
  return { ok: true, title: a.title, icon: a.icon, messages, canPost: !(mute && mute.until > Date.now()) };
}

/** People to start a direct message with. */
export async function findPeople(user: Pick<UserDTO, "staffId">, q: unknown): Promise<{ staffId: string; name: string; title: string; conv: string }[]> {
  const cfg = await getConfig("chat");
  if (!cfg.settings.directMessages || typeof q !== "string") return [];
  const term = q.trim().toLowerCase().slice(0, 40);
  if (term.length < 2) return [];
  const users = await getStore().list<UserRecord>("users");
  return users
    .filter((u) => u.status === "active" && u.staffId !== user.staffId && (u.name.toLowerCase().includes(term) || u.title.toLowerCase().includes(term)))
    .slice(0, 8)
    .map((u) => ({ staffId: u.staffId, name: u.name, title: u.title, conv: dmId(user.staffId, u.staffId) }));
}

export async function postMessage(user: Pick<UserDTO, "staffId" | "name" | "unit">, conv: unknown, text: unknown, now: number = Date.now()): Promise<ChatResult> {
  const a = await access(user, conv);
  if (!a) return { ok: false, error: "That conversation is not available." };
  const cfg = await getConfig("chat");
  const mute = await getStore().get<Mute>("chat_mutes", user.staffId);
  if (mute && mute.until > now) return { ok: false, error: "You cannot send messages right now. Please speak to the admin team if you think this is a mistake." };
  const clean = cleanMessage(text, cfg.settings.maxLength);
  const verdict = checkMessage(clean, { blockedWords: cfg.blockedWords, blockLinks: cfg.settings.blockLinks });
  if (!verdict.ok) {
    if (clean.length > 0) await audit(user.staffId, "chat.blocked", conv as string, { reason: "filter" }, now);
    return { ok: false, error: verdict.reason };
  }
  const gate = await rateLimit(`chat:${user.staffId}`, cfg.settings.perMinute, 60_000, now);
  if (!gate.allowed) return { ok: false, error: "You are sending messages very fast. Please slow down a little." };
  const msg: ChatMessage = { id: `${String(now).padStart(15, "0")}-${randomBytes(3).toString("hex")}`, staffId: user.staffId, name: user.name, text: clean, at: now, hidden: false, removed: false, reports: [] };
  await getStore().update<Thread>("chat_threads", conv as string, (cur) => ({ id: conv as string, messages: [...(cur?.messages ?? []), msg].slice(-MAX_KEPT) }));
  if (a.kind === "direct" && a.other) await notify(a.other.staffId, { icon: "💬", text: `${user.name} sent you a message.`, tone: "info" }, now);
  await recordEvent(user.staffId, "chat", now);
  return { ok: true };
}

export async function reportMessage(user: Pick<UserDTO, "staffId" | "unit">, conv: unknown, messageId: unknown, reason: unknown, now: number = Date.now()): Promise<ChatResult> {
  const a = await access(user, conv);
  if (!a) return { ok: false, error: "That conversation is not available." };
  if (typeof messageId !== "string" || !/^\d{15}-[0-9a-f]{6}$/.test(messageId)) return { ok: false, error: "That message does not exist." };
  const cfg = await getConfig("chat");
  const gate = await rateLimit(`chatreport:${user.staffId}`, 20, 24 * 3_600_000, now);
  if (!gate.allowed) return { ok: false, error: "You have sent several reports today. The admin team will look at them." };
  const why = cleanMessage(reason, REASON_MAX) || "Reported";
  let refusal: string | null = null;
  let hidden = false;
  await getStore().update<Thread>("chat_threads", conv as string, (cur) => {
    const m = cur?.messages.find((x) => x.id === messageId);
    if (!cur || !m) {
      refusal = "That message does not exist.";
      return cur;
    }
    if (m.staffId === user.staffId) {
      refusal = "You cannot report your own message.";
      return cur;
    }
    if (m.reports.includes(user.staffId)) {
      refusal = "You have already reported that message.";
      return cur;
    }
    const reports = [...m.reports, user.staffId];
    hidden = reports.length >= cfg.settings.reportsToHide;
    return { ...cur, messages: cur.messages.map((x) => (x.id === messageId ? { ...x, reports, hidden: x.hidden || hidden } : x)) };
  });
  if (refusal) return { ok: false, error: refusal };
  const id = `r_${randomBytes(6).toString("hex")}`;
  await getStore().put<ChatReport>("chat_reports", id, { id, conv: conv as string, messageId, reporter: user.staffId, reason: why, at: now, status: "open" });
  await audit(user.staffId, "chat.reported", conv as string, { messageId, hidden }, now);
  return { ok: true };
}

/* ------------------------------ review by the admin team ------------------------------ */

export interface ReportView {
  id: string;
  conv: string;
  title: string;
  at: number;
  reporter: string;
  reason: string;
  status: ChatReport["status"];
  message: { id: string; staffId: string; name: string; text: string; at: number; hidden: boolean; removed: boolean } | null;
  context: { name: string; text: string; at: number; flagged: boolean }[];
  muted: boolean;
}

export async function listReports(actor: Pick<UserDTO, "role">, now: number = Date.now()): Promise<ReportView[]> {
  assertArea(actor, "concerns");
  const [reports, mutes, cfg] = await Promise.all([getStore().list<ChatReport>("chat_reports"), getStore().list<Mute>("chat_mutes"), getConfig("chat")]);
  const out: ReportView[] = [];
  for (const r of reports.sort((a, b) => b.at - a.at).slice(0, 100)) {
    const t = await threadOf(r.conv);
    const i = t.messages.findIndex((m) => m.id === r.messageId);
    const m = i >= 0 ? t.messages[i] : null;
    out.push({
      id: r.id,
      conv: r.conv,
      title: isDm(r.conv) ? "Direct message" : (cfg.groups.find((g) => groupId(g.id) === r.conv)?.label ?? r.conv),
      at: r.at,
      reporter: r.reporter,
      reason: r.reason,
      status: r.status,
      message: m ? { id: m.id, staffId: m.staffId, name: m.name, text: m.text, at: m.at, hidden: m.hidden, removed: m.removed } : null,
      // A few messages around the reported one, so it can be understood, and nothing more of a private conversation
      context: i >= 0 ? t.messages.slice(Math.max(0, i - 3), i + 2).map((x) => ({ name: x.name, text: x.removed ? "(removed)" : x.text, at: x.at, flagged: x.id === r.messageId })) : [],
      muted: !!m && mutes.some((x) => x.staffId === m.staffId && x.until > now),
    });
  }
  return out;
}

export async function countOpenChatReports(actor: Pick<UserDTO, "role">): Promise<number> {
  assertArea(actor, "concerns");
  return (await getStore().list<ChatReport>("chat_reports")).filter((r) => r.status === "open").length;
}

export type ReviewAction = "remove" | "dismiss" | "mute-day" | "mute-week";

export async function reviewReport(actor: Pick<UserDTO, "staffId" | "role">, reportId: unknown, action: unknown, now: number = Date.now()): Promise<ChatResult> {
  assertArea(actor, "concerns");
  if (typeof reportId !== "string" || !/^r_[0-9a-f]{12}$/.test(reportId)) return { ok: false, error: "That report does not exist." };
  if (action !== "remove" && action !== "dismiss" && action !== "mute-day" && action !== "mute-week") return { ok: false, error: "Choose what to do." };
  const report = await getStore().get<ChatReport>("chat_reports", reportId);
  if (!report) return { ok: false, error: "That report does not exist." };
  let author: string | null = null;
  await getStore().update<Thread>("chat_threads", report.conv, (cur) => {
    const m = cur?.messages.find((x) => x.id === report.messageId);
    if (!cur || !m) return cur;
    author = m.staffId;
    if (action === "dismiss") return { ...cur, messages: cur.messages.map((x) => (x.id === m.id ? { ...x, hidden: false, reports: [] } : x)) };
    return { ...cur, messages: cur.messages.map((x) => (x.id === m.id ? { ...x, removed: true, hidden: true } : x)) };
  });
  if (action === "mute-day" || action === "mute-week") {
    if (author) {
      const until = now + (action === "mute-day" ? 1 : 7) * 24 * 3_600_000;
      await getStore().put<Mute>("chat_mutes", author, { staffId: author, until, by: actor.staffId, reason: report.reason.slice(0, 100) });
      await notify(author, { icon: "🛡️", text: "Your chat messages have been paused after a report. Please keep chats respectful.", tone: "bad" }, now);
    }
  }
  await getStore().put<ChatReport>("chat_reports", reportId, { ...report, status: action === "dismiss" ? "dismissed" : "removed", reviewedBy: actor.staffId });
  await audit(actor.staffId, "chat.reviewed", reportId, { action }, now);
  return { ok: true };
}

export async function unmute(actor: Pick<UserDTO, "staffId" | "role">, staffId: unknown, now: number = Date.now()): Promise<ChatResult> {
  assertArea(actor, "concerns");
  if (typeof staffId !== "string" || !/^[A-Za-z0-9]{1,20}$/.test(staffId)) return { ok: false, error: "Not found." };
  await getStore().delete("chat_mutes", staffId);
  await audit(actor.staffId, "chat.unmuted", staffId, undefined, now);
  return { ok: true };
}
