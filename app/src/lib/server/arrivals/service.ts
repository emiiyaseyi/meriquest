import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { notify, scheduleNotice } from "../notices/service";
import { recordEvent } from "../game/missions";
import { audit } from "../audit";
import { recordNoShow } from "./book";
import { dayKey } from "@/lib/game";
import { hashString } from "@/lib/iso/geometry";
import { advance, bookFor, planDay, type Arrival, type ArrivalDoc, type ArrivalSettings } from "@/lib/arrivals";
import { eligibleClients, perDayFor, queueFor } from "@/lib/clients";
import { MAX_CHAIN, type Consequence, type FollowUp } from "@/lib/consequence";
import { choiceOrder, type ShiftTaskDef, type Verdict } from "@/lib/shift";

/**
 * Visitors through the day (see lib/arrivals.ts). This keeps each person's list for the day, counts the time they spend in the game,
 * brings visitors in and lets them leave, and handles requests from colleagues. Clients are served in the Client Desk, which marks them
 * here as being served and served.
 */
type User = Pick<UserDTO, "staffId" | "unit" | "tenureYears">;

export interface VisitorView {
  id: string;
  kind: Arrival["kind"];
  name: string;
  /** What kind of visitor, for example "Appointment", "Walk-in" or "Colleague (Compliance)". */
  label: string;
  /** In-game seconds they have waited, and how long they will wait in all. */
  waited: number;
  patience: number;
  /** A colleague's request, shown when it is opened (never the answers). */
  situation?: { title: string; story: string; choices: string[] };
}

export interface ArrivalsView {
  waiting: VisitorView[];
  /** Still to come today, served so far, and those who gave up. */
  later: number;
  served: number;
  left: number;
  total: number;
  /** Whether visitors are paced at all (off means everyone is already here). */
  paced: boolean;
}

export type InternalResult =
  | { ok: true; verdict: Verdict; feedback: string; points: number; consequence?: Consequence; nextTitle?: string; comesBack: boolean; view: ArrivalsView }
  | { ok: false; error: string };

async function today(now: number): Promise<string> {
  return dayKey(now, (await getConfig("workFirst")).timezone);
}

const settingsOf = (cfg: Awaited<ReturnType<typeof getConfig<"arrivals">>>): ArrivalSettings => ({ ...cfg.settings });

/** A name and where from, for a colleague who brings a request. Fixed for the person and the day. */
function colleagueName(cfg: Awaited<ReturnType<typeof getConfig<"arrivals">>>, seed: string): string {
  const first = cfg.names[hashString(`${seed}:n`) % cfg.names.length];
  const dept = cfg.departments[hashString(`${seed}:d`) % cfg.departments.length];
  return dept === "your manager" ? `${first}, your manager` : dept === "a colleague" ? `${first}, a colleague` : `${first} from ${dept}`;
}

