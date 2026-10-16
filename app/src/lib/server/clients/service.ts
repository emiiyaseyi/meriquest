import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { playStatus } from "../workfirst/service";
import { notify, scheduleNotice } from "../notices/service";
import type { Consequence, FollowUp } from "@/lib/consequence";
import { recordEvent } from "../game/missions";
import { audit } from "../audit";
import { dayKey } from "@/lib/game";
import { hashString } from "@/lib/iso/geometry";
import { withStats } from "@/lib/stats";
import { clientArrival, setArrivalStatus, syncArrivals } from "../arrivals/service";
import { getBook, recordVisit } from "../arrivals/book";
import { afterVisit, relationshipBonus, relationshipText } from "@/lib/arrivals";
import { fill, scoreRun, type Outcome, type Picks, type Rating } from "@/lib/clients";

/**
 * The Clients app (Client Desk). Each day a person is offered a few fictional clients that match their unit and
 * experience. They go through four steps, and the server scores the run from the choices (never from a score sent by the
 * browser), records the client rating and any breach, and pays Merit points once.
 */

interface RunDoc {
  staffId: string;
  day: string;
  done: Record<string, { csat: number; rating: Rating; breaches: number }>;
  current: { clientId: string; step: number; picks: Picks } | null;
}

export interface ClientCard {
  id: string;
  name: string;
  type: "individual" | "corporate";
  archetype: string;
  icon: string;
  story: string;
  /** What this client remembers from earlier visits. */
  history: string;
  /** An appointment with the person as their account officer, or a walk-in. */
  kind: "appointment" | "walkin";
  status: "waiting" | "serving" | "served" | "left";
  done: { csat: number; rating: Rating } | null;
}
export interface StepView {
  client: { id: string; name: string; story: string; archetype: string; icon: string; trait: string; history: string };
  step: number;
  total: number;
  prompt: string;
  options: { id: string; text: string }[];
}
export interface ClientsView {
  /** Clients who have arrived today, waiting first. */
  queue: ClientCard[];
  /** Waiting or being seen now. */
  left: number;
  /** Still to come today, and those who gave up waiting. */
  expected: number;
  gaveUp: number;
  current: StepView | null;
  served: number;
  avgCsat: number | null;
}
export interface ClientFinish {
  csat: number;
  nps: "promoter" | "passive" | "detractor";
  outcome: Outcome;
  rating: Rating;
  breaches: string[];
  notes: string[];
  points: number;
  /** What happens next in real life: how the client decided first, then one story for each breach. */
  aftermath: Consequence[];
  /** How the client feels about the person now, after this visit. */
  relationship: string;
}
export type ClientResult = { ok: true; view: ClientsView; finished?: ClientFinish } | { ok: false; error: string };

type User = Pick<UserDTO, "staffId" | "unit" | "role" | "tenureYears">;

async function today(now: number): Promise<string> {
  return dayKey(now, (await getConfig("workFirst")).timezone);
}

const freshDoc = (staffId: string, day: string): RunDoc => ({ staffId, day, done: {}, current: null });

async function docFor(staffId: string, day: string): Promise<RunDoc> {
  const cur = await getStore().get<RunDoc>("client_runs", staffId);
  return cur && cur.day === day ? cur : freshDoc(staffId, day);
}

export { perDayFor } from "@/lib/clients";

