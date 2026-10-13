import { beforeEach, describe, expect, it } from "vitest";
import { deleteAnnouncement, listAnnouncements, listNotices, markAllRead, notify, postAnnouncement, unreadCount, MAX_NOTICES } from "@/lib/server/notices/service";
import { getGameState } from "@/lib/server/game/service";
import { submitConcern, updateConcern } from "@/lib/server/concerns/service";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const admin = { staffId: "MS0001", role: "admin" as const, name: "Admin" };
const player = { staffId: "MS1001", role: "player" as const, unit: "cx", name: "Tolu" };

describe("updates", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("adds updates newest first, counts unread, and marks them read", async () => {
    await notify("MS1001", { icon: "🎯", text: "First", tone: "good" }, NOW);
    await notify("MS1001", { icon: "🎁", text: "Second" }, NOW + 1000);
    const list = await listNotices(player);
    expect(list.map((n) => n.text)).toEqual(["Second", "First"]);
    expect(list[1]).toMatchObject({ tone: "good", read: false, icon: "🎯" });
    expect(list[0].tone).toBe("info");
    expect(await unreadCount(player)).toBe(2);
    expect((await getGameState(player, NOW)).unread).toBe(2);
    await markAllRead(player);
    expect(await unreadCount(player)).toBe(0);
    expect((await listNotices(player)).every((n) => n.read)).toBe(true);
  });

  it("keeps updates private to the person, and capped", async () => {
    await notify("MS1002", { icon: "🎯", text: "Not yours" }, NOW);
    expect(await listNotices(player)).toEqual([]);
    for (let i = 0; i < MAX_NOTICES + 20; i++) await notify("MS1001", { icon: "🔔", text: `n${i}` }, NOW + i);
    const list = await listNotices(player);
    expect(list).toHaveLength(MAX_NOTICES);
    expect(list[0].text).toBe(`n${MAX_NOTICES + 19}`);
  });

  it("cleans the text and never throws", async () => {
    await notify("MS1001", { icon: "x".repeat(50), text: "line one\nline two\u0000 " + "y".repeat(500) }, NOW);
    const [n] = await listNotices(player);
    expect(n.icon.length).toBeLessThanOrEqual(8);
    expect(n.text).not.toMatch(/[\n\u0000]/);
    expect(n.text.length).toBeLessThanOrEqual(300);
    await expect(notify("../../x", { icon: "x", text: "y" })).resolves.toBeUndefined();
  });

  it("tells the reporter when their concern changes status", async () => {
    const r = await submitConcern({ ...player, unit: "cx" }, { category: "harassment", description: "A colleague kept sending me unwelcome messages after I asked them to stop.", about: "", occurredAt: NOW - 3_600_000, files: [] }, NOW);
    if (!r.ok) throw new Error("setup");
    await updateConcern(admin, r.id, "in_review", "", NOW + 1000);
    await updateConcern(admin, r.id, "in_review", "A note only", NOW + 2000); // same status: no second update
    const texts = (await listNotices(player)).map((n) => n.text);
    expect(texts).toEqual([`Your report ${r.number} is now in review.`]);
  });
});

describe("announcements", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("only an admin can post or remove, and everyone can read the newest first", async () => {
    await expect(postAnnouncement(player, "Hello", "A message for everyone")).rejects.toThrow("Forbidden");
    expect((await postAnnouncement(admin, "Office closed Friday", "The office closes at noon on Friday.", NOW)).ok).toBe(true);
    expect((await postAnnouncement(admin, "Welcome", "Welcome to MeriQuest, colleagues.", NOW + 1000)).ok).toBe(true);
    const list = await listAnnouncements();
    expect(list.map((a) => a.title)).toEqual(["Welcome", "Office closed Friday"]);
    await expect(deleteAnnouncement(player, list[0].id)).rejects.toThrow("Forbidden");
    expect((await deleteAnnouncement(admin, list[0].id)).ok).toBe(true);
    expect((await listAnnouncements()).map((a) => a.title)).toEqual(["Office closed Friday"]);
  });

  it("refuses empty or odd input and ids that are not real", async () => {
    for (const [t, b] of [["", "Body text here"], ["Hi", ""], ["Title", "abc"], [5, "Body text here"], ["Title", null]] as [unknown, unknown][]) {
      expect(await postAnnouncement(admin, t, b)).toMatchObject({ ok: false });
    }
    for (const bad of ["../../audit", "", 5, null, "x".repeat(50)]) expect(await deleteAnnouncement(admin, bad)).toMatchObject({ ok: false });
  });
});
