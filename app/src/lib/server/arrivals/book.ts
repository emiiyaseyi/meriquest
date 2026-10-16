import "server-only";
import { getStore } from "../store";
import { afterNoShow, afterVisit, type Relationship } from "@/lib/arrivals";

/** A person's client book: what each regular client remembers about how they were treated. One record per person. */
interface BookDoc {
  staffId: string;
  rel: Record<string, Relationship>;
}

export async function getBook(staffId: string): Promise<Record<string, Relationship>> {
  return (await getStore().get<BookDoc>("client_book", staffId))?.rel ?? {};
}

const MAX_KNOWN = 200;

async function change(staffId: string, clientId: string, fn: (cur: Relationship | undefined) => Relationship): Promise<void> {
  await getStore().update<BookDoc>("client_book", staffId, (cur) => {
    const rel = { ...(cur?.rel ?? {}) };
    rel[clientId] = fn(rel[clientId]);
    // Keep the book from growing without limit: forget the clients seen longest ago
    const keys = Object.keys(rel);
    if (keys.length > MAX_KNOWN) for (const k of keys.sort((a, b) => rel[a].lastDay.localeCompare(rel[b].lastDay)).slice(0, keys.length - MAX_KNOWN)) delete rel[k];
    return { staffId, rel };
  });
}

/** After a conversation: the client's feeling moves towards how it went. */
export const recordVisit = (staffId: string, clientId: string, csat: number, day: string, breached: boolean) => change(staffId, clientId, (r) => afterVisit(r, csat, day, breached));

/** After a client gave up waiting. */
export const recordNoShow = (staffId: string, clientId: string, day: string) => change(staffId, clientId, (r) => afterNoShow(r, day));
