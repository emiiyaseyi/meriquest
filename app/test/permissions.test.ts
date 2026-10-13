import { beforeEach, describe, expect, it } from "vitest";
import { AREAS, AREAS_BY_ROLE, assertArea, can } from "@/lib/server/auth/permissions";
import { ROLES } from "@/lib/server/types";
import { listConcerns, updateConcern } from "@/lib/server/concerns/service";
import { deleteAnnouncement, postAnnouncement } from "@/lib/server/notices/service";
import { deleteCourse, saveCourse, blankCourseJson } from "@/lib/server/academy/content";
import { dto, freshWorld } from "./helpers";

describe("roles and areas", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("gives admins every area and ordinary staff and managers none", () => {
    expect(AREAS_BY_ROLE.admin).toEqual(AREAS);
    expect(AREAS_BY_ROLE.player).toEqual([]);
    expect(AREAS_BY_ROLE.manager).toEqual([]);
    for (const r of ROLES) expect(AREAS_BY_ROLE[r]).toBeDefined();
  });

  it("limits the learning team to learning areas and reviewers to concerns", () => {
    expect(AREAS_BY_ROLE.ld).toEqual(["reports", "academy", "announcements", "placements"]);
    for (const a of ["settings", "staff", "audit", "concerns"] as const) expect(can("ld", a), a).toBe(false);
    expect(AREAS_BY_ROLE.reviewer).toEqual(["concerns"]);
    for (const a of AREAS.filter((x) => x !== "concerns")) expect(can("reviewer", a), a).toBe(false);
    expect(can(undefined, "reports")).toBe(false);
  });

  it("refuses services to the wrong role even if a page let them through", async () => {
    const admin = await dto("MS0001");
    const player = await dto("MS1001");
    const ld = { ...admin, role: "ld" as const };
    const reviewer = { ...admin, role: "reviewer" as const };
    expect(() => assertArea(player, "academy")).toThrow();
    await expect(listConcerns(player)).rejects.toThrow();
    await expect(listConcerns(ld)).rejects.toThrow(); // learning team cannot read conduct reports
    await expect(listConcerns(reviewer)).resolves.toBeDefined();
    await expect(postAnnouncement(reviewer, "Hello there", "Some text here", 1)).rejects.toThrow();
    await expect(postAnnouncement(ld, "Hello there", "Some text here", 1)).resolves.toMatchObject({ ok: true });
    await expect(saveCourse(reviewer, blankCourseJson())).rejects.toThrow();
    await expect(deleteCourse(ld, "nothing-here")).resolves.toBeDefined(); // allowed, though nothing to delete
    await expect(updateConcern(ld, "x", "reviewed", "", 1)).rejects.toThrow();
    await expect(deleteAnnouncement(player, "000000000000001-aaaaaa", 1)).rejects.toThrow();
  });
});
