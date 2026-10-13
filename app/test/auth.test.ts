import { beforeEach, describe, expect, it } from "vitest";
import { authenticate, changePassword, userFromToken } from "@/lib/server/auth/service";
import { createSession, destroySession, destroyUserSessions, validateSession } from "@/lib/server/auth/session";
import { getUser, parseIdentifier } from "@/lib/server/auth/users";
import { rateLimit } from "@/lib/server/auth/ratelimit";
import { setConfig } from "@/lib/server/config/registry";
import { CONFIG } from "@/lib/server/config/definitions";
import { getStore } from "@/lib/server/store";
import { recentAudit } from "@/lib/server/audit";
import { DEFAULT_PW, freshWorld, IP, NEW_PW } from "./helpers";

beforeEach(freshWorld);

const T0 = 10_000_000;
const login = (identifier: unknown, password: unknown, now = T0, ip = IP) => authenticate({ identifier, password }, { ip }, now);

describe("parseIdentifier", () => {
  const rules = { allowedEmailDomains: ["meristemng.com"], staffIdPrefix: "MS", staffIdDigits: 4 };
  it("accepts staff IDs (any case) and work emails", () => {
    expect(parseIdentifier("ms1001", rules)).toEqual({ kind: "staff", staffId: "MS1001" });
    expect(parseIdentifier("  MS1001  ", rules)).toEqual({ kind: "staff", staffId: "MS1001" });
    expect(parseIdentifier("MS1001\n", rules)).toEqual({ kind: "staff", staffId: "MS1001" }); // surrounding whitespace is trimmed
    expect(parseIdentifier("Tolu.Adebayo@Meristemng.com", rules)).toEqual({ kind: "email", email: "tolu.adebayo@meristemng.com" });
  });
  it.each([
    "", "MS100", "MS10011", "XX1001", "MS1001; DROP", "tolu@gmail.com", "a@b", "../MS1001", "MS1001\nX", "MS10\n01", "__proto__", "x".repeat(500), 123, null, undefined, {},
  ])("rejects %j", (bad) => {
    expect(parseIdentifier(bad as unknown, rules)).toBeNull();
  });
});

