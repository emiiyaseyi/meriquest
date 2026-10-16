import { hashString } from "@/lib/iso/geometry";

/**
 * Visitors who come to the person through the working day: clients with an appointment to see their account officer, clients
 * who walk in, and colleagues who need something. They are paced by time spent in the game, not by the clock, so nothing piles up
 * or goes wrong while the person is away (RULEBOOK §2.1: nothing may pressure people to play). While the person is in the game, a
 * visitor who is left waiting too long gives up and leaves, and that is a consequence they can see.
 */
export type ArrivalKind = "appointment" | "walkin" | "internal";
export type ArrivalStatus = "planned" | "waiting" | "serving" | "served" | "left";

export interface Arrival {
  id: string;
  kind: ArrivalKind;
  /** The client case id (appointment, walk-in) or the situation id (internal). */
  ref: string;
  name: string;
  /** In-game seconds into the person's day at which they arrive. */
  at: number;
  status: ArrivalStatus;
  /** In-game seconds into the day when they began to wait. */
  since?: number;
}

export interface ArrivalDoc {
  staffId: string;
  day: string;
  /** In-game seconds counted today. */
  clock: number;
  /** When the clock was last counted (epoch ms). */
  lastAt: number;
  items: Arrival[];
}

export interface ArrivalSettings {
  /** When off, the whole day's visitors are there from the start and nobody gives up. */
  enabled: boolean;
  clientsEverySeconds: number;
  internalPerDay: number;
  internalEverySeconds: number;
  /** Share of the day's clients who have an appointment with the person (0 to 100). */
  appointmentShare: number;
  patienceSeconds: number;
  maxWaiting: number;
  bookSize: number;
}

/** The most in-game time counted between two checks, and how long a gap still counts as "still playing". */
export const MAX_STEP_SECONDS = 60;
export const STILL_HERE_MS = 120_000;

const jitter = (seed: string, range: number) => (range <= 0 ? 0 : hashString(seed) % range);

/**
 * The day's visitors in the order they arrive. Clients come in the order given (the caller puts the person's own book first); the ones in the book
 * have appointments, the others walk in. Colleagues are spread through the day as well.
 */
