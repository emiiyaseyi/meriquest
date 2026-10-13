import "server-only";
import { randomBytes } from "node:crypto";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { assertAdmin } from "../auth/admin";
import { getUser } from "../auth/users";
import type { UserDTO } from "../types";
import { currentSession, effectivePolicy, evaluate, localTime, type Activity, type Decision, type SessionState, type Usage, type WorkFirstPolicy } from "@/lib/workfirst";

/**
 * Server-authoritative play time. The client sends a "heartbeat"; the server decides whether play
 * is allowed and credits only the real elapsed time since the previous beat (capped), so a client
 * cannot invent or hide minutes.
 */
interface DayDoc {
  staffId: string;
  date: string;
  seconds: number;
  windows: Record<string, number>;
  learningCoreSeconds: number;
  lastBeat: number | null;
  lastActivity: Activity | null;
}

interface AssignmentDoc {
  id: string;
  staffId: string;
  weekStart: string; // local Monday, YYYY-MM-DD
  minutes: number;
  assignedBy: string;
  at: number;
}

/** A beat further apart than this is treated as a gap (tab closed, device asleep), not play time. */
export const MAX_BEAT_GAP_MS = 90_000;

const dayId = (staffId: string, date: string) => `${staffId}:${date}`;

/** Local Monday of the week containing `date` (YYYY-MM-DD). */
export function weekStartOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

