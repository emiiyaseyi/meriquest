import { beforeEach, describe, expect, it } from "vitest";
import { buildReport, csvCell, reportCsv } from "@/lib/server/reports/service";
import { getStore } from "@/lib/server/store";
import { listCourseMeta } from "@/lib/server/academy/content";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");

describe("progress report", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("makes spreadsheet cells safe from formulas and quotes", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@x")).toBe("'@x");
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(12)).toBe("12");
  });

  it("counts people, lessons, certificates and activity by unit and course", async () => {
    const courses = await listCourseMeta();
    const c = courses[0];
    await getOrCreatePlayer({ staffId: "MS1001" }, NOW);
    await getStore().update("players", "MS1001", (cur) => ({ ...(cur as object), points: 120, streak: { last: "2026-10-13", count: 2, best: 4 }, updatedAt: NOW }) as never);
    await getStore().put("learning", "MS1001", {
      id: "MS1001",
      staffId: "MS1001",
      courses: { [c.id]: { best: { [c.lessonIds[0]]: 3, [c.lessonIds[1]]: 1 } }, "not-a-course": { best: { x: 3 } } },
      certificates: [{ courseId: c.id, title: c.title, icon: "x", at: NOW }],
      day: "2026-10-13",
      classesToday: 0,
    });
    const r = await buildReport(NOW);
    const me = r.people.find((p) => p.staffId === "MS1001");
    expect(me).toMatchObject({ points: 120, streak: 2, bestStreak: 4, lessonsPassed: 2, hardLessons: 1, coursesStarted: 1, certificates: 1 });
    const row = r.courses.find((x) => x.id === c.id);
    expect(row).toMatchObject({ learners: 1, completed: 1 });
    expect(row?.avgProgress).toBe(Math.round((2 / c.lessonIds.length) * 100));
    expect(r.totals.lessonsPassed).toBeGreaterThanOrEqual(2);
    expect(r.units.reduce((n, u) => n + u.people, 0)).toBe(r.people.length);
  });

  it("exports one row per person under a header, and never includes passwords", async () => {
    const r = await buildReport(NOW);
    const csv = reportCsv(r);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(r.people.length + 1);
    expect(lines[0]).toContain("Staff ID");
    expect(csv.toLowerCase()).not.toContain("password");
  });
});
