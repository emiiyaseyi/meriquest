import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO, UserRecord } from "../types";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { notify } from "../notices/service";
import { recordEvent } from "../game/missions";
import { getAcademy } from "../academy/service";
import { audit } from "../audit";
import { ROLE_LABEL } from "../auth/permissions";
import { checkMessage, cleanMessage, dmId } from "@/lib/chat";
import { dayKey, skillStanding } from "@/lib/game";

/**
 * The people apps on the Work Phone: Directory, Kudos and My Role. Only real-name staff appear, and only their name,
 * job title and unit: never an email address or a staff password detail. Kudos is a thank-you, not a payment (RULEBOOK §2.11).
 */

export interface DirectoryRow {
  staffId: string;
  name: string;
  title: string;
  unit: string;
  /** The conversation id to message them. */
  conv: string;
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Active colleagues, filtered by a name or title search and by unit. Capped so a screen stays quick. */
export async function directory(user: Pick<UserDTO, "staffId">, q: unknown, unit: unknown): Promise<{ people: DirectoryRow[]; units: string[]; more: boolean }> {
  const term = clip(q, 40).toLowerCase();
  const wantUnit = clip(unit, 30);
  const users = (await getStore().list<UserRecord>("users")).filter((u) => u.status === "active");
  const units = [...new Set(users.map((u) => u.unit))].sort();
  const hits = users
    .filter((u) => u.staffId !== user.staffId && (!wantUnit || u.unit === wantUnit) && (!term || u.name.toLowerCase().includes(term) || u.title.toLowerCase().includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { people: hits.slice(0, 40).map((u) => ({ staffId: u.staffId, name: u.name, title: u.title, unit: u.unit, conv: dmId(user.staffId, u.staffId) })), units, more: hits.length > 40 };
}

/* ------------------------------------------------------------------ Kudos */

interface KudosIn {
  staffId: string;
  received: { fromId: string; from: string; value: string; note: string; at: number }[];
  total: number;
  pointsDay: string;
  pointsToday: number;
}
interface KudosOut {
  staffId: string;
  day: string;
  count: number;
  to: string[];
}

export interface KudosView {
  values: { id: string; label: string; icon: string }[];
  maxNote: number;
  leftToday: number;
  receiverPoints: number;
  received: { from: string; value: string; label: string; icon: string; note: string; at: number }[];
  total: number;
}

export type KudosResult = { ok: true; message: string } | { ok: false; error: string };

async function today(now: number): Promise<string> {
  return dayKey(now, (await getConfig("workFirst")).timezone);
}

export async function getKudos(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<KudosView> {
  const [cfg, day] = await Promise.all([getConfig("kudos"), today(now)]);
  const [inbox, out] = await Promise.all([getStore().get<KudosIn>("kudos_in", user.staffId), getStore().get<KudosOut>("kudos_out", user.staffId)]);
  const byId = new Map(cfg.values.map((v) => [v.id, v]));
  const used = out?.day === day ? out.count : 0;
  return {
    values: cfg.values,
    maxNote: cfg.settings.maxNote,
    leftToday: Math.max(0, cfg.settings.perDay - used),
    receiverPoints: cfg.settings.receiverPoints,
    total: inbox?.total ?? 0,
    received: (inbox?.received ?? []).slice(0, cfg.settings.keep).map((k) => ({ from: k.from, value: k.value, label: byId.get(k.value)?.label ?? k.value, icon: byId.get(k.value)?.icon ?? "🌟", note: k.note, at: k.at })),
  };
}

/** Give a colleague a kudos. The giver pays nothing; the game may award the receiver a few Merit points, up to a daily cap. */
export async function giveKudos(user: Pick<UserDTO, "staffId" | "name">, to: unknown, value: unknown, note: unknown, now: number = Date.now()): Promise<KudosResult> {
  const cfg = await getConfig("kudos");
  if (cfg.settings.perDay === 0) return { ok: false, error: "Kudos is switched off right now." };
  const toId = typeof to === "string" && /^[A-Za-z0-9]{1,20}$/.test(to) ? to.toUpperCase() : "";
  if (!toId) return { ok: false, error: "Choose a colleague." };
  if (toId === user.staffId) return { ok: false, error: "Kudos is for thanking a colleague, not yourself." };
  const kind = cfg.values.find((v) => v.id === value);
  if (!kind) return { ok: false, error: "Choose a kind of kudos." };
  const receiver = await getStore().get<UserRecord>("users", toId);
  if (!receiver || receiver.status !== "active") return { ok: false, error: "That colleague is not available." };

  // A note is optional, but it goes through the same filter as chat
  const text = cleanMessage(note, cfg.settings.maxNote || 1);
  if (text.length > 0) {
    const chat = await getConfig("chat");
    const verdict = checkMessage(text, { blockedWords: chat.blockedWords, blockLinks: true });
    if (!verdict.ok) return { ok: false, error: verdict.reason };
  }
  if (cfg.settings.maxNote === 0 && text.length > 0) return { ok: false, error: "Notes are switched off." };

  const day = await today(now);
  let refusal: string | null = null;
  await getStore().update<KudosOut>("kudos_out", user.staffId, (cur) => {
    const used = cur?.day === day ? cur : { staffId: user.staffId, day, count: 0, to: [] as string[] };
    if (used.count >= cfg.settings.perDay) {
      refusal = `You have given all ${cfg.settings.perDay} of today's kudos. Come back tomorrow.`;
      return cur ?? used;
    }
    if (used.to.includes(toId)) {
      refusal = "You already thanked that colleague today.";
      return cur ?? used;
    }
    return { ...used, count: used.count + 1, to: [...used.to, toId] };
  });
  if (refusal) return { ok: false, error: refusal };

  // The receiver's list, and the points the game awards them (capped per day, never taken from the giver)
  let award = 0;
  await getStore().update<KudosIn>("kudos_in", toId, (cur) => {
    const base: KudosIn = cur ?? { staffId: toId, received: [], total: 0, pointsDay: day, pointsToday: 0 };
    const pointsToday = base.pointsDay === day ? base.pointsToday : 0;
    award = Math.max(0, Math.min(cfg.settings.receiverPoints, cfg.settings.receiverDailyCap - pointsToday));
    return { ...base, received: [{ fromId: user.staffId, from: user.name, value: kind.id, note: text, at: now }, ...base.received].slice(0, cfg.settings.keep), total: base.total + 1, pointsDay: day, pointsToday: pointsToday + award };
  });
  if (award > 0) {
    await getOrCreatePlayer({ staffId: toId }, now);
    await getStore().update<PlayerRecord>("players", toId, (cur) => (cur ? { ...cur, points: cur.points + award, updatedAt: now } : cur));
  }
  await notify(toId, { icon: kind.icon, text: `${user.name} sent you kudos: ${kind.label}.${text ? ` "${text}"` : ""}${award > 0 ? ` +${award} Merit points.` : ""}`, tone: "good" }, now);
  await audit(user.staffId, "kudos.give", toId, { value: kind.id }, now);
  await recordEvent(user.staffId, "kudos", now);
  return { ok: true, message: `Kudos sent to ${receiver.name}.` };
}

/* ------------------------------------------------------------------ My Role */

export interface RoleView {
  name: string;
  title: string;
  unit: string;
  segment: string;
  roleLabel: string;
  isLineManager: boolean;
  tenureYears: number;
  skills: { id: string; label: string; icon: string; level: number }[];
  courses: { id: string; title: string; icon: string; passed: number; lessons: number; certified: boolean }[];
  kudosReceived: number;
}

/** What the person's role is, and what to work on next: the courses for their unit and their skill levels. */
export async function myRole(user: Pick<UserDTO, "staffId" | "name" | "title" | "unit" | "segment" | "role" | "isLineManager" | "tenureYears">, now: number = Date.now()): Promise<RoleView> {
  const [home, gameplay, player, inbox] = await Promise.all([getAcademy(user, now), getConfig("gameplay"), getOrCreatePlayer(user, now), getStore().get<KudosIn>("kudos_in", user.staffId)]);
  return {
    name: user.name,
    title: user.title,
    unit: user.unit,
    segment: String(user.segment),
    roleLabel: ROLE_LABEL[user.role],
    isLineManager: user.isLineManager,
    tenureYears: user.tenureYears,
    skills: gameplay.skills.map((s) => ({ id: s.id, label: s.label, icon: s.icon, level: skillStanding(s, player.skillXp?.[s.id] ?? 0).level })),
    courses: home.courses.filter((c) => c.recommended && !c.certified).slice(0, 6).map((c) => ({ id: c.id, title: c.title, icon: c.icon, passed: c.passed, lessons: c.lessons, certified: c.certified })),
    kudosReceived: inbox?.total ?? 0,
  };
}