async function view(user: User, doc: RunDoc, now: number): Promise<ClientsView> {
  const [cfg, player] = await Promise.all([getConfig("clients"), getOrCreatePlayer(user, now)]);
  const byArche = new Map(cfg.archetypes.map((a) => [a.id, a]));
  // Only clients who have arrived are shown: they come through the day while the person is in the game
  const [arrivals, book] = await Promise.all([syncArrivals(user, now), getBook(user.staffId)]);
  const here = arrivals.items.filter((i) => i.kind !== "internal" && i.status !== "planned");
  const order = { serving: 0, waiting: 1, served: 2, left: 3 } as const;
  const queue: ClientCard[] = here
    .map((i) => ({ i, c: cfg.clients.find((x) => x.id === i.ref) }))
    .filter((x): x is { i: (typeof here)[number]; c: NonNullable<typeof x.c> } => !!x.c)
    .map(({ i, c }) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      archetype: byArche.get(c.archetype)?.label ?? c.archetype,
      icon: byArche.get(c.archetype)?.icon ?? "🙂",
      story: c.story,
      history: relationshipText(book[c.id], i.kind),
      kind: i.kind as "appointment" | "walkin",
      status: i.status as "waiting" | "serving" | "served" | "left",
      done: doc.done[c.id] ? { csat: doc.done[c.id].csat, rating: doc.done[c.id].rating } : null,
    }))
    .sort((a, b) => order[a.status] - order[b.status]);
  let current: StepView | null = null;
  if (doc.current) {
    const c = cfg.clients.find((x) => x.id === doc.current?.clientId);
    const st = c ? cfg.steps.find((s) => s.id === c.flow[doc.current?.step ?? 0]) : undefined;
    if (c && st) {
      const a = byArche.get(c.archetype);
      const kinds = (await getConfig("market")).kinds;
      current = {
        client: { id: c.id, name: c.name, story: c.story, archetype: a?.label ?? c.archetype, icon: a?.icon ?? "🙂", trait: a?.trait ?? "", history: relationshipText(book[c.id], arrivals.items.find((x) => x.ref === c.id)?.kind ?? "walkin") },
        step: doc.current.step + 1,
        total: c.flow.length,
        prompt: fill(st.prompt, c),
        options: st.recommend ? kinds.map((k) => ({ id: k.id, text: `${k.icon} ${k.label}` })) : st.options.map((o) => ({ id: o.id, text: o.text })),
      };
    }
  }
  const st = withStats(player.stats);
  return { queue, left: queue.filter((q) => q.status === "waiting" || q.status === "serving").length, expected: arrivals.items.filter((i) => i.kind !== "internal" && i.status === "planned").length, gaveUp: arrivals.items.filter((i) => i.kind !== "internal" && i.status === "left").length, current, served: st.clientsServed, avgCsat: st.clientsServed > 0 ? Math.round((st.csatTotal / st.clientsServed) * 10) / 10 : null };
}

export async function getClients(user: User, now: number = Date.now()): Promise<ClientsView> {
  return view(user, await docFor(user.staffId, await today(now)), now);
}

export async function startClient(user: User, clientId: unknown, now: number = Date.now()): Promise<ClientResult> {
  const decision = await playStatus(user, "world", now);
  if (!decision.allowed) return { ok: false, error: decision.message };
  if (typeof clientId !== "string" || clientId.length > 41) return { ok: false, error: "That client is not available." };
  const day = await today(now);
  // Only a client who has arrived and is waiting can be seen
  if (!(await clientArrival(user, clientId, now))) return { ok: false, error: "That client is not waiting right now." };
  let refusal: string | null = null;
  const saved = await getStore().update<RunDoc>("client_runs", user.staffId, (cur) => {
    const d = cur && cur.day === day ? cur : freshDoc(user.staffId, day);
    if (d.done[clientId]) {
      refusal = "You have already served that client today.";
      return d;
    }
    if (d.current) {
      refusal = "Finish the client you are with first.";
      return d;
    }
    return { ...d, current: { clientId, step: 0, picks: { tags: [], kind: null } } };
  });
  if (refusal) return { ok: false, error: refusal };
  await setArrivalStatus(user.staffId, clientId, "waiting", "serving");
  return { ok: true, view: await view(user, saved as RunDoc, now) };
}

