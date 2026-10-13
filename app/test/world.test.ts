import { beforeEach, describe, expect, it } from "vitest";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import { TH, TW, hashString, project, seeded, shade, unproject } from "@/lib/iso/geometry";
import { buildGrid, findPath, hotspotAt, nearestWalkable, portalAt, walkable } from "@/lib/iso/path";
import { computeView, renderScene, screenToTile } from "@/lib/iso/render";
import "@/lib/iso/render-flat";
import { BUILDINGS, FIRST_SCENE, SCENES, getScene } from "@/lib/world/scenes";
import { DEFAULT_NEEDS, cleanLook, cleanNeeds, defaultLook, moodLabel } from "@/lib/world/player";
import type { Scene } from "@/lib/world/types";
import { getOrCreatePlayer, travelByMap, travelByPortal } from "@/lib/server/world/service";
import { playBeat, playStatus } from "@/lib/server/workfirst/service";
import { changePassword } from "@/lib/server/auth/service";
import { setConfig } from "@/lib/server/config/registry";
import { CONFIG } from "@/lib/server/config/definitions";
import { getStore } from "@/lib/server/store";
import { DEFAULT_PW, dto, freshWorld, NEW_PW } from "./helpers";

const lagos = (date: string, hm: string) => Date.parse(`${date}T${hm}:00+01:00`);
const CORE = lagos("2026-10-13", "10:00"); // Tuesday morning: working hours

describe("isometric geometry", () => {
  it("unproject is the exact inverse of project on the floor", () => {
    for (const [x, y] of [[0, 0], [3.5, 2.25], [13, 9], [0.1, 11.9]]) {
      const p = project(x, y);
      const u = unproject(p.x, p.y);
      expect(u.x).toBeCloseTo(x, 9);
      expect(u.y).toBeCloseTo(y, 9);
    }
  });
  it("uses a 2:1 diamond", () => {
    expect(project(1, 0)).toEqual({ x: TW / 2, y: TH / 2 });
    expect(project(0, 1)).toEqual({ x: -TW / 2, y: TH / 2 });
  });
  it("lifting something moves it up the screen", () => {
    expect(project(2, 2, 1).y).toBeLessThan(project(2, 2, 0).y);
  });
  it("shade darkens and lightens, and the random generator is repeatable", () => {
    expect(shade("#808080", 0.5)).toBe("#404040");
    expect(shade("#808080", 1.5)).toBe("#c0c0c0");
    const a = seeded(hashString("moss"));
    const b = seeded(hashString("moss"));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});

describe("pathfinding", () => {
  const grid = (rows: string[]) => ({ cols: rows[0].length, rows: rows.length, blocked: rows.map((r) => [...r].map((c) => c === "#")) });

  it("finds the shortest route and excludes the start", () => {
    const g = grid(["....", "....", "...."]);
    const p = findPath(g, { x: 0, y: 0 }, { x: 3, y: 2 });
    expect(p.at(-1)).toEqual({ x: 3, y: 2 });
    expect(p).toHaveLength(3); // diagonals allowed
    expect(p[0]).not.toEqual({ x: 0, y: 0 });
  });
  it("walks around obstacles", () => {
    const g = grid([".#...", ".#.#.", "...#.", ".###.", "....."]);
    const p = findPath(g, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(p.length).toBeGreaterThan(4);
    for (const t of p) expect(walkable(g, t.x, t.y)).toBe(true);
  });
  it("does not cut corners between two blocked tiles", () => {
    const g = grid([".#", "#."]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 1, y: 1 })).toEqual([]);
  });
  it("returns nothing for unreachable, blocked, identical or out-of-range targets", () => {
    const g = grid([".#.", ".#.", ".#."]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual([]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 99, y: 99 })).toEqual([]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 0.5, y: 0 })).toEqual([]);
  });
  it("finds the nearest walkable tile for a click on furniture", () => {
    const g = grid(["...", ".#.", "..."]);
    expect(nearestWalkable(g, 1, 1)).not.toEqual({ x: 1, y: 1 });
    expect(nearestWalkable(g, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(nearestWalkable(g, -5, 40)).toEqual({ x: 0, y: 2 });
  });
});