describe("sign in", () => {
  it("lets a new account in with the default password and flags it to change", async () => {
    const r = await login("MS1001", DEFAULT_PW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.user.mustChangePassword).toBe(true);
      expect(r.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(JSON.stringify(r.user)).not.toMatch(/passwordHash/);
      expect(Object.keys(r.user)).not.toContain("passwordHash");
    }
  });

  it("works with the work email too", async () => {
    expect((await login("tolu.adebayo@meristemng.com", DEFAULT_PW)).ok).toBe(true);
  });

  it("returns the same generic result for wrong password, unknown user, bad format and disabled user", async () => {
    await getStore().update("users", "MS1003", (u) => ({ ...(u as object), status: "disabled" }) as never);
    const results = await Promise.all([
      login("MS1001", "wrong-password-1"),
      login("MS9999", DEFAULT_PW),
      login("not-an-id", DEFAULT_PW),
      login("MS1003", DEFAULT_PW),
      login("MS1001", ""),
      login("MS1001", 12345),
    ]);
    for (const r of results) expect(r).toEqual({ ok: false, reason: "invalid" });
  });

  it("never returns the password hash or token fields on failure", async () => {
    const r = await login("MS1001", "nope-nope-1");
    expect(Object.keys(r)).toEqual(["ok", "reason"]);
  });

  it("locks the account after the configured failures, even for the right password", async () => {
    const max = CONFIG.auth.default.maxFailedAttempts;
    for (let i = 0; i < max; i++) await login("MS1001", `wrong-${i}-aaaa`, T0 + i);
    expect(await login("MS1001", DEFAULT_PW, T0 + max + 1)).toEqual({ ok: false, reason: "invalid" });
    const u = await getUser("MS1001");
    expect(u?.lockedUntil).toBeGreaterThan(T0);
    expect((await recentAudit()).some((e) => e.action === "account_locked" && e.target === "MS1001")).toBe(true);
  });

  it("unlocks after the lock period", async () => {
    const max = CONFIG.auth.default.maxFailedAttempts;
    for (let i = 0; i < max; i++) await login("MS1001", `wrong-${i}-aaaa`, T0 + i);
    const afterLock = T0 + CONFIG.auth.default.lockMinutes * 60_000 + 1000;
    expect((await login("MS1001", DEFAULT_PW, afterLock)).ok).toBe(true);
  });

  it("a successful login resets the failure counter", async () => {
    await login("MS1001", "wrong-1-aaaa", T0);
    await login("MS1001", "wrong-2-aaaa", T0 + 1);
    expect((await login("MS1001", DEFAULT_PW, T0 + 2)).ok).toBe(true);
    expect((await getUser("MS1001"))?.failedAttempts).toBe(0);
  });

  it("throttles repeated attempts on one identifier before they can guess", async () => {
    let throttled = false;
    for (let i = 0; i < 15 && !throttled; i++) {
      const r = await login("MS1002", `guess-${i}-aaaa`, T0 + i);
      if (!r.ok && r.reason === "throttled") throttled = true;
    }
    expect(throttled).toBe(true);
  });

  it("throttles a flood of malformed identifiers from one client", async () => {
    let throttled = false;
    for (let i = 0; i < 20 && !throttled; i++) {
      const r = await login("junk", "x", T0 + i);
      if (!r.ok && r.reason === "throttled") throttled = true;
    }
    expect(throttled).toBe(true);
  });

  it("issues a fresh session each login (no fixation)", async () => {
    const a = await login("MS1001", DEFAULT_PW, T0);
    const b = await login("MS1001", DEFAULT_PW, T0 + 1);
    expect(a.ok && b.ok && a.token !== b.token).toBe(true);
  });

  it("audits sign-ins without secrets", async () => {
    await login("MS1001", DEFAULT_PW);
    const ev = (await recentAudit()).find((e) => e.action === "login");
    expect(ev).toBeTruthy();
    expect(JSON.stringify(ev)).not.toContain(DEFAULT_PW);
  });
});

describe("sessions", () => {
  const cfg = { sessionHours: 8, idleMinutes: 60 };

  it("validates a live session and rejects garbage tokens", async () => {
    const { token } = await createSession("MS1001", cfg, T0);
    expect(await validateSession(token, cfg, T0 + 1000)).toEqual({ userId: "MS1001" });
    for (const bad of [undefined, "", "abc", "x".repeat(43), "../../etc/passwd", token + "x", token.slice(1)]) {
      expect(await validateSession(bad, cfg, T0)).toBeNull();
    }
  });

  it("stores only a hash of the token", async () => {
    const { token } = await createSession("MS1001", cfg, T0);
    const stored = JSON.stringify(await getStore().list("sessions"));
    expect(stored).not.toContain(token);
  });

  it("expires after the session length and after idling", async () => {
    const a = await createSession("MS1001", cfg, T0);
    expect(await validateSession(a.token, cfg, T0 + 8 * 3_600_000 + 1)).toBeNull();
    const b = await createSession("MS1001", cfg, T0);
    expect(await validateSession(b.token, cfg, T0 + 61 * 60_000)).toBeNull();
  });

  it("keeps an active session alive past the idle window", async () => {
    const { token } = await createSession("MS1001", cfg, T0);
    for (let i = 1; i <= 5; i++) expect(await validateSession(token, cfg, T0 + i * 50 * 60_000)).not.toBeNull();
  });

  it("can be revoked singly or for a whole user", async () => {
    const a = await createSession("MS1001", cfg, T0);
    const b = await createSession("MS1001", cfg, T0);
    const c = await createSession("MS1002", cfg, T0);
    await destroySession(a.token);
    expect(await validateSession(a.token, cfg, T0)).toBeNull();
    expect(await destroyUserSessions("MS1001")).toBe(1);
    expect(await validateSession(b.token, cfg, T0)).toBeNull();
    expect(await validateSession(c.token, cfg, T0)).not.toBeNull();
  });

  it("a disabled user loses access immediately, even with a valid cookie", async () => {
    const r = await login("MS1001", DEFAULT_PW);
    if (!r.ok) throw new Error("login failed");
    expect(await userFromToken(r.token, T0 + 1)).not.toBeNull();
    await getStore().update("users", "MS1001", (u) => ({ ...(u as object), status: "disabled" }) as never);
    expect(await userFromToken(r.token, T0 + 2)).toBeNull();
  });

  it("role changes apply on the next request (roles are never read from the cookie)", async () => {
    const r = await login("MS1001", DEFAULT_PW);
    if (!r.ok) throw new Error("login failed");
    expect((await userFromToken(r.token, T0 + 1))?.role).toBe("player");
    await getStore().update("users", "MS1001", (u) => ({ ...(u as object), role: "manager" }) as never);
    expect((await userFromToken(r.token, T0 + 2))?.role).toBe("manager");
  });

  it("honours a shorter session length set by an admin", async () => {
    await setConfig("auth", JSON.stringify({ ...CONFIG.auth.default, sessionHours: 1 }), "MS0001");
    const r = await login("MS1001", DEFAULT_PW, T0);
    if (!r.ok) throw new Error("login failed");
    expect(r.expiresAt).toBe(T0 + 3_600_000);
  });
});