/** Answer the current step. The last answer scores the run on the server and pays once. */
export async function answerClient(user: User, optionId: unknown, now: number = Date.now()): Promise<ClientResult> {
  const decision = await playStatus(user, "world", now);
  if (!decision.allowed) return { ok: false, error: decision.message };
  if (typeof optionId !== "string" || optionId.length > 41) return { ok: false, error: "Choose one of the options." };
  const [cfg, market, day] = await Promise.all([getConfig("clients"), getConfig("market"), today(now)]);
  const doc = await docFor(user.staffId, day);
  const cur = doc.current;
  const client = cur ? cfg.clients.find((c) => c.id === cur.clientId) : undefined;
  const step = cur && client ? cfg.steps.find((s) => s.id === client.flow[cur.step]) : undefined;
  if (!cur || !client || !step) return { ok: false, error: "You are not with a client right now." };
  let tags: string[] = [];
  let kind: string | null = cur.picks.kind;
  if (step.recommend) {
    if (!market.kinds.some((k) => k.id === optionId)) return { ok: false, error: "Choose one of the options." };
    kind = optionId;
  } else {
    const opt = step.options.find((o) => o.id === optionId);
    if (!opt) return { ok: false, error: "Choose one of the options." };
    tags = opt.tags;
  }
  const picks: Picks = { tags: [...cur.picks.tags, ...tags], kind };
  const last = cur.step + 1 >= client.flow.length;

  let stale = false;
  await getStore().update<RunDoc>("client_runs", user.staffId, (c) => {
    // The same step must still be the current one: a repeated or out-of-order answer changes nothing
    if (!c || c.day !== day || !c.current || c.current.clientId !== cur.clientId || c.current.step !== cur.step) {
      stale = true;
      return c;
    }
    return last ? { ...c, current: null } : { ...c, current: { clientId: cur.clientId, step: cur.step + 1, picks } };
  });
  if (stale) return { ok: false, error: "That step has already been answered." };
  if (!last) return { ok: true, view: await getClients(user, now) };

  const noise = (hashString(`${user.staffId}:${client.id}:${day}`) / 4294967295) * 2 - 1;
  const hasRecommend = client.flow.some((f) => cfg.steps.find((s) => s.id === f)?.recommend);
  const rel = (await getBook(user.staffId))[client.id];
  const res = scoreRun(cfg.rules, client, cfg.archetypes.find((a) => a.id === client.archetype), picks, noise, hasRecommend, relationshipBonus(rel));
  const points = (res.rating === "great" ? cfg.settings.pointsGreat : res.rating === "good" ? cfg.settings.pointsGood : cfg.settings.pointsLearning) + (res.outcome === "invests" ? cfg.settings.pointsInvest : 0);
  await getStore().update<RunDoc>("client_runs", user.staffId, (c) => (c ? { ...c, done: { ...c.done, [client.id]: { csat: res.csat, rating: res.rating, breaches: res.breaches.length } } } : c));
  await getOrCreatePlayer(user, now);
  await getStore().update<PlayerRecord>("players", user.staffId, (p) => {
    if (!p) return p;
    const s = withStats(p.stats);
    return { ...p, points: p.points + points, stats: { ...s, clientsServed: s.clientsServed + 1, csatTotal: s.csatTotal + res.csat, clientBreaches: s.clientBreaches + (res.breaches.length > 0 ? 1 : 0) }, updatedAt: now };
  });
  await notify(user.staffId, { icon: res.breaches.length > 0 ? "⚠️" : "🤝", text: `${client.name}: rating ${res.csat} of 5${res.breaches.length > 0 ? ", with a compliance breach recorded" : ""}.${points > 0 ? ` +${points} Merit points.` : ""}`, tone: res.breaches.length > 0 ? "bad" : "good" }, now);
  await setArrivalStatus(user.staffId, client.id, "serving", "served");
  await recordVisit(user.staffId, client.id, res.csat, day, res.breaches.length > 0);
  await audit(user.staffId, "clients.served", client.id, { csat: res.csat, breaches: res.breaches.length }, now);
  await recordEvent(user.staffId, "client", now);
  // What happens next: the client's decision, then each breach. The most serious thing to come back later arrives in Updates after a while.
  const stories = [cfg.aftermath.outcomes[res.outcome], ...res.breachKeys.map((k) => cfg.aftermath.breaches[k])].filter((s): s is NonNullable<typeof s> => !!s);
  const aftermath = stories.map((s) => s.consequence as Consequence);
  for (const s of stories.filter((x) => x.followUp).slice(0, 2)) {
    const fu = s.followUp as FollowUp;
    await scheduleNotice(user.staffId, { icon: fu.icon, text: fu.text, tone: fu.tone }, now + fu.afterMinutes * 60_000);
  }
  return { ok: true, view: await getClients(user, now), finished: { csat: res.csat, nps: res.nps, outcome: res.outcome, rating: res.rating, breaches: res.breaches, notes: res.notes, points, aftermath, relationship: relationshipText(afterVisit(rel, res.csat, day, res.breaches.length > 0), "walkin") } };
}