describe("every scene is valid and playable", () => {
  const scenes: Scene[] = Object.values(SCENES);

  it("has the four Ikoyi HQ rooms and a valid first scene", () => {
    expect(scenes.map((s) => s.id).sort()).toEqual(["ikoyi-boardroom", "ikoyi-floor", "ikoyi-lobby", "ikoyi-lounge"]);
    expect(getScene(FIRST_SCENE)).toBeDefined();
    expect(getScene("__proto__")).toBeUndefined();
    expect(getScene("constructor")).toBeUndefined();
  });

  it("Ikoyi HQ has Ground, Mezzanine and Floors 1 to 6 (owner, 13 Oct 2026)", () => {
    const labels = BUILDINGS[0].levels.map((l) => l.label);
    expect(labels).toEqual(["Floor 6", "Floor 5", "Floor 4", "Floor 3", "Floor 2", "Floor 1", "Mezzanine floor", "Ground floor"]);
  });

  it("invents no departments for any floor or colleague", () => {
    const text = JSON.stringify(scenes.map((s) => [s.subtitle, s.npcs.map((n) => n.role)]));
    expect(text).not.toMatch(/Advisory|Compliance|Research|Wealth|Investment/);
  });

  describe.each(scenes.map((s) => [s.id, s] as const))("%s", (_id, s) => {
    const g = buildGrid(s);
    const inside = (x: number, y: number, w = 1, d = 1) => x >= 0 && y >= 0 && x + w <= s.cols && y + d <= s.rows;

    it("belongs to a real building and level", () => {
      const b = BUILDINGS.find((x) => x.id === s.building);
      expect(b).toBeDefined();
      expect(b?.levels.some((l) => l.id === s.level)).toBe(true);
    });
    it("keeps every object, person, door and spot inside the room", () => {
      for (const o of s.objects) expect(inside(o.x, o.y, o.w ?? 1, o.d ?? 1), `${o.kind} at ${o.x},${o.y}`).toBe(true);
      for (const n of s.npcs) expect(inside(n.x, n.y), n.name).toBe(true);
      for (const p of s.portals) expect(inside(p.x, p.y, p.w, p.d), p.id).toBe(true);
      for (const h of s.hotspots) expect(inside(h.x, h.y), h.id).toBe(true);
    });
    it("has no two solid objects on the same tile", () => {
      const seen = new Map<string, string>();
      for (const o of s.objects.filter((x) => x.solid !== false)) {
        for (let y = Math.floor(o.y); y < Math.ceil(o.y + (o.d ?? 1)); y++) {
          for (let x = Math.floor(o.x); x < Math.ceil(o.x + (o.w ?? 1)); x++) {
            const k = `${x},${y}`;
            expect(seen.has(k), `${o.kind} overlaps ${seen.get(k)} at ${k}`).toBe(false);
            seen.set(k, o.kind);
          }
        }
      }
    });
    it("never puts a person on solid furniture or two people on one tile", () => {
      const solid = buildGrid({ ...s, npcs: [] });
      const taken = new Set<string>();
      for (const n of s.npcs) {
        expect(walkable(solid, n.x, n.y), `${n.name} stands on furniture`).toBe(true);
        expect(taken.has(`${n.x},${n.y}`), `${n.name} shares a tile`).toBe(false);
        taken.add(`${n.x},${n.y}`);
      }
    });
    it("lets the player start on a walkable tile", () => {
      expect(walkable(g, s.spawn.x, s.spawn.y)).toBe(true);
    });
    it("can reach every door and every spot from the start", () => {
      for (const p of s.portals) {
        const t = { x: p.x, y: p.y };
        expect(walkable(g, t.x, t.y), `${p.id} door tile`).toBe(true);
        expect(findPath(g, s.spawn, t).length > 0 || (s.spawn.x === t.x && s.spawn.y === t.y), `door ${p.id} unreachable`).toBe(true);
      }
      for (const h of s.hotspots) {
        expect(walkable(g, h.x, h.y), `${h.id} spot tile`).toBe(true);
        expect(findPath(g, s.spawn, { x: h.x, y: h.y }).length > 0 || (s.spawn.x === h.x && s.spawn.y === h.y), `spot ${h.id} unreachable`).toBe(true);
      }
    });
    it("has doors that lead somewhere real, arrive on a walkable tile, and lead back", () => {
      for (const p of s.portals) {
        const target = getScene(p.to);
        expect(target, `${p.id} goes to ${p.to}`).toBeDefined();
        if (!target) continue;
        expect(walkable(buildGrid(target), p.arrive.x, p.arrive.y), `${p.id} arrival tile`).toBe(true);
        expect(target.portals.some((b) => b.to === s.id), `${target.id} has no door back to ${s.id}`).toBe(true);
        expect(target.building).toBe(s.building); // same building: no travel step between rooms
      }
    });
    it("looks up its doors and spots by tile", () => {
      for (const p of s.portals) expect(portalAt(s, p.x, p.y)?.id).toBe(p.id);
      for (const h of s.hotspots) expect(hotspotAt(s, h.x, h.y)?.id).toBe(h.id);
      expect(portalAt(s, -1, -1)).toBeUndefined();
    });
    it("has unique door and spot ids", () => {
      expect(new Set(s.portals.map((p) => p.id)).size).toBe(s.portals.length);
      expect(new Set(s.hotspots.map((h) => h.id)).size).toBe(s.hotspots.length);
    });
  });
});

