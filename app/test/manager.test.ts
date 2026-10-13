import { beforeEach, describe, expect, it } from "vitest";
import { assignCourse, getTeam, listMyAssignments, unassignCourse } from "@/lib/server/manager/service";
import { assignLearning } from "@/lib/server/workfirst/service";
import { listNotices } from "@/lib/server/notices/service";
import { listCourseMeta } from "@/lib/server/academy/content";
import { getAcademy } from "@/lib/server/academy/service";
import { getStore } from "@/lib/server/store";
import { dto, freshWorld } from "./helpers";
import type { UserRecord } from "@/lib/server/types";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");

async function ready(staffId: string) {
  await getStore().update<UserRecord>("users", staffId, (cur) => (cur ? { ...cur, mustChangePassword: false } : cur));
}

describe("manager screen", () => {
  beforeEach(async () => {
    await freshWorld();
    await ready("MS1002"); // a line manager in cx
    await ready("MS1001");
    await ready("MS2003"); // a line manager in wealth
    await ready("MS0001");
  });

  it("shows a manager only their own unit, without themselves", async () => {
    const team = await getTeam(await dto("MS1002"), "wealth", NOW); // a manager cannot pick another unit
    expect(team?.unit).toBe("cx");
    expect(team?.people.map((p) => p.staffId).sort()).toEqual(["MS1001", "MS1003"]);
  });

  it("lets an admin look at any unit, and refuses ordinary players", async () => {
    expect((await getTeam(await dto("MS0001"), "wealth", NOW))?.unit).toBe("wealth");
    expect(await getTeam(await dto("MS1001"), undefined, NOW)).toBeNull();
  });

  it("refuses a manager who has not changed their password yet", async () => {
    await getStore().update<UserRecord>("users", "MS1002", (cur) => (cur ? { ...cur, mustChangePassword: true } : cur));
    expect(await getTeam(await dto("MS1002"), undefined, NOW)).toBeNull();
  });

  it("assigns a course with a due date, tells the person, and shows it on their Academy home", async () => {
    const course = (await listCourseMeta())[0];
    const r = await assignCourse(await dto("MS1002"), "MS1001", course.id, "2026-10-31", "Before month end", NOW);
    expect(r.ok).toBe(true);
    const notes = await listNotices(await dto("MS1001"));
    expect(notes[0].text).toContain(course.title);
    const mine = await listMyAssignments("MS1001");
    expect(mine).toEqual([expect.objectContaining({ courseId: course.id, due: "2026-10-31", note: "Before month end", by: "Chiamaka Obi" })]);
    const home = await getAcademy(await dto("MS1001"), NOW);
    expect(home.assigned.map((a) => a.courseId)).toEqual([course.id]);
    const team = await getTeam(await dto("MS1002"), undefined, NOW);
    expect(team?.people.find((p) => p.staffId === "MS1001")?.courses[0]).toMatchObject({ courseId: course.id, done: false });
  });

  it("refuses people from another unit, yourself, bad dates, unknown courses and non-managers", async () => {
    const course = (await listCourseMeta())[0];
    const mgr = await dto("MS1002");
    expect((await assignCourse(mgr, "MS2001", course.id, "", "", NOW)).ok).toBe(false); // wealth person
    expect((await assignCourse(mgr, "MS1002", course.id, "", "", NOW)).ok).toBe(false); // themselves
    expect((await assignCourse(mgr, "MS1001", course.id, "next week", "", NOW)).ok).toBe(false);
    expect((await assignCourse(mgr, "MS1001", "nonsense", "", "", NOW)).ok).toBe(false);
    expect((await assignCourse(await dto("MS1001"), "MS1003", course.id, "", "", NOW)).ok).toBe(false); // a player
    expect((await assignCourse(await dto("MS0001"), "MS2001", course.id, "", "", NOW)).ok).toBe(true); // admin may
  });

  it("can take an assignment back, within the same rules", async () => {
    const course = (await listCourseMeta())[0];
    await assignCourse(await dto("MS1002"), "MS1001", course.id, "", "", NOW);
    expect((await unassignCourse(await dto("MS2003"), "MS1001", course.id)).ok).toBe(false); // another unit's manager
    expect((await unassignCourse(await dto("MS1002"), "MS1001", course.id)).ok).toBe(true);
    expect(await listMyAssignments("MS1001")).toEqual([]);
  });

  it("assigns learning time up to the weekly limit and shows it", async () => {
    const mgr = await dto("MS1002");
    expect((await assignLearning(mgr, "MS1001", 60, NOW)).ok).toBe(true);
    const team = await getTeam(mgr, undefined, NOW);
    expect(team?.people.find((p) => p.staffId === "MS1001")?.assignedMinutes).toBe(60);
    expect((await assignLearning(mgr, "MS1001", 120, NOW)).ok).toBe(false); // the weekly limit is 120
  });
});
