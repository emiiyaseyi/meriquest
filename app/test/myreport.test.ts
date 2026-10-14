import { beforeEach, describe, expect, it } from "vitest";
import { myReport } from "@/lib/server/reports/mine";
import { getPortfolio, trade } from "@/lib/server/market/service";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");

describe("my report", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("shows only the person's own figures, and no portfolio until they open one", async () => {
    const u = await dto("MS1001");
    const r = await myReport(u, NOW);
    expect(r.level).toBeTruthy();
    expect(r.portfolio).toBeNull();
    expect(r.clients).toEqual({ served: 0, avgCsat: null, breaches: 0 });
    expect(r.topSkills.length).toBeGreaterThan(0);
    expect(r.learning.coursesTotal).toBeGreaterThan(0);
  });

  it("includes the practice portfolio once they have one", async () => {
    const u = await dto("MS1001");
    await getPortfolio(u, NOW);
    await trade(u, "buy", "money-fund", 10, NOW);
    const r = await myReport(u, NOW);
    expect(r.portfolio?.total).toBeGreaterThan(0);
    // another person's report does not show it
    expect((await myReport(await dto("MS1003"), NOW)).portfolio).toBeNull();
  });
});
