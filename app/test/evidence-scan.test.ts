import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEvidenceFile, getConcern, submitConcern, type ConcernInput } from "@/lib/server/concerns/service";
import { SupabaseFileStorage } from "@/lib/server/files/storage";
import { scanFile } from "@/lib/server/files/scan";
import { resetEnvCache } from "@/lib/server/env";
import { recentAudit } from "@/lib/server/audit";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");
const reporter = { staffId: "MS7001", name: "Amaka Okoro", unit: "wealth", role: "player" as const };
const admin = { staffId: "MS0001", name: "Admin", unit: "it", role: "admin" as const };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

const withFile = (): ConcernInput => ({ category: "harassment", description: "A colleague kept sending me unwelcome messages after I asked them to stop.", about: "A colleague", occurredAt: NOW - 3_600_000, files: [{ name: "shot.png", bytes: PNG, lastModified: null }] });

const scannerSays = (body: unknown, ok = true) => vi.fn(async () => ({ ok, status: ok ? 200 : 503, json: async () => body }) as unknown as Response);

describe("evidence virus scan", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EVIDENCE_SCANNER_URL;
    resetEnvCache();
  });

  it("skips the scan in development and tests when no scanner is set, and the file opens", async () => {
    expect((await scanFile(Buffer.from(PNG))).status).toBe("skipped");
    const r = await submitConcern(reporter, withFile(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((await getConcern(admin, r.id))?.evidence[0].scan).toBe("skipped");
    expect((await getEvidenceFile(admin, r.id, 1, NOW))?.type).toBe("image/png");
  });

  it("refuses an infected file, stores nothing and records it", async () => {
    process.env.EVIDENCE_SCANNER_URL = "https://scan.example.com/scan";
    resetEnvCache();
    vi.stubGlobal("fetch", scannerSays({ infected: true, signature: "Test.Virus" }));
    const r = await submitConcern(reporter, withFile(), NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/virus/);
    expect((await recentAudit(20)).some((e) => e.action === "concern.file.blocked")).toBe(true);
  });

  it("keeps a file as pending when the scanner cannot be reached, and opens it only after a clean scan", async () => {
    process.env.EVIDENCE_SCANNER_URL = "https://scan.example.com/scan";
    resetEnvCache();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const r = await submitConcern(reporter, withFile(), NOW);
    expect(r.ok).toBe(true); // the reporter is not blocked by a scanner outage
    if (!r.ok) return;
    expect((await getConcern(admin, r.id))?.evidence[0].scan).toBe("pending");
    expect(await getEvidenceFile(admin, r.id, 1, NOW + 1)).toBeNull(); // still down: not opened
    vi.stubGlobal("fetch", scannerSays({ infected: false }));
    expect((await getEvidenceFile(admin, r.id, 1, NOW + 2))?.type).toBe("image/png");
    expect((await getConcern(admin, r.id))?.evidence[0].scan).toBe("clean");
  });

  it("blocks a pending file that later scans as infected", async () => {
    process.env.EVIDENCE_SCANNER_URL = "https://scan.example.com/scan";
    resetEnvCache();
    vi.stubGlobal("fetch", scannerSays({}, false)); // an error answer means pending
    const r = await submitConcern(reporter, withFile(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    vi.stubGlobal("fetch", scannerSays({ infected: true }));
    expect(await getEvidenceFile(admin, r.id, 1, NOW + 1)).toBeNull();
    expect((await getConcern(admin, r.id))?.evidence[0].scan).toBe("infected");
    vi.stubGlobal("fetch", scannerSays({ infected: false }));
    expect(await getEvidenceFile(admin, r.id, 1, NOW + 2)).toBeNull(); // once infected, never opened
  });
});

describe("private file storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("talks to a private bucket with the service key, and only with safe keys", async () => {
    const calls: { url: string; method: string; auth: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? "GET", auth: String((init.headers as Record<string, string>).Authorization) });
      return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer } as unknown as Response;
    }));
    const s = new SupabaseFileStorage("https://proj.supabase.co/", "service-key-123456789012345", "concern-evidence");
    await s.put("c_abc.1", Buffer.from([1]), "image/png");
    expect([...(await s.get("c_abc.1")) ?? []]).toEqual([1, 2, 3]);
    await s.delete("c_abc.1");
    expect(calls.map((c) => c.method)).toEqual(["POST", "GET", "DELETE"]);
    expect(calls[0].url).toBe("https://proj.supabase.co/storage/v1/object/concern-evidence/c_abc.1");
    expect(calls.every((c) => c.auth === "Bearer service-key-123456789012345")).toBe(true);
    await expect(s.put("../escape", Buffer.from([1]), "image/png")).rejects.toThrow();
    await expect(s.get("a/b")).rejects.toThrow();
  });

  it("reads a missing file as nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as unknown as Response));
    const s = new SupabaseFileStorage("https://proj.supabase.co", "service-key-123456789012345", "concern-evidence");
    expect(await s.get("c_none.1")).toBeNull();
  });
});