describe("the renderer", () => {
  const logo = readFileSync(new URL("../public/brand/meristem-logo-white.png", import.meta.url));
  const look = defaultLook("MS1001");

  async function draw(scene: Scene, mode: "iso" | "flat", w = 900, h = 560) {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    const img = await loadImage(logo);
    renderScene(ctx as unknown as CanvasRenderingContext2D, scene, {
      mode,
      width: w,
      height: h,
      time: 500,
      logo: img as unknown as CanvasImageSource,
      player: { x: scene.spawn.x, y: scene.spawn.y, fx: 1, fy: 0, walking: true, look, name: "You" },
      hover: { x: 3, y: 3 },
      path: [{ x: 4, y: 4 }],
    });
    const data = ctx.getImageData(0, 0, w, h).data;
    const colours = new Set<number>();
    for (let i = 0; i < data.length; i += 4 * 97) colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return { colours: colours.size, data };
  }

  it.each(Object.values(SCENES).flatMap((s) => (["iso", "flat"] as const).map((m) => [s.id, m, s] as const)))("draws %s in %s mode without errors and with real content", async (_id, mode, scene) => {
    const { colours } = await draw(scene, mode);
    expect(colours).toBeGreaterThan(25); // not a blank or single-colour picture
  });

  it("draws the static layer and the dynamic layer separately", async () => {
    const scene = SCENES[FIRST_SCENE];
    const canvas = createCanvas(900, 560);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    const base = { mode: "iso" as const, width: 900, height: 560, time: 0, player: { x: 5, y: 9, fx: 0, fy: 1, walking: false, look } };
    renderScene(ctx, scene, { ...base, layer: "static" });
    const before = (ctx as unknown as { getImageData: (...a: number[]) => { data: Uint8ClampedArray } }).getImageData(0, 0, 900, 560).data.slice();
    renderScene(ctx, scene, { ...base, layer: "dynamic" });
    const after = (ctx as unknown as { getImageData: (...a: number[]) => { data: Uint8ClampedArray } }).getImageData(0, 0, 900, 560).data;
    let changed = 0;
    for (let i = 0; i < after.length; i += 4) if (before[i] !== after[i] || before[i + 1] !== after[i + 1]) changed++;
    expect(changed).toBeGreaterThan(500); // furniture and people were added on top
  });

  it("maps a screen click back to the tile that was drawn there", () => {
    for (const mode of ["iso", "flat"] as const) {
      const scene = SCENES["ikoyi-floor"];
      const view = computeView(scene, mode, 1000, 640);
      for (const [tx, ty] of [[2, 3], [9, 5], [14, 11]]) {
        const sx = mode === "flat" ? view.ox + (tx + 0.5) * view.scale : view.ox + project(tx + 0.5, ty + 0.5).x * view.scale;
        const sy = mode === "flat" ? view.oy + (ty + 0.5) * view.scale : view.oy + project(tx + 0.5, ty + 0.5).y * view.scale;
        const t = screenToTile(view, sx, sy);
        expect([Math.floor(t.x), Math.floor(t.y)], `${mode} ${tx},${ty}`).toEqual([tx, ty]);
      }
    }
  });

  it("fits every room inside the screen", () => {
    for (const s of Object.values(SCENES)) {
      for (const [w, h] of [[1280, 720], [800, 600], [390, 700]]) {
        const v = computeView(s, "iso", w, h);
        const corners = [project(0, 0, s.wallHeight), project(s.cols, 0), project(0, s.rows), project(s.cols, s.rows)];
        for (const c of corners) {
          expect(c.x * v.scale + v.ox).toBeGreaterThanOrEqual(-1);
          expect(c.x * v.scale + v.ox).toBeLessThanOrEqual(w + 1);
          expect(c.y * v.scale + v.oy).toBeGreaterThanOrEqual(-1);
          expect(c.y * v.scale + v.oy).toBeLessThanOrEqual(h + 1);
        }
      }
    }
  });
});

