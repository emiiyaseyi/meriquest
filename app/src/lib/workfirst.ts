import type { z } from "zod";
import type { workFirstSchema } from "@/lib/server/config/definitions";

/**
 * Work First engine (RULEBOOK §2.1). Pure functions: no I/O, no clock reads, so every rule can be
 * unit tested.
 *
 * Current rule (owner, 13 Oct 2026): people may play during working hours, but only for a limited time
 * at once (default 30 minutes, then a 2-hour pause). Both numbers are admin settings. The older
 * "closed in core hours, open only in windows" behaviour is kept behind the `restrictToWindows` setting.
 */
export type WorkFirstPolicy = z.infer<typeof workFirstSchema>;
export type Activity = "world" | "learning";

export type Code =
  | "ok"
  | "disabled" // policy switched off: no restriction
  | "admin_preview" // an admin previewing the game (policy exempts admins)
  | "core_hours"
  | "blackout"
  | "outside_window"
  | "daily_cap"
  | "window_cap"
  | "session_pause" // the session allowance is used up: take a break
  | "learning_not_assigned";

export interface Decision {
  allowed: boolean;
  code: Code;
  message: string;
  /** Seconds the player may continue right now, or null when unlimited. */
  remainingSeconds: number | null;
  /** True once the daily nudge threshold is reached (still allowed). */
  nudge: boolean;
  /** Weekly soft cap reached: a gentle warning, never a block. */
  weeklySoftCapReached: boolean;
  windowId: string | null;
  isWorkday: boolean;
  /** When play reopens (epoch ms) after a session pause. */
  resumeAt?: number;
}

export interface LocalTime {
  date: string; // YYYY-MM-DD in the policy time zone
  dow: number; // 0 = Sunday .. 6 = Saturday
  minutes: number; // minutes since local midnight
}

const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localTime(now: number, timeZone: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    dow: DOW[get("weekday")] ?? 0,
    minutes: hour * 60 + Number(get("minute")),
  };
}

/** A friendly heading for the screen shown when play is closed. */
export function closedTitle(code: Code): string {
  if (code === "session_pause") return "Time for a break";
  if (code === "blackout") return "A busy period";
  return "Work first";
}

export const hhmm = (s: string): number => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

/** The policy for a unit: base policy with that unit's overrides applied. */
export function effectivePolicy(policy: WorkFirstPolicy, unit: string): WorkFirstPolicy {
  const o = Object.prototype.hasOwnProperty.call(policy.unitOverrides, unit) ? policy.unitOverrides[unit] : undefined;
  if (!o) return policy;
  return {
    ...policy,
    coreHours: o.coreHours ?? policy.coreHours,
    dailyCapWorkdayMinutes: o.dailyCapWorkdayMinutes ?? policy.dailyCapWorkdayMinutes,
    dailyCapWeekendMinutes: o.dailyCapWeekendMinutes ?? policy.dailyCapWeekendMinutes,
  };
}

export interface Usage {
  todaySeconds: number;
  weekSeconds: number;
  windowSeconds: Record<string, number>;
  /** Seconds of learning done inside core hours this week (counted against assigned learning time). */
  learningCoreSecondsWeek: number;
}

export const EMPTY_USAGE: Usage = { todaySeconds: 0, weekSeconds: 0, windowSeconds: {}, learningCoreSecondsWeek: 0 };

/** Play time used in the current session allowance, and when play last happened. */
export interface SessionState {
  usedSeconds: number;
  lastPlayAt: number | null; // epoch ms of the last credited play
}
export const NO_SESSION: SessionState = { usedSeconds: 0, lastPlayAt: null };

/**
 * The allowance in force right now. If the person has been away for at least the pause length, the
 * allowance starts fresh. Used by both the decision and the server's crediting so they always agree.
 */
export function currentSession(p: Pick<WorkFirstPolicy, "sessionLimit">, s: SessionState | undefined, now: number): SessionState {
  const cur = s ?? NO_SESSION;
  if (cur.lastPlayAt !== null && now - cur.lastPlayAt >= p.sessionLimit.pauseMinutes * 60_000) return NO_SESSION;
  return cur;
}

function clockText(epoch: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(epoch));
}

export function inBlackout(policy: WorkFirstPolicy, date: string): string | null {
  const b = policy.blackoutPeriods.find((p) => date >= p.from && date <= p.to);
  return b ? b.label : null;
}

function base(p: WorkFirstPolicy, lt: LocalTime): { holiday: boolean; isWorkday: boolean; inCore: boolean; effDow: number } {
  const holiday = p.publicHolidays.includes(lt.date);
  const isWorkday = !holiday && p.coreHours.days.includes(lt.dow);
  const inCore = isWorkday && lt.minutes >= hhmm(p.coreHours.start) && lt.minutes < hhmm(p.coreHours.end);
  // A public holiday behaves like a Sunday for windows and caps.
  return { holiday, isWorkday, inCore, effDow: holiday ? 0 : lt.dow };
}

