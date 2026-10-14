import { beforeEach, describe, expect, it } from "vitest";
import { getSuccession, nominate, removeNomination } from "@/lib/server/succession/service";
import { requiredFor } from "@/lib/server/leadership/service";
import { getOrCreatePlayer } from "@/lib/server/world/service";
import { getStore } from "@/lib/server/store";
import { AREAS_BY_ROLE } from "@/lib/server/auth/permissions";
import { dto, freshWorld } from "./helpers";
import type { UserRecord } from "@/lib/server/types";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");
const DAY = 86_400_000;

describe("succession planning", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("is for admins and the learning team only", async () => {
    expect(AREAS_BY_ROLE.ld).toContain("succession");
    expect(AREAS_BY_ROLE.reviewer).not.toContain("succession");
    await expect(getSuccession(await dto("MS1001"), NOW)).rejects.toThrow();
    await expect(getSuccession(await dto("MS1002"), NOW)).rejects.toThrow(); // a manager does not see succession
    await expect(getSuccession(await dto("MS0001"), NOW)).resolves.toBeDefined();
  });

  it("lists every line manager's role with suggestions from the same unit, long enough in service", async () => {
    const v = await getSuccession(await dto("MS0001"), NOW);
    const cx = v.roles.find((r) => r.incumbent.staffId === "MS1002");
    expect(cx).toBeDefined();
    const ids = cx?.suggestions.map((s) => s.staffId) ?? [];
    expect(ids).toContain("MS1003"); // 4 years, same unit
    expect(ids).not.toContain("MS1001"); // 1 year: too new
    expect(ids).not.toContain("MS2002"); // another unit
    expect(ids).not.toContain("MS1002"); // not themselves
  });

  it("records a nomination with the checks, and removes it", async () => {
    const admin = await dto("MS0001");
    expect((await nominate(admin, "MS1002", "MS1003", "1-2", "Strong with clients", NOW)).ok).toBe(true);
    const v = await getSuccession(admin, NOW);
    const row = v.roles.find((r) => r.incumbent.staffId === "MS1002");
    expect(row?.nominees[0]).toMatchObject({ successor: "MS1003", readiness: "1-2", note: "Strong with clients" });
    expect(row?.suggestions.map((s) => s.staffId)).not.toContain("MS1003"); // already named
    expect((await nominate(admin, "MS1002", "MS1001", "now", "", NOW)).ok).toBe(false); // too new
    expect((await nominate(admin, "MS1002", "MS1002", "now", "", NOW)).ok).toBe(false);
    expect((await nominate(admin, "MS1001", "MS1003", "now", "", NOW)).ok).toBe(false); // not a line manager's role
    expect((await nominate(admin, "MS1002", "MS1003", "soon", "", NOW)).ok).toBe(false);
    expect((await removeNomination(admin, "MS1002:MS1003", NOW)).ok).toBe(true);
    expect((await removeNomination(admin, "../x", NOW)).ok).toBe(false);
  });

  it("asks line managers, and only them, to do the leadership simulator, and stops asking once it is done", async () => {
    await getStore().update<UserRecord>("users", "MS1002", (c) => (c ? { ...c, mustChangePassword: false } : c));
    const mgr = { staffId: "MS1002", isLineManager: true };
    expect(await requiredFor({ staffId: "MS1001", isLineManager: false }, NOW)).toBeNull();
    expect((await requiredFor(mgr, NOW))?.id).toBe("leadership");
    await getOrCreatePlayer(mgr, NOW);
    await getStore().update("players", "MS1002", (c) => ({ ...(c as object), stats: { shifts: 0, shiftPoints: 0, leadRuns: 1, leadGreat: 0, leadGood: 1, leadLast: "good", leadLastAt: NOW - 10 * DAY, simRuns: 0, simGreat: 0 } }) as never);
    expect(await requiredFor(mgr, NOW)).toBeNull();
    expect(await requiredFor(mgr, NOW + 200 * DAY)).not.toBeNull(); // the refresh period has passed
    const v = await getSuccession(await dto("MS0001"), NOW);
    expect(v.leadershipDue.map((m) => m.staffId)).not.toContain("MS1002");
    expect(v.leadershipDue.map((m) => m.staffId)).toContain("MS2003");
  });
});