describe("player helpers", () => {
  it("gives the same default look every time, and a different one to different people", () => {
    expect(defaultLook("MS1001")).toEqual(defaultLook("MS1001"));
    const looks = new Set(["MS1001", "MS1002", "MS1003", "MS2001", "MS2002", "MS3001"].map((id) => JSON.stringify(defaultLook(id))));
    expect(looks.size).toBeGreaterThan(2);
  });
  it("only accepts a stored look when every field is valid", () => {
    const fb = defaultLook("MS1001");
    expect(cleanLook(null, fb)).toEqual(fb);
    expect(cleanLook({ skin: "red", hair: "#000000", top: "#2d5d41", pants: "#111111", hairStyle: "afro" }, fb).skin).toBe(fb.skin);
    expect(cleanLook({ skin: "#8a5a3c", hair: "#000000", top: "<script>", pants: "#111111", hairStyle: "mohawk" }, fb)).toMatchObject({ skin: "#8a5a3c", top: fb.top, hairStyle: fb.hairStyle });
    expect(cleanLook({ skin: "#8a5a3c", hair: "#000000", top: "#2d5d41", pants: "#111111", hairStyle: "afro" }, fb)).toMatchObject({ hairStyle: "afro", top: "#2d5d41" });
  });
  it("keeps the bars between 0 and 100 and fills in anything missing", () => {
    expect(cleanNeeds(null)).toEqual(DEFAULT_NEEDS);
    expect(cleanNeeds({ energy: 500, focus: -5, mood: "x", social: 33.6 })).toEqual({ energy: 100, focus: 0, mood: DEFAULT_NEEDS.mood, social: 34 });
    expect(cleanNeeds({ energy: NaN })).toMatchObject({ energy: DEFAULT_NEEDS.energy });
  });
  it("describes the mood in words", () => {
    expect(moodLabel({ energy: 95, focus: 90, mood: 95, social: 85 })).toBe("Very happy");
    expect(moodLabel({ energy: 5, focus: 10, mood: 20, social: 15 })).toBe("Exhausted");
  });
});

