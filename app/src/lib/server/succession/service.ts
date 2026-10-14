import "server-only";
import { getStore } from "../store";
import { audit } from "../audit";
import { getConfig } from "../config/registry";
import { assertArea } from "../auth/permissions";
import { buildReport } from "../reports/service";
import { getUser } from "../auth/users";
import { withStats } from "@/lib/stats";
import type { UserDTO, UserRecord } from "../types";

/**
 * Succession planning: for each line manager's role, who could step into it and how soon. Suggestions come from people
 * in the same unit with enough years at Meristem, ranked by leadership runs, certificates and lessons passed. Admins and
 * the learning team record the nominations. A person is never told they are on a list from this screen.
 */
export type Readiness = "now" | "1-2" | "3+";
export const READINESS: readonly Readiness[] = ["now", "1-2", "3+"];
export const READINESS_LABEL: Record<Readiness, string> = { now: "Ready now", "1-2": "Ready in 1 to 2 years", "3+": "Ready in 3 or more years" };

export interface Nomination {
  id: string; // incumbent:successor
  incumbent: string;
  successor: string;
  readiness: Readiness;
  note: string;
  by: string;
  at: number;
}

export interface Candidate {
  staffId: string;
  name: string;
  title: string;
  tenureYears: number;
  score: number;
  leadRuns: number;
  leadGreat: number;
  certificates: number;
  lessonsPassed: number;
}

export interface RoleRow {
  incumbent: { staffId: string; name: string; title: string; unit: string; tenureYears: number; leadershipDone: boolean };
  nominees: (Nomination & { name: string; title: string })[];
  suggestions: Candidate[];
}

export interface SuccessionView {
  minTenure: number;
  roles: RoleRow[];
  /** Line managers who have not finished the required leadership simulator. */
  leadershipDue: { staffId: string; name: string; unit: string }[];
}

const NOTE_MAX = 200;

export async function getSuccession(actor: Pick<UserDTO, "role">, now: number = Date.now()): Promise<SuccessionView> {
  assertArea(actor, "succession");
  const [users, report, nominations, lead] = await Promise.all([getStore().list<UserRecord>("users"), buildReport(now), getStore().list<Nomination>("succession"), getConfig("leadership")]);
  const minTenure = lead.settings.successionMinTenure;
  const rows = new Map(report.people.map((p) => [p.staffId, p]));
  const dueMs = lead.settings.leadershipRefreshDays * 86_400_000;
  const stats = await Promise.all(users.map(async (u) => [u.staffId, (await getStore().get<{ stats?: Parameters<typeof withStats>[0] }>("players", u.staffId))?.stats] as const));
  const statBy = new Map(stats.map(([id, s]) => [id, withStats(s)]));
  const done = (id: string) => {
    const s = statBy.get(id);
    return !!s?.leadLastAt && now - s.leadLastAt <= dueMs;
  };
  const managers = users.filter((u) => u.status === "active" && u.isLineManager).sort((a, b) => a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name));
  const roles: RoleRow[] = managers.map((m) => {
    const nominees = nominations
      .filter((n) => n.incumbent === m.staffId)
      .map((n) => ({ ...n, name: users.find((u) => u.staffId === n.successor)?.name ?? n.successor, title: users.find((u) => u.staffId === n.successor)?.title ?? "" }))
      .sort((a, b) => READINESS.indexOf(a.readiness) - READINESS.indexOf(b.readiness));
    const nominated = new Set(nominees.map((n) => n.successor));
    const suggestions: Candidate[] = users
      .filter((u) => u.status === "active" && u.unit === m.unit && u.staffId !== m.staffId && !u.isLineManager && u.tenureYears >= minTenure && !nominated.has(u.staffId))
      .map((u) => {
        const st = statBy.get(u.staffId) ?? withStats(undefined);
        const r = rows.get(u.staffId);
        const score = st.leadGreat * 5 + st.leadGood * 3 + st.leadRuns + (r?.certificates ?? 0) * 3 + Math.min(20, r?.lessonsPassed ?? 0) * 0.5;
        return { staffId: u.staffId, name: u.name, title: u.title, tenureYears: u.tenureYears, score: Math.round(score * 10) / 10, leadRuns: st.leadRuns, leadGreat: st.leadGreat, certificates: r?.certificates ?? 0, lessonsPassed: r?.lessonsPassed ?? 0 };
      })
      .sort((a, b) => b.score - a.score || b.tenureYears - a.tenureYears)
      .slice(0, 5);
    return { incumbent: { staffId: m.staffId, name: m.name, title: m.title, unit: m.unit, tenureYears: m.tenureYears, leadershipDone: done(m.staffId) }, nominees, suggestions };
  });
  return { minTenure, roles, leadershipDue: managers.filter((m) => !done(m.staffId)).map((m) => ({ staffId: m.staffId, name: m.name, unit: m.unit })) };
}

export type NominateResult = { ok: true } | { ok: false; error: string };

export async function nominate(actor: Pick<UserDTO, "staffId" | "role">, incumbent: unknown, successor: unknown, readiness: unknown, note: unknown, now: number = Date.now()): Promise<NominateResult> {
  assertArea(actor, "succession");
  if (typeof incumbent !== "string" || typeof successor !== "string") return { ok: false, error: "Choose a role and a person." };
  if (typeof readiness !== "string" || !(READINESS as readonly string[]).includes(readiness)) return { ok: false, error: "Choose how soon they could be ready." };
  const [inc, suc] = await Promise.all([getUser(incumbent.trim()), getUser(successor.trim())]);
  if (!inc || !inc.isLineManager || inc.status !== "active") return { ok: false, error: "That role is not a line manager's role." };
  if (!suc || suc.status !== "active") return { ok: false, error: "That person was not found." };
  if (suc.staffId === inc.staffId) return { ok: false, error: "A person cannot succeed themselves." };
  const lead = await getConfig("leadership");
  if (suc.tenureYears < lead.settings.successionMinTenure) return { ok: false, error: `Successors need at least ${lead.settings.successionMinTenure} years at Meristem.` };
  const text = typeof note === "string" ? note.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, NOTE_MAX) : "";
  const id = `${inc.staffId}:${suc.staffId}`;
  await getStore().put<Nomination>("succession", id, { id, incumbent: inc.staffId, successor: suc.staffId, readiness: readiness as Readiness, note: text, by: actor.staffId, at: now });
  await audit(actor.staffId, "succession_nominated", inc.staffId, { successor: suc.staffId, readiness }, now);
  return { ok: true };
}

export async function removeNomination(actor: Pick<UserDTO, "staffId" | "role">, id: unknown, now: number = Date.now()): Promise<NominateResult> {
  assertArea(actor, "succession");
  if (typeof id !== "string" || !/^[A-Za-z0-9]{1,20}:[A-Za-z0-9]{1,20}$/.test(id)) return { ok: false, error: "That nomination does not exist." };
  await getStore().delete("succession", id);
  await audit(actor.staffId, "succession_removed", id, undefined, now);
  return { ok: true };
}
