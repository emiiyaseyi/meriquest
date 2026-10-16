import { assertArea } from "../auth/permissions";
import "server-only";
import { randomBytes } from "node:crypto";
import { getStore } from "../store";
import { audit } from "../audit";
import type { UserDTO } from "../types";
import { cleanText } from "@/lib/concerns";

/**
 * Updates (personal notifications) and announcements from the admin team. Updates are written by the game
 * itself (a class ended, a mission was paid, a report changed status); people can only read their own and mark
 * them read. Announcements are written by admins and read by everyone.
 */
export type NoticeTone = "good" | "bad" | "info";

export interface Notice {
  id: string;
  at: number;
  icon: string;
  text: string;
  tone: NoticeTone;
  read: boolean;
}

interface PendingNotice {
  id: string;
  /** When it arrives in the person's Updates. */
  dueAt: number;
  icon: string;
  text: string;
  tone: NoticeTone;
}

interface NoticeBox {
  id: string; // staffId
  staffId: string;
  items: Notice[];
  /** Follow-ups that have not arrived yet: real consequences do not show up at once. */
  pending?: PendingNotice[];
}

/** Move the follow-ups whose time has come into the visible list (newest first), keeping the rest waiting. */
function settle(box: NoticeBox, now: number): NoticeBox {
  const waiting = box.pending ?? [];
  const due = waiting.filter((p) => p.dueAt <= now);
  if (due.length === 0) return box;
  const arrived: Notice[] = due.sort((a, b) => b.dueAt - a.dueAt).map((p) => ({ id: p.id, at: p.dueAt, icon: p.icon, text: p.text, tone: p.tone, read: false }));
  return { ...box, items: [...arrived, ...box.items].slice(0, MAX_NOTICES), pending: waiting.filter((p) => p.dueAt > now) };
}

const hasDue = (box: NoticeBox | null, now: number) => !!box?.pending?.some((p) => p.dueAt <= now);

export const MAX_NOTICES = 100;
const MAX_TEXT = 300;

/** Add an update for someone. Never throws: an update is a courtesy and must not break what triggered it. */
export async function notify(staffId: string, n: { icon: string; text: string; tone?: NoticeTone }, now: number = Date.now()): Promise<void> {
  try {
    const item: Notice = { id: randomBytes(6).toString("hex"), at: now, icon: n.icon.slice(0, 8), text: cleanText(n.text, MAX_TEXT).replace(/\n/g, " "), tone: n.tone ?? "info", read: false };
    await getStore().update<NoticeBox>("notices", staffId, (cur) => ({ id: staffId, staffId, items: [item, ...(cur?.items ?? [])].slice(0, MAX_NOTICES) }));
  } catch {
    console.error("[notices] could not add an update");
  }
}

/** Add an update that arrives later (a consequence that takes time to show). Never throws. */
export async function scheduleNotice(staffId: string, n: { icon: string; text: string; tone?: NoticeTone }, dueAt: number): Promise<void> {
  try {
    const item: PendingNotice = { id: randomBytes(6).toString("hex"), dueAt, icon: n.icon.slice(0, 8), text: cleanText(n.text, MAX_TEXT).split(/\s+/).join(" "), tone: n.tone ?? "info" };
    await getStore().update<NoticeBox>("notices", staffId, (cur) => ({ id: staffId, staffId, items: cur?.items ?? [], pending: [...(cur?.pending ?? []), item].slice(-30) }));
  } catch {
    console.error("[notices] could not schedule an update");
  }
}

/** The person's box, with any follow-ups that are now due brought in (saved once, so they stay). */
async function boxNow(staffId: string, now: number): Promise<NoticeBox | null> {
  const box = await getStore().get<NoticeBox>("notices", staffId);
  if (!hasDue(box, now)) return box;
  return getStore().update<NoticeBox>("notices", staffId, (cur) => (cur ? settle(cur, now) : cur));
}

export async function listNotices(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<Notice[]> {
  const box = await boxNow(user.staffId, now);
  return (box?.items ?? []).slice(0, MAX_NOTICES);
}

export async function unreadCount(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<number> {
  const box = await boxNow(user.staffId, now);
  return (box?.items ?? []).filter((i) => !i.read).length;
}

export async function markAllRead(user: Pick<UserDTO, "staffId">): Promise<void> {
  await getStore().update<NoticeBox>("notices", user.staffId, (cur) => (cur ? { ...cur, items: cur.items.map((i) => (i.read ? i : { ...i, read: true })) } : cur));
}

/* ------------------------------- announcements ------------------------------- */

export interface Announcement {
  id: string;
  at: number;
  by: string;
  title: string;
  text: string;
}

const MAX_TITLE = 80;
const MAX_ANNOUNCEMENT = 600;

export async function listAnnouncements(limit = 20): Promise<Announcement[]> {
  const all = await getStore().list<Announcement>("announcements");
  return all.sort((a, b) => b.at - a.at).slice(0, Math.min(Math.max(limit, 1), 100));
}

export type AnnounceResult = { ok: true } | { ok: false; error: string };

export async function postAnnouncement(actor: Pick<UserDTO, "staffId" | "role">, title: unknown, text: unknown, now: number = Date.now()): Promise<AnnounceResult> {
  assertArea(actor, "announcements");
  const t = cleanText(title, MAX_TITLE).replace(/\n/g, " ");
  const body = cleanText(text, MAX_ANNOUNCEMENT);
  if (t.length < 3) return { ok: false, error: "Please give the announcement a title." };
  if (body.length < 5) return { ok: false, error: "Please write the announcement." };
  const id = `${String(now).padStart(15, "0")}-${randomBytes(3).toString("hex")}`;
  await getStore().put("announcements", id, { id, at: now, by: actor.staffId, title: t, text: body } satisfies Announcement);
  await audit(actor.staffId, "announcement.posted", id, { title: t }, now);
  return { ok: true };
}

export async function deleteAnnouncement(actor: Pick<UserDTO, "staffId" | "role">, id: unknown, now: number = Date.now()): Promise<AnnounceResult> {
  assertArea(actor, "announcements");
  if (typeof id !== "string" || !/^\d{15}-[0-9a-f]{6}$/.test(id)) return { ok: false, error: "That announcement does not exist." };
  await getStore().delete("announcements", id);
  await audit(actor.staffId, "announcement.deleted", id, undefined, now);
  return { ok: true };
}