describe("travel and Work First (server rules)", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  const evening = lagos("2026-10-13", "18:00"); // inside the after-hours window

  it("starts new players in the lobby with sensible bars and no points", async () => {
    const p = await getOrCreatePlayer({ staffId: "MS1001" }, evening);
    expect(p).toMatchObject({ scene: FIRST_SCENE, points: 0, needs: DEFAULT_NEEDS });
    expect(p.look).toEqual(defaultLook("MS1001"));
  });

  it("heals a damaged or tampered player record instead of trusting it", async () => {
    await getStore().put("players", "MS1001", { staffId: "MS1001", scene: "../../etc/passwd", look: { skin: "javascript:alert(1)" }, needs: { energy: 9999 }, points: -50, updatedAt: 1 });
    const p = await getOrCreatePlayer({ staffId: "MS1001" }, evening);
    expect(p.scene).toBe(FIRST_SCENE);
    expect(p.needs.energy).toBe(100);
    expect(p.points).toBe(0);
    expect(p.look.skin).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("lets a player use a real door in the room they are in", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, evening);
    const r = await travelByPortal(user, "to-floor", evening);
    expect(r).toEqual({ ok: true, scene: "ikoyi-floor", arrive: SCENES[FIRST_SCENE].portals[0].arrive });
    expect((await getOrCreatePlayer(user, evening)).scene).toBe("ikoyi-floor");
  });

  it("refuses doors that are not in the current room, and non-strings", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, evening);
    for (const bad of ["to-boardroom", "to-lobby", "", "__proto__", "x".repeat(200), 42, null, undefined, {}]) {
      expect(await travelByPortal(user, bad, evening)).toMatchObject({ ok: false });
    }
    expect((await getOrCreatePlayer(user, evening)).scene).toBe(FIRST_SCENE); // never moved
  });

  it("lets a player pick a room on the map within the same building, but not an unknown one", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, evening);
    expect(await travelByMap(user, "ikoyi-boardroom", evening)).toMatchObject({ ok: true, scene: "ikoyi-boardroom" });
    for (const bad of ["yaba-lobby", "", "../x", "__proto__", 7, null]) expect(await travelByMap(user, bad, evening)).toMatchObject({ ok: false });
    expect((await getOrCreatePlayer(user, evening)).scene).toBe("ikoyi-boardroom");
  });

  it("lets players in during working hours by default (owner, 13 Oct 2026)", async () => {
    const user = await dto("MS1001");
    expect(await playStatus(user, "world", CORE)).toMatchObject({ allowed: true, code: "ok", remainingSeconds: 1800 });
    await getOrCreatePlayer(user, CORE);
    expect(await travelByPortal(user, "to-floor", CORE)).toMatchObject({ ok: true });
  });

  it("closes the world in working hours again when the admin turns on restrictToWindows: no travel", async () => {
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
    await setConfig("workFirst", JSON.stringify({ ...CONFIG.workFirst.default, restrictToWindows: true }), "MS0001");
    const user = await dto("MS1001");
    expect(await travelByPortal(user, "to-floor", CORE)).toMatchObject({ ok: false });
    expect(await travelByMap(user, "ikoyi-floor", CORE)).toMatchObject({ ok: false });
    expect(await playStatus(user, "world", CORE)).toMatchObject({ allowed: false, code: "core_hours" });
  });

  it("stops travel when the player's session is used up", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, CORE);
    await getStore().put("play_sessions", "MS1001", { staffId: "MS1001", used: 1800, lastPlayAt: CORE - 60_000, lastBeat: CORE - 60_000, lastActivity: "world" });
    expect(await travelByPortal(user, "to-floor", CORE)).toMatchObject({ ok: false, error: expect.stringContaining("break") });
    expect(await travelByMap(user, "ikoyi-floor", CORE)).toMatchObject({ ok: false });
  });

  it("audits travel", async () => {
    const user = await dto("MS1001");
    await getOrCreatePlayer(user, evening);
    await travelByPortal(user, "to-floor", evening);
    const { recentAudit } = await import("@/lib/server/audit");
    expect((await recentAudit()).some((e) => e.action === "world_travel" && e.target === "ikoyi-floor")).toBe(true);
  });

  describe("admin preview", () => {
    beforeEach(async () => {
      await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
    });

    it("lets an admin in during working hours, with nothing credited", async () => {
      const admin = await dto("MS0001");
      const d = await playStatus(admin, "world", CORE);
      expect(d).toMatchObject({ allowed: true, code: "admin_preview", remainingSeconds: null });
      await playBeat(admin, "world", CORE);
      await playBeat(admin, "world", CORE + 30_000);
      expect(await getStore().list("playtime")).toHaveLength(0);
      expect(await travelByMap(admin, "ikoyi-floor", CORE)).toMatchObject({ ok: true });
    });

    it("does not give players the admin preview: their session limit still applies", async () => {
      const player = await dto("MS1001");
      expect((await playStatus(player, "world", CORE)).code).toBe("ok");
      await getStore().put("play_sessions", "MS1001", { staffId: "MS1001", used: 1800, lastPlayAt: CORE - 1000, lastBeat: CORE - 1000, lastActivity: "world" });
      expect(await playStatus({ ...player, role: "player" }, "world", CORE)).toMatchObject({ allowed: false, code: "session_pause" });
      const admin = await dto("MS0001");
      expect((await playStatus(admin, "world", CORE)).code).toBe("admin_preview");
    });

    it("applies the session limit to admins too when the preview exemption is turned off", async () => {
      await setConfig("workFirst", JSON.stringify({ ...CONFIG.workFirst.default, adminsExempt: false }), "MS0001");
      const admin = await dto("MS0001");
      expect(await playStatus(admin, "world", CORE)).toMatchObject({ allowed: true, code: "ok", remainingSeconds: 1800 });
      await getStore().put("play_sessions", "MS0001", { staffId: "MS0001", used: 1800, lastPlayAt: CORE - 1000, lastBeat: CORE - 1000, lastActivity: "world" });
      expect(await travelByMap(admin, "ikoyi-floor", CORE)).toMatchObject({ ok: false });
    });
  });
});
