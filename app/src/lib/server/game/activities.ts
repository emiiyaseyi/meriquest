import "server-only";
import { getConfig } from "../config/registry";
import { getStore } from "../store";
import type { UserDTO } from "../types";
import { playStatus } from "../workfirst/service";
import { getOrCreatePlayer, type PlayerRecord } from "../world/service";
import { getGameState, perform, type GameState } from "./service";
import { getScene } from "@/lib/world/scenes";
import { effectTags } from "@/lib/game";

type User = Pick<UserDTO, "staffId" | "unit" | "role">;
type Room = Awaited<ReturnType<typeof getConfig<"locations">>>["rooms"][number];
type Activity = Room["zones"][number]["activities"][number];

export interface ActivityView {
  id: string;
  label: string;
  icon: string;
  seconds: number;
  tags: string[];
  points: number;
  /** Merit points it costs, 0 when free. */
  cost: number;
  /** When it can be done again, if it cannot be done now. */
  readyAt: number | null;
}

export interface LocationView {
  scene: string;
  name: string;
  building: string;
  status: string;
  zones: { id: string; label: string; icon: string; activities: ActivityView[] }[];
  running: { id: string; label: string; endsAt: number } | null;
}

export type ActivityResult = { ok: true; location: LocationView; /** Only when the needs changed (an activity was finished). */ state?: GameState; message: string } | { ok: false; error: string };

const find = (room: Room | undefined, id: string): Activity | undefined => room?.zones.flatMap((z) => z.activities).find((a) => a.id === id);

async function roomOf(scene: string): Promise<Room | undefined> {
  return (await getConfig("locations")).rooms.find((r) => r.scene === scene);
}

function viewOf(p: PlayerRecord, room: Room | undefined, now: number): LocationView | null {
  const scene = getScene(p.scene);
  if (!scene || !room) return null;
  const running = p.activity && p.activity.endsAt > 0 ? find(room, p.activity.key) : undefined;
  return {
    scene: scene.id,
    name: scene.name,
    building: scene.building,
    status: room.status,
    zones: room.zones.map((z) => ({
      id: z.id,
      label: z.label,
      icon: z.icon,
      activities: z.activities.map((a) => {
        const until = p.cooldowns?.[`act:${a.id}`] ?? 0;
        return { id: a.id, label: a.label, icon: a.icon, seconds: a.seconds, tags: [...effectTags(a.effects), ...(a.points > 0 ? [`+${a.points} pts`] : []), ...(a.cost > 0 ? [`${a.cost} pts`] : [])], points: a.points, cost: a.cost, readyAt: until > now ? until : null };
      }),
    })),
    running: running && p.activity ? { id: running.id, label: running.label, endsAt: p.activity.endsAt } : null,
  };
}

/** The location bar for the room the person is in, or null when the room has none. */
export async function getLocation(user: Pick<UserDTO, "staffId">, now: number = Date.now()): Promise<LocationView | null> {
  const p = await getOrCreatePlayer(user, now);
  return viewOf(p, await roomOf(p.scene), now);
}

async function guard(user: User, now: number): Promise<string | null> {
  const d = await playStatus(user, "world", now);
  return d.allowed ? null : d.message;
}

async function result(user: User, now: number, message: string, withState = true): Promise<ActivityResult> {
  const p = await getOrCreatePlayer(user, now);
  const location = viewOf(p, await roomOf(p.scene), now);
  if (!location) return { ok: false, error: "There is nothing to do here." };
  return { ok: true, location, ...(withState ? { state: await getGameState(user, now) } : {}), message };
}

/** Start a timed activity. The time is kept on the server, so it cannot be hurried. */
export async function startActivity(user: User, activityId: unknown, now: number = Date.now()): Promise<ActivityResult> {
  const blocked = await guard(user, now);
  if (blocked) return { ok: false, error: blocked };
  if (typeof activityId !== "string" || activityId.length > 41) return { ok: false, error: "That is not possible." };
  const player = await getOrCreatePlayer(user, now);
  const act = find(await roomOf(player.scene), activityId);
  if (!act) return { ok: false, error: "That activity is not in this room." };
  let refusal: string | null = null;
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur) return cur;
    if (cur.activity && cur.activity.endsAt > now - 60_000) {
      refusal = "Finish what you are doing first.";
      return cur;
    }
    if (act.cost > 0 && cur.points < act.cost) {
      refusal = `You need ${act.cost} Merit points for that.`;
      return cur;
    }
    const until = cur.cooldowns?.[`act:${act.id}`] ?? 0;
    if (until > now) {
      refusal = `Not just yet. Try again in ${Math.max(1, Math.ceil((until - now) / 60_000))} minute${Math.ceil((until - now) / 60_000) === 1 ? "" : "s"}.`;
      return cur;
    }
    return { ...cur, activity: { key: act.id, endsAt: now + act.seconds * 1000 }, updatedAt: now };
  });
  if (refusal) return { ok: false, error: refusal };
  return result(user, now, `${act.label}…`, false);
}

/** Finish the running activity once its time is up, and collect the effects and points. */
export async function completeActivity(user: User, now: number = Date.now()): Promise<ActivityResult> {
  const blocked = await guard(user, now);
  if (blocked) return { ok: false, error: blocked };
  const player = await getOrCreatePlayer(user, now);
  const run = player.activity;
  const act = run ? find(await roomOf(player.scene), run.key) : undefined;
  if (!run || !act) return { ok: false, error: "You are not doing anything right now." };
  if (now < run.endsAt) return { ok: false, error: `Not finished yet. ${Math.max(1, Math.ceil((run.endsAt - now) / 1000))} s to go.` };
  // Clear it first, so it can only be collected once
  let taken = false;
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur?.activity || cur.activity.key !== run.key || cur.activity.endsAt !== run.endsAt) return cur;
    taken = true;
    const { activity: _a, ...rest } = cur;
    void _a;
    return rest as PlayerRecord;
  });
  if (!taken) return { ok: false, error: "You are not doing anything right now." };
  const refusal = await perform(user, { key: `act:${act.id}`, effects: act.effects, cost: act.cost, gain: act.points, cooldownMinutes: act.cooldownMinutes, feeling: act.feeling, skill: act.skill, event: act.event ?? act.id }, now);
  if (refusal) return { ok: false, error: refusal };
  return result(user, now, `${act.label}. ${[...effectTags(act.effects), ...(act.points > 0 ? [`+${act.points} Merit points`] : [])].join(" ")}`.trim());
}

export async function cancelActivity(user: User, now: number = Date.now()): Promise<ActivityResult> {
  await getStore().update<PlayerRecord>("players", user.staffId, (cur) => {
    if (!cur?.activity) return cur;
    const { activity: _a, ...rest } = cur;
    void _a;
    return rest as PlayerRecord;
  });
  return result(user, now, "Stopped.", false);
}
