import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnv, resetEnvCache } from "@/lib/server/env";
import { MemoryStore, setStoreForTests } from "@/lib/server/store";
import { ensureSeeded, resetSeedState } from "@/lib/server/seed";
import { authenticate } from "@/lib/server/auth/service";
import { getUser } from "@/lib/server/auth/users";
import { DEFAULT_PW, IP } from "./helpers";

const ADMIN_PW = "Bootstrap-Only-Secret-77!";

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
});

describe("bootstrap admin is not reachable with the shared staff default", () => {
  beforeEach(() => {
    vi.stubEnv("BOOTSTRAP_ADMIN_PASSWORD", ADMIN_PW);
    resetEnvCache();
    resetSeedState();
    setStoreForTests(new MemoryStore());
  });

  it("rejects the shared default for MS0001 and accepts only the bootstrap secret", async () => {
    await ensureSeeded(1_000);
    expect((await getUser("MS0001"))?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(await authenticate({ identifier: "MS0001", password: DEFAULT_PW }, { ip: IP }, 2_000)).toEqual({ ok: false, reason: "invalid" });
    const ok = await authenticate({ identifier: "MS0001", password: ADMIN_PW }, { ip: IP }, 3_000);
    expect(ok.ok && ok.user.mustChangePassword).toBe(true); // still forced to choose their own
  });

  it("other staff still start on the shared default", async () => {
    await ensureSeeded(1_000);
    expect((await getUser("MS1001"))?.passwordHash).toBeNull();
    expect((await authenticate({ identifier: "MS1001", password: DEFAULT_PW }, { ip: IP }, 2_000)).ok).toBe(true);
  });
});

describe("production env validation", () => {
  const prod = (extra: Record<string, string>) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STORE", "file");
    vi.stubEnv("SEED_SAMPLE_STAFF", "false");
    vi.stubEnv("DEFAULT_PASSWORD", "Prod-Default-Pw-ab12!");
    vi.stubEnv("BOOTSTRAP_ADMIN_PASSWORD", "");
    for (const [k, v] of Object.entries(extra)) vi.stubEnv(k, v);
    resetEnvCache();
  };

  it("requires a bootstrap admin password", () => {
    prod({});
    expect(() => getEnv()).toThrow(/BOOTSTRAP_ADMIN_PASSWORD/);
  });

  it("requires it to differ from the staff default", () => {
    prod({ BOOTSTRAP_ADMIN_PASSWORD: "Prod-Default-Pw-ab12!" });
    expect(() => getEnv()).toThrow(/BOOTSTRAP_ADMIN_PASSWORD/);
  });

  it("refuses the prototype's committed default, sample staff and the memory store", () => {
    prod({ BOOTSTRAP_ADMIN_PASSWORD: "Another-Secret-cd34!", DEFAULT_PASSWORD: "Meristem@2026" });
    expect(() => getEnv()).toThrow(/DEFAULT_PASSWORD/);
    prod({ BOOTSTRAP_ADMIN_PASSWORD: "Another-Secret-cd34!", SEED_SAMPLE_STAFF: "true" });
    expect(() => getEnv()).toThrow(/SEED_SAMPLE_STAFF/);
    prod({ BOOTSTRAP_ADMIN_PASSWORD: "Another-Secret-cd34!", STORE: "memory" });
    expect(() => getEnv()).toThrow(/STORE/);
  });

  it("accepts a correct production configuration", () => {
    prod({ BOOTSTRAP_ADMIN_PASSWORD: "Another-Secret-cd34!" });
    expect(getEnv().NODE_ENV).toBe("production");
  });

  it("never echoes secret values in the error", () => {
    prod({ BOOTSTRAP_ADMIN_PASSWORD: "Prod-Default-Pw-ab12!" });
    try {
      getEnv();
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("Prod-Default-Pw-ab12!");
    }
  });
});