describe("change password", () => {
  it("rejects a wrong current password and audits it", async () => {
    const r = await changePassword("MS1001", { current: "wrong-wrong-1", next: NEW_PW, confirm: NEW_PW }, T0);
    expect(r).toEqual({ ok: false, error: "Your current password is not correct." });
    expect((await recentAudit()).some((e) => e.action === "password_change_failed")).toBe(true);
  });

  it.each([
    ["mismatch", { next: NEW_PW, confirm: NEW_PW + "x" }, /do not match/],
    ["too short", { next: "Aa1", confirm: "Aa1" }, /at least/],
    ["same as current", { next: DEFAULT_PW, confirm: DEFAULT_PW }, /different/],
    ["common", { next: "password123", confirm: "password123" }, /common|at least/],
  ])("rejects %s", async (_n, pw, re) => {
    const r = await changePassword("MS1001", { current: DEFAULT_PW, ...pw }, T0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(re as RegExp);
  });

  it("rejects non-string input without throwing", async () => {
    for (const bad of [[undefined, undefined, undefined], [{}, [], 5], [null, null, null]]) {
      const r = await changePassword("MS1001", { current: bad[0], next: bad[1], confirm: bad[2] }, T0);
      expect(r.ok).toBe(false);
    }
  });

  it("succeeds, clears the must-change flag, hashes the password and signs out other devices", async () => {
    const other = await login("MS1001", DEFAULT_PW, T0);
    if (!other.ok) throw new Error("login failed");
    const r = await changePassword("MS1001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, T0 + 5);
    expect(r.ok).toBe(true);
    const u = await getUser("MS1001");
    expect(u?.mustChangePassword).toBe(false);
    expect(u?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(u?.passwordHash).not.toContain(NEW_PW);
    expect(await userFromToken(other.token, T0 + 6)).toBeNull(); // old session revoked
    if (r.ok) expect(await userFromToken(r.token, T0 + 6)).not.toBeNull(); // new one works
    // the default no longer works, the new password does
    expect((await login("MS1001", DEFAULT_PW, T0 + 10)).ok).toBe(false);
    const again = await login("MS1001", NEW_PW, T0 + 11);
    expect(again.ok && !again.user.mustChangePassword).toBe(true);
  });

  it("refuses a disabled or unknown user", async () => {
    expect((await changePassword("MS9999", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, T0)).ok).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks until the window ends", async () => {
    for (let i = 0; i < 3; i++) expect((await rateLimit("k", 3, 1000, T0)).allowed).toBe(true);
    const blocked = await rateLimit("k", 3, 1000, T0 + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect((await rateLimit("k", 3, 1000, T0 + 1001)).allowed).toBe(true);
  });

  it("does not store the raw key", async () => {
    await rateLimit("login:id:MS1001", 3, 1000, T0);
    expect(JSON.stringify(await getStore().list("ratelimits"))).not.toContain("MS1001");
  });
});