export function planDay(opts: {
  staffId: string;
  day: string;
  /** The day's clients, in order. */
  clients: { id: string; name: string }[];
  /** Clients in the person's book (they have appointments). */
  book: Set<string>;
  /** Situations a colleague may bring, already chosen for today. */
  internal: { id: string; name: string }[];
  settings: ArrivalSettings;
}): Arrival[] {
  const { settings: s } = opts;
  const everyC = s.enabled ? s.clientsEverySeconds : 0;
  const everyI = s.enabled ? s.internalEverySeconds : 0;
  const maxAppointments = Math.round((opts.clients.length * s.appointmentShare) / 100);
  let appointments = 0;
  const clients: Arrival[] = opts.clients.map((c, i) => {
    const wantsAppointment = opts.book.has(c.id) && appointments < maxAppointments;
    if (wantsAppointment) appointments++;
    return { id: `a-${opts.day}-c${i}`, kind: wantsAppointment ? "appointment" : "walkin", ref: c.id, name: c.name, at: i * everyC + jitter(`${opts.staffId}:${opts.day}:c${i}`, Math.floor(everyC / 3)), status: "planned" };
  });
  const internal: Arrival[] = opts.internal.map((t, j) => ({ id: `a-${opts.day}-i${j}`, kind: "internal", ref: t.id, name: t.name, at: Math.floor(everyI / 2) + j * everyI + jitter(`${opts.staffId}:${opts.day}:i${j}`, Math.floor(everyI / 3)), status: "planned" }));
  return [...clients, ...internal].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/**
 * Count the in-game time since the last check, bring in whoever is due (never more than `maxWaiting` waiting at once), and let anyone who
 * has waited longer than their patience leave. Returns the new document and what changed.
 */
export function advance(doc: ArrivalDoc, now: number, s: ArrivalSettings): { doc: ArrivalDoc; arrived: string[]; left: string[] } {
  const gap = doc.lastAt > 0 ? now - doc.lastAt : 0;
  const delta = gap > 0 && gap <= STILL_HERE_MS ? Math.min(gap / 1000, MAX_STEP_SECONDS) : 0;
  const clock = doc.clock + delta;
  const arrived: string[] = [];
  const left: string[] = [];
  let waiting = doc.items.filter((i) => i.status === "waiting").length;
  const items = doc.items.map((it) => {
    if (it.status === "waiting" && s.enabled && clock - (it.since ?? clock) > s.patienceSeconds) {
      left.push(it.id);
      waiting--;
      return { ...it, status: "left" as const };
    }
    return it;
  });
  const out = items.map((it) => {
    if (it.status === "planned" && it.at <= clock && (!s.enabled || waiting < s.maxWaiting)) {
      waiting++;
      arrived.push(it.id);
      return { ...it, status: "waiting" as const, since: clock };
    }
    return it;
  });
  return { doc: { ...doc, clock, lastAt: now, items: out }, arrived, left };
}

/** The clients in a person's own book: a steady set, the same every day, drawn from the clients they may serve. */
export function bookFor(staffId: string, eligible: { id: string }[], size: number): string[] {
  return [...eligible]
    .sort((a, b) => hashString(`${staffId}:book:${a.id}`) - hashString(`${staffId}:book:${b.id}`))
    .slice(0, Math.max(0, size))
    .map((c) => c.id);
}

/**
 * What a client remembers about the person, from earlier visits. A new client starts neutral. A good visit warms them and a poor visit, or being left
 * waiting, cools them. It changes how the next conversation goes, so a decision today is felt on a later day.
 */
export interface Relationship {
  /** 0 to 100; 50 is neutral. */
  score: number;
  met: number;
  /** The rating (1 to 5) of the last visit, or 0 if they gave up waiting. */
  last: number;
  lastDay: string;
}

export const NEUTRAL: Relationship = { score: 50, met: 0, last: 0, lastDay: "" };

const clampRel = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** After a visit, the relationship moves halfway towards how the visit went (a rating of 5 is 100, a rating of 1 is 20). */
export function afterVisit(rel: Relationship | undefined, csat: number, day: string, breached: boolean): Relationship {
  const cur = rel ?? NEUTRAL;
  const target = csat * 20 - (breached ? 15 : 0);
  return { score: clampRel(cur.score + (target - cur.score) / 2), met: cur.met + 1, last: csat, lastDay: day };
}

/** A client who gave up waiting remembers it. */
export function afterNoShow(rel: Relationship | undefined, day: string): Relationship {
  const cur = rel ?? NEUTRAL;
  return { ...cur, score: clampRel(cur.score - 15), last: 0, lastDay: day };
}

/** Extra points (or fewer) at the start of the next conversation, from how the client feels about the person: from -10 to +10. */
export const relationshipBonus = (rel: Relationship | undefined): number => Math.round(((rel ?? NEUTRAL).score - 50) / 5);

/** A line the person reads before the conversation starts. */
export function relationshipText(rel: Relationship | undefined, kind: ArrivalKind): string {
  if (!rel || rel.met === 0) return kind === "appointment" ? "Booked to see you. You have not met before." : "A new face.";
  const seen = `Seen ${rel.met} time${rel.met === 1 ? "" : "s"}.`;
  const last = rel.last > 0 ? ` Last visit: ${"★".repeat(rel.last)}${"☆".repeat(5 - rel.last)}.` : " They once gave up waiting to see you.";
  const feel = rel.score >= 75 ? " They trust you." : rel.score >= 55 ? " A good working relationship." : rel.score >= 40 ? " Still making up their mind about you." : rel.score >= 25 ? " Wary after a poor experience." : " Close to taking their business elsewhere.";
  return `${seen}${last}${feel}`;
}
