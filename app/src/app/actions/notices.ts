"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { listAnnouncements, listNotices, markAllRead, type Announcement, type Notice } from "@/lib/server/notices/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function messagesAction(): Promise<{ notices: Notice[]; announcements: Announcement[] }> {
  const user = await requireUser();
  const [notices, announcements] = await Promise.all([listNotices(user), listAnnouncements(10)]);
  return { notices, announcements };
}

export async function markNoticesReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllRead(user);
}
