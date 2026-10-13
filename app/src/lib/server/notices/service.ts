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

interface NoticeBox {
  id: string; // staffId
  staffId: string;
  items: Notice[];
}

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

export async function listNotices(user: Pick<UserDTO, "staffId">): Promise<Notice[]> {
  const box = await getStore().get<NoticeBox>("notices", user.staffId);
  return (box?.items ?? []).slice(0, MAX_NOTICES);
}

export async function unreadCount(user: Pick<UserDTO, "staffId">): Promise<number> {
  const box = await getStore().get<NoticeBox>("notices", user.staffId);
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