/** Work out today's list for a person. The person's own book comes first (those clients have appointments), then the others. */
async function buildPlan(user: User, day: string): Promise<ArrivalDoc> {
  const [arr, clients, shifts] = await Promise.all([getConfig("arrivals"), getConfig("clients"), getConfig("shifts")]);
  const s = settingsOf(arr);
  const perDay = perDayFor(clients.settings, user.unit);
  const cases = clients.clients as Parameters<typeof eligibleClients>[0];
  const eligible = eligibleClients(cases, user);
  const book = bookFor(user.staffId, eligible, s.bookSize);
  const appointments = Math.min(book.length, Math.round((perDay * s.appointmentShare) / 100));
  const fromBook = book.slice(0, appointments).map((id) => eligible.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  const rest = queueFor(cases, user, perDay + appointments, day).filter((c) => !fromBook.some((b) => b.id === c.id));
  const todays = [...fromBook, ...rest].slice(0, perDay).sort((a, b) => hashString(`${user.staffId}:${day}:o:${a.id}`) - hashString(`${user.staffId}:${day}:o:${b.id}`));
  // Colleagues bring the requests marked as internal that fit the person's unit, a different set each day
  const tasks = (shifts.tasks as ShiftTaskDef[]).filter((t) => t.internal && !t.chainOnly && (t.units.includes("*") || t.units.includes(user.unit)));
  const internal = [...tasks]
    .sort((a, b) => hashString(`${user.staffId}:${day}:i:${a.id}`) - hashString(`${user.staffId}:${day}:i:${b.id}`))
    .slice(0, s.internalPerDay)
    .map((t, j) => ({ id: t.id, name: colleagueName(arr, `${user.staffId}:${day}:${j}`) }));
  const items = planDay({ staffId: user.staffId, day, clients: todays.map((c) => ({ id: c.id, name: c.name })), book: new Set(book), internal, settings: s });
  return { staffId: user.staffId, day, clock: 0, lastAt: 0, items };
}

/** Bring the person's list up to date: start the day's list if needed, count the time in the game, let visitors arrive and give up. */
export async function syncArrivals(user: User, now: number = Date.now()): Promise<ArrivalDoc> {
  const day = await today(now);
  const [arr, existing] = await Promise.all([getConfig("arrivals"), getStore().get<ArrivalDoc>("arrivals", user.staffId)]);
  const fresh = existing && existing.day === day ? null : await buildPlan(user, day);
  const s = settingsOf(arr);
  const left: Arrival[] = [];
  const saved = await getStore().update<ArrivalDoc>("arrivals", user.staffId, (cur) => {
    const base = cur && cur.day === day ? cur : (fresh ?? cur);
    if (!base) return cur;
    const r = advance(base, now, s);
    for (const id of r.left) {
      const it = r.doc.items.find((x) => x.id === id);
      if (it) left.push(it);
    }
    return r.doc;
  });
  // Someone who gave up and left becomes a follow-up in Updates, a little later
  for (const it of left) {
    if (it.kind !== "internal") await recordNoShow(user.staffId, it.ref, day);
    if (it.kind === "internal") await scheduleNotice(user.staffId, { icon: "😕", text: `${it.name} gave up waiting and left. Whatever they needed is still not done.`, tone: "bad" }, now + 2 * 60_000);
    else await scheduleNotice(user.staffId, { icon: "😠", text: `${it.name} left without being seen after waiting a long time at reception. Expect a complaint if nobody follows up.`, tone: "bad" }, now + 3 * 60_000);
  }
  return saved as ArrivalDoc;
}

const KIND_LABEL: Record<Arrival["kind"], string> = { appointment: "Appointment", walkin: "Walk-in", internal: "Colleague" };

async function viewOf(user: User, doc: ArrivalDoc): Promise<ArrivalsView> {
  const [arr, shifts] = await Promise.all([getConfig("arrivals"), getConfig("shifts")]);
  const defs = new Map((shifts.tasks as ShiftTaskDef[]).map((t) => [t.id, t]));
  const waiting: VisitorView[] = doc.items
    .filter((i) => i.status === "waiting")
    .map((i) => {
      const def = i.kind === "internal" ? defs.get(i.ref) : undefined;
      return {
        id: i.id,
        kind: i.kind,
        name: i.name,
        label: i.kind === "internal" ? i.name.includes(" from ") ? `Colleague · ${i.name.split(" from ")[1]}` : "Colleague" : KIND_LABEL[i.kind],
        waited: Math.max(0, Math.round(doc.clock - (i.since ?? doc.clock))),
        patience: arr.settings.patienceSeconds,
        ...(def ? { situation: { title: def.title, story: def.story, choices: choiceOrder(user.staffId, def.id, def.choices.length).map((k) => def.choices[k].text) } } : {}),
      };
    });
  const count = (st: Arrival["status"]) => doc.items.filter((i) => i.status === st).length;
  return { waiting, later: count("planned"), served: count("served"), left: count("left"), total: doc.items.length, paced: arr.settings.enabled };
}

export async function getArrivals(user: User, now: number = Date.now()): Promise<ArrivalsView> {
  return viewOf(user, await syncArrivals(user, now));
}

/** The visitor entry for a client, if that client is waiting (used by the Client Desk). */
export async function clientArrival(user: User, clientId: string, now: number): Promise<Arrival | null> {
  const doc = await syncArrivals(user, now);
  return doc.items.find((i) => i.kind !== "internal" && i.ref === clientId && i.status === "waiting") ?? null;
}

/** Mark a visitor as being served, or served. Does nothing when they are not in the expected state. */
export async function setArrivalStatus(staffId: string, clientId: string, from: Arrival["status"], to: Arrival["status"]): Promise<void> {
  await getStore().update<ArrivalDoc>("arrivals", staffId, (cur) => {
    if (!cur) return cur;
    let done = false;
    return { ...cur, items: cur.items.map((i) => (!done && i.kind !== "internal" && i.ref === clientId && i.status === from ? ((done = true), { ...i, status: to }) : i)) };
  });
}

/** Answer a colleague's request. Pays a few Merit points, shows what happens next, and can lead to the next request or a follow-up later. */
export async function serveInternal(user: User, arrivalId: unknown, shown: unknown, now: number = Date.now()): Promise<InternalResult> {
  if (typeof arrivalId !== "string" || arrivalId.length > 60) return { ok: false, error: "That visitor is not here." };
  const [arr, shifts] = await Promise.all([getConfig("arrivals"), getConfig("shifts")]);
  const doc0 = await syncArrivals(user, now);
  const it0 = doc0.items.find((i) => i.id === arrivalId && i.kind === "internal" && i.status === "waiting");
  const defs = new Map((shifts.tasks as ShiftTaskDef[]).map((t) => [t.id, t]));
  const def = it0 ? defs.get(it0.ref) : undefined;
  if (!it0 || !def) return { ok: false, error: "That visitor is not here." };
  if (typeof shown !== "number" || !Number.isInteger(shown) || shown < 0 || shown >= def.choices.length) return { ok: false, error: "Please pick one of the choices." };
  const picked = def.choices[choiceOrder(user.staffId, def.id, def.choices.length)[shown]];
  const points = picked.verdict === "best" ? arr.settings.internalPointsBest : picked.verdict === "partly" ? arr.settings.internalPointsPartly : 0;
  let refusal: string | null = null;
  let nextTitle: string | undefined;
  await getStore().update<ArrivalDoc>("arrivals", user.staffId, (cur) => {
    const it = cur?.items.find((i) => i.id === arrivalId);
    if (!cur || !it || it.status !== "waiting") {
      refusal = "That visitor has already been seen.";
      return cur;
    }
    let items = cur.items.map((i) => (i.id === arrivalId ? { ...i, status: "served" as const } : i));
    // A choice can lead to the next request from the same colleague, at most MAX_CHAIN times a day
    const next = picked.next ? defs.get(picked.next) : undefined;
    const chained = cur.items.filter((i) => i.id.includes("-x")).length;
    if (next && !cur.items.some((i) => i.ref === next.id) && chained < MAX_CHAIN) {
      items = [...items, { id: `${cur.day}-x${chained}`, kind: "internal", ref: next.id, name: it.name, at: cur.clock, status: "waiting", since: cur.clock }];
      nextTitle = next.title;
    }
    return { ...cur, items };
  });
  if (refusal) return { ok: false, error: refusal };
  if (points > 0) {
    await getOrCreatePlayer(user, now);
    await getStore().update<PlayerRecord>("players", user.staffId, (p) => (p ? { ...p, points: p.points + points, updatedAt: now } : p));
  }
  const f = picked.followUp as FollowUp | undefined;
  if (f) await scheduleNotice(user.staffId, { icon: f.icon, text: f.text, tone: f.tone }, now + f.afterMinutes * 60_000);
  await audit(user.staffId, "visitors.internal", def.id, { verdict: picked.verdict }, now);
  await recordEvent(user.staffId, "visitor", now);
  if (points > 0) await notify(user.staffId, { icon: "🙋", text: `${it0.name}: ${picked.verdict === "best" ? "well handled" : "handled"}. +${points} Merit points.`, tone: "good" }, now);
  return { ok: true, verdict: picked.verdict, feedback: picked.feedback, points, consequence: picked.consequence as Consequence | undefined, nextTitle, comesBack: !!f, view: await getArrivals(user, now) };
}
