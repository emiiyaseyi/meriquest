import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshWorld, dto } from "./helpers";
import type { UserDTO } from "@/lib/server/types";

let current: UserDTO | null = null;
vi.mock("@/lib/server/auth/dal", () => ({ getCurrentUser: async () => current }));

describe("read-only game data requests", () => {
  beforeEach(async () => {
    await freshWorld();
    current = null;
  });

  it("refuses people who are not signed in, or still on the default password", async () => {
    const { GET } = await import("@/app/api/me/game/route");
    const none = await GET(new Request("http://localhost/api/me/game"));
    expect(none.status).toBe(401);
    current = { ...(await dto("MS1001")), mustChangePassword: true };
    expect((await GET(new Request("http://localhost/api/me/game"))).status).toBe(403);
  });

  it("answers only about the signed-in person, and is never cached", async () => {
    const { GET } = await import("@/app/api/me/game/route");
    const { GET: decor } = await import("@/app/api/me/decor/route");
    const { GET: sim } = await import("@/app/api/me/sim/route");
    current = { ...(await dto("MS1001")), mustChangePassword: false };
    const r = await GET(new Request("http://localhost/api/me/game"));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toContain("no-store");
    const body = await r.json();
    expect(body.needs).toBeDefined();
    expect(body.streak.count).toBe(1);
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|MS1002/);
    expect((await decor(new Request("http://localhost/api/me/decor"))).status).toBe(200);
    const s = await (await sim(new Request("http://localhost/api/me/sim?kind=clientsim"))).json();
    expect(s.meters.map((m: { label: string }) => m.label)).toContain("Client trust");
    const l = await (await sim(new Request("http://localhost/api/me/sim?kind=nonsense"))).json();
    expect(l.meters.map((m: { label: string }) => m.label)).toContain("Team morale");
  });
});