export function evaluate(
  rawPolicy: WorkFirstPolicy,
  ctx: { unit: string; now: number; usage: Usage; assignedLearningSeconds: number; session?: SessionState },
  activity: Activity,
): Decision {
  const p = effectivePolicy(rawPolicy, ctx.unit);
  const lt = localTime(ctx.now, p.timezone);
  const { isWorkday, inCore, effDow } = base(p, lt);

  const dailyCap = (isWorkday ? p.dailyCapWorkdayMinutes : p.dailyCapWeekendMinutes) * 60;
  const nudge = dailyCap > 0 && ctx.usage.todaySeconds >= p.nudgeAtMinutes * 60;
  const weeklySoftCapReached = p.weeklySoftCapMinutes > 0 && ctx.usage.weekSeconds >= p.weeklySoftCapMinutes * 60;
  const common = { nudge, weeklySoftCapReached, isWorkday } as const;

  const decide = (allowed: boolean, code: Code, message: string, remainingSeconds: number | null, windowId: string | null = null): Decision => ({
    allowed,
    code,
    message,
    remainingSeconds: remainingSeconds === null ? null : Math.max(0, Math.floor(remainingSeconds)),
    windowId,
    ...common,
  });

  if (!p.enabled) return decide(true, "disabled", "No play restrictions are set.", null);

  const blackout = inBlackout(p, lt.date);
  const assignedLeft = Math.max(0, ctx.assignedLearningSeconds - ctx.usage.learningCoreSecondsWeek);
  // A window can open inside core hours only when it is explicitly flagged (lunch). Every other
  // window is ignored during core hours, so a unit with different core hours is never opened by mistake.
  const win = p.windows.find(
    (w) => w.days.includes(effDow) && lt.minutes >= hhmm(w.start) && lt.minutes < hhmm(w.end) && (!inCore || w.duringCoreHours === true),
  );

  if (activity === "learning") {
    if (!p.restrictToWindows) return decide(true, "ok", "Learning is open.", null); // working hours are not enforced
    if (inCore) {
      // Strict mode, inside core hours: assigned learning time first; otherwise only an open window (e.g. lunch).
      if (assignedLeft > 0) return decide(true, "ok", "Assigned learning time.", assignedLeft);
      if (!win) return decide(false, "learning_not_assigned", "Working hours: learning is only open when your manager or L&D has assigned time.", 0);
    }
    // Owner decision (13 Oct 2026): learning may happen outside work hours, including blackout periods.
    if (!inCore && p.learningAllowedOutsideCoreHours) return decide(true, "ok", "Learning is open outside working hours.", null);
    // Otherwise learning follows the same windows as the world (falls through below).
  }

  if (blackout) return decide(false, "blackout", `Work first: ${blackout} is a busy period, so play is paused.`, 0);

  let remaining: number | null = null;
  let windowId: string | null = null;
  let capApplies = p.dailyCapEnabled;

  if (p.restrictToWindows) {
    if (!win) {
      return inCore
        ? decide(false, "core_hours", "Work first: the game opens after working hours.", 0)
        : decide(false, "outside_window", "Outside play hours. Check the play windows.", 0);
    }
    windowId = win.id;
    remaining = (hhmm(win.end) - lt.minutes) * 60;
    if (win.maxMinutes !== undefined) {
      const winLeft = win.maxMinutes * 60 - (ctx.usage.windowSeconds[win.id] ?? 0);
      if (winLeft <= 0) return decide(false, "window_cap", `You have used the ${win.label.toLowerCase()} allowance.`, 0, win.id);
      remaining = Math.min(remaining, winLeft);
    }
    capApplies = true; // in strict mode the daily cap always applies
  }

  if (capApplies) {
    const dayLeft = dailyCap - ctx.usage.todaySeconds;
    if (dailyCap > 0 ? dayLeft <= 0 : true) return decide(false, "daily_cap", "You have reached today's play limit. See you tomorrow.", 0, windowId);
    remaining = remaining === null ? dayLeft : Math.min(remaining, dayLeft);
  }

  // The session limit is for working hours only (owner decision, 13 Oct 2026): after 4:30 pm and before 8:30 am there is none
  if (p.sessionLimit.enabled && (p.sessionLimit.onlyInCoreHours === false || inCore)) {
    const s = currentSession(p, ctx.session, ctx.now);
    const left = p.sessionLimit.maxMinutes * 60 - s.usedSeconds;
    if (left <= 0) {
      const resumeAt = (s.lastPlayAt ?? ctx.now) + p.sessionLimit.pauseMinutes * 60_000;
      return {
        ...decide(false, "session_pause", `You have played ${p.sessionLimit.maxMinutes} minute${p.sessionLimit.maxMinutes === 1 ? "" : "s"}. Take a break and come back at ${clockText(resumeAt, p.timezone)}.`, 0, windowId),
        resumeAt,
      };
    }
    remaining = remaining === null ? left : Math.min(remaining, left);
  }
  return decide(true, "ok", "Play is open.", remaining, windowId);
}
