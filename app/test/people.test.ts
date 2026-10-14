import { beforeEach, describe, expect, it } from "vitest";
import { directory, getKudos, giveKudos, myRole } from "@/lib/server/people/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { kudosSchema } from "@/lib/server/config/definitions";
import { DEFAULT_KUDOS } from "@/lib/server/config/kudos-content";
import { listNotices } from "@/lib/server/notices/service";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");

describe("people apps", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("ships valid kudos settings", () => {
    expect(kudosSchema.safeParse(DEFAULT_KUDOS).success).toBe(true);
  });

  it("lists active colleagues by name or unit and never shows an email", async () => {
    const me = await dto("MS1001");
    const all = await directory(me, "", "");
    expect(all.people.length).toBeGreaterThan(0);
    expect(all.people.some((p) => p.staffId === "MS1001")).toBe(false);
    expect(JSON.stringify(all)).not.toContain("@");
    const first = all.people[0];
    const byName = await directory(me, first.name.slice(0, 4), "");
    expect(byName.people.some((p) => p.staffId === first.staffId)).toBe(true);
    expect((await directory(me, "", "no-such-unit")).people).toHaveLength(0);
    expect((await directory(me, { bad: 1 }, 42)).people.length).toBe(all.people.length);
  });

  it("sends kudos without taking points from the giver, and awards the receiver up to the daily cap", async () => {
    const giver = await dto("MS1001");
    const before = (await getOrCreatePlayer(giver, NOW)).points;
    const r = await giveKudos(giver, "MS1003", "team-player", "Thanks for the help", NOW);
    expect(r.ok).toBe(true);
    expect((await getOrCreatePlayer(giver, NOW)).points).toBe(before);
    expect((await getOrCreatePlayer(await dto("MS1003"), NOW)).points).toBe(DEFAULT_KUDOS.settings.receiverPoints);
    const inbox = await getKudos(await dto("MS1003"), NOW);
    expect(inbox.total).toBe(1);
    expect(inbox.received[0]).toMatchObject({ from: giver.name, value: "team-player", note: "Thanks for the help" });
    expect((await listNotices(await dto("MS1003"))).some((n) => n.text.includes("kudos"))).toBe(true);
  });

  it("refuses yourself, a repeat on the same day, an unknown kind, a bad person and a link in the note", async () => {
    const giver = await dto("MS1001");
    expect((await giveKudos(giver, "MS1001", "team-player", "", NOW)).ok).toBe(false);
    expect((await giveKudos(giver, "MS1003", "nonsense", "", NOW)).ok).toBe(false);
    expect((await giveKudos(giver, "../x", "team-player", "", NOW)).ok).toBe(false);
    expect((await giveKudos(giver, "MS9999", "team-player", "", NOW)).ok).toBe(false);
    expect((await giveKudos(giver, "MS1003", "team-player", "see http://evil.example", NOW)).ok).toBe(false);
    expect((await giveKudos(giver, "MS1003", "team-player", "", NOW)).ok).toBe(true);
    expect((await giveKudos(giver, "MS1003", "integrity", "", NOW + 1000)).ok).toBe(false); // same colleague, same day
  });

  it("limits how many a person can give each day, and resets the next day", async () => {
    const giver = await dto("MS1001");
    const others = ["MS1002", "MS1003", "MS1004", "MS2001"];
    let sent = 0;
    for (const id of others) if ((await giveKudos(giver, id, "great-help", "", NOW)).ok) sent++;
    expect(sent).toBe(DEFAULT_KUDOS.settings.perDay);
    expect((await getKudos(giver, NOW)).leftToday).toBe(0);
    expect((await giveKudos(giver, others[others.length - 1], "great-help", "", NOW + 86_400_000)).ok).toBe(true);
  });

  it("shows a person their role, skills and the courses for their unit", async () => {
    const r = await myRole(await dto("MS1001"), NOW);
    expect(r.unit).toBe("cx");
    expect(r.skills.length).toBeGreaterThan(0);
    expect(r.courses.length).toBeGreaterThan(0);
  });
});