async function weekDocs(staffId: string, weekStart: string): Promise<DayDoc[]> {
  const end = new Date(`${weekStart}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const to = end.toISOString().slice(0, 10);
  return (await getStore().list<DayDoc>("playtime")).filter((d) => d.staffId === staffId && d.date >= weekStart && d.date <= to);
}

async function assignedSeconds(staffId: string, weekStart: string): Promise<number> {
  const all = await getStore().list<AssignmentDoc>("learning_assignments");
  return all.filter((a) => a.staffId === staffId && a.weekStart === weekStart).reduce((s, a) => s + a.minutes * 60, 0);
}

function usageFrom(today: DayDoc | null, week: DayDoc[]): Usage {
  return {
    todaySeconds: today?.seconds ?? 0,
    weekSeconds: week.reduce((s, d) => s + d.seconds, 0),
    windowSeconds: today?.windows ?? {},
    learningCoreSecondsWeek: week.reduce((s, d) => s + d.learningCoreSeconds, 0),
  };
}

async function load(user: Pick<UserDTO, "staffId" | "unit">, now: number) {
  const policy = await getConfig("workFirst");
  const eff = effectivePolicy(policy, user.unit);
  const lt = localTime(now, eff.timezone);
  const weekStart = weekStartOf(lt.date);
  const [week, assigned] = await Promise.all([weekDocs(user.staffId, weekStart), assignedSeconds(user.staffId, weekStart)]);
  const today = week.find((d) => d.date === lt.date) ?? null;
  return { policy, lt, weekStart, week, today, assigned };
}

/** Read-only view: may this person play right now? */
type PlayUser = Pick<UserDTO, "staffId" | "unit"> & { role?: UserDTO["role"] };

function adminPreview(policy: WorkFirstPolicy, user: PlayUser): Decision | null {
  if (!policy.adminsExempt || user.role !== "admin") return null;
  return { allowed: true, code: "admin_preview", message: "Admin preview: Work First is not applied to admins.", remainingSeconds: null, nudge: false, weeklySoftCapReached: false, windowId: null, isWorkday: true };
}

interface SessionDoc {
  staffId: string;
  used: number; // seconds of play used in the current allowance
  lastPlayAt: number | null; // epoch ms of the last credited play
  lastBeat: number | null; // epoch ms of the last accepted heartbeat
  lastActivity: Activity | null; // what that heartbeat was for: time is only credited between beats of the same activity
}

const sessionState = (d: SessionDoc | null): SessionState => ({ usedSeconds: d?.used ?? 0, lastPlayAt: d?.lastPlayAt ?? null });

export async function playStatus(user: PlayUser, activity: Activity, now: number = Date.now()): Promise<Decision> {
  const { policy, today, week, assigned } = await load(user, now);
  const preview = adminPreview(policy, user);
  if (preview) return preview;
  const sd = await getStore().get<SessionDoc>("play_sessions", user.staffId);
  return evaluate(policy, { unit: user.unit, now, usage: usageFrom(today, week), assignedLearningSeconds: assigned, session: sessionState(sd) }, activity);
}

/**
 * Called about every 30 seconds while the player is actively in the game. The server credits only the real
 * time since the previous accepted beat (capped), inside one atomic update of the person's session
 * record, so two open tabs cannot double-count time or dodge the pause. Returns the new decision so the
 * client can show a countdown or the break screen.
 */
export async function playBeat(user: PlayUser, activity: Activity, now: number = Date.now()): Promise<Decision> {
  const { policy, lt, week, today, assigned } = await load(user, now);
  const preview = adminPreview(policy, user);
  if (preview) return preview; // nothing is credited for an admin preview
  const eff = effectivePolicy(policy, user.unit);
  const world = activity === "world";
  let decision: Decision | null = null;
  let credited = 0;
  let creditedWindow: string | null = null;
  let creditedCoreLearning = false;

  await getStore().update<SessionDoc>("play_sessions", user.staffId, (cur) => {
    const sd: SessionDoc = cur ?? { staffId: user.staffId, used: 0, lastPlayAt: null, lastBeat: null, lastActivity: null };
    const sess = currentSession(eff, sessionState(cur), now);
    const before = evaluate(policy, { unit: user.unit, now, usage: usageFrom(today, week), assignedLearningSeconds: assigned, session: sess }, activity);
    if (!before.allowed) {
      decision = before;
      return cur ?? null; // nothing credited; no record is created for a refused beat
    }
    // Time between two beats is credited only when both were for the same activity (learning then game credits nothing)
    const gap = sd.lastBeat === null || sd.lastActivity !== activity ? 0 : now - sd.lastBeat;
    // Only a plausible, forward-moving gap counts (a clock that went backwards credits nothing).
    const creditMs = gap > 0 && gap <= MAX_BEAT_GAP_MS ? gap : 0;
    // Never credit past what the decision allows: stop exactly at the limit.
    const allowedMs = before.remainingSeconds === null ? creditMs : Math.min(creditMs, before.remainingSeconds * 1000);
    const secs = Math.floor(allowedMs / 1000);
    credited = secs;
    creditedWindow = before.windowId;
    creditedCoreLearning = activity === "learning" && before.code === "ok" && before.windowId === null && isCoreLearning(policy, user.unit, now);
    const next: SessionDoc = {
      staffId: user.staffId,
      used: sess.usedSeconds + (world ? secs : 0),
      lastPlayAt: world && secs > 0 ? now : sess.lastPlayAt,
      lastBeat: now,
      lastActivity: activity,
    };
    const usageAfter: Usage = { ...usageFrom(today, week), todaySeconds: (today?.seconds ?? 0) + (world ? secs : 0), weekSeconds: week.reduce((t, d) => t + d.seconds, 0) + (world ? secs : 0) };
    decision = evaluate(policy, { unit: user.unit, now, usage: usageAfter, assignedLearningSeconds: assigned, session: sessionState(next) }, activity);
    return next;
  });

  // Daily and window totals (for caps and reports) are recorded separately, after the gate above.
  if (credited > 0 || creditedCoreLearning) {
    await getStore().update<DayDoc>("playtime", dayId(user.staffId, lt.date), (cur) => {
      const doc: DayDoc = cur ?? { staffId: user.staffId, date: lt.date, seconds: 0, windows: {}, learningCoreSeconds: 0, lastBeat: null, lastActivity: null };
      return {
        ...doc,
        seconds: doc.seconds + (world || creditedWindow ? credited : 0),
        windows: creditedWindow ? { ...doc.windows, [creditedWindow]: (doc.windows[creditedWindow] ?? 0) + credited } : doc.windows,
        learningCoreSeconds: doc.learningCoreSeconds + (creditedCoreLearning ? credited : 0),
        lastBeat: now,
        lastActivity: activity,
      };
    });
  }
  return decision as unknown as Decision;
}

/** True when `now` falls inside core working hours for this unit (learning then draws on assigned time). */
function isCoreLearning(policy: WorkFirstPolicy, unit: string, now: number): boolean {
  const eff = effectivePolicy(policy, unit);
  const lt = localTime(now, eff.timezone);
  if (eff.publicHolidays.includes(lt.date) || !eff.coreHours.days.includes(lt.dow)) return false;
  const [sh, sm] = eff.coreHours.start.split(":").map(Number);
  const [eh, em] = eff.coreHours.end.split(":").map(Number);
  return lt.minutes >= sh * 60 + sm && lt.minutes < eh * 60 + em;
}

/* ------------------------------ assigned learning ------------------------------ */

export type AssignResult = { ok: true; minutesThisWeek: number } | { ok: false; error: string };

/**
 * Admins may assign learning time to anyone; line managers only to people in their own unit.
 * The total per person per week can never exceed the policy limit.
 */
export async function assignLearning(actor: UserDTO, staffId: string, minutes: number, now: number = Date.now()): Promise<AssignResult> {
  if (!actor || typeof actor.staffId !== "string") return { ok: false, error: "Not allowed" };
  const actorRec = await getUser(actor.staffId);
  if (!actorRec || actorRec.status !== "active" || actorRec.mustChangePassword) return { ok: false, error: "Not allowed" };
  const isAdmin = actorRec.role === "admin";
  if (!isAdmin && !(actorRec.role === "manager" || actorRec.isLineManager)) return { ok: false, error: "Not allowed" };
  if (isAdmin) await assertAdmin(actor);

  const target = await getUser(String(staffId).trim());
  if (!target || target.status !== "active") return { ok: false, error: "Staff member not found" };
  if (!isAdmin && (target.unit !== actorRec.unit || target.staffId === actorRec.staffId)) return { ok: false, error: "You can only assign learning time to people in your own unit" };
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) return { ok: false, error: "Choose between 5 and 600 minutes" };

  const policy = await getConfig("workFirst");
  const weekStart = weekStartOf(localTime(now, effectivePolicy(policy, target.unit).timezone).date);
  const already = (await assignedSeconds(target.staffId, weekStart)) / 60;
  if (already + minutes > policy.assignedLearningMinutesPerWeek) {
    return { ok: false, error: `That would exceed the weekly limit of ${policy.assignedLearningMinutesPerWeek} minutes (${Math.round(already)} already assigned).` };
  }
  const id = `${target.staffId}:${weekStart}:${randomBytes(4).toString("hex")}`;
  await getStore().put<AssignmentDoc>("learning_assignments", id, { id, staffId: target.staffId, weekStart, minutes, assignedBy: actorRec.staffId, at: now });
  await audit(actorRec.staffId, "learning_assigned", target.staffId, { minutes, weekStart }, now);
  return { ok: true, minutesThisWeek: Math.round(already + minutes) };
}
