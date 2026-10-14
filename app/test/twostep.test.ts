import { beforeEach, describe, expect, it } from "vitest";
import { base32Decode, base32Encode, codeFor, newRecoveryCodes, openSecret, sealSecret, stepAt, consumeRecoveryCode, verifyCode } from "@/lib/server/auth/totp";
import { authenticate, changePassword } from "@/lib/server/auth/service";
import { beginSetup, confirmSetup, disableTwoStep, adminResetTwoStep } from "@/lib/server/auth/twostep";
import { getUser } from "@/lib/server/auth/users";
import { DEFAULT_PW, IP, NEW_PW, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");
const ctx = { ip: IP };

describe("authenticator codes", () => {
  it("matches the RFC 6238 test values", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(codeFor(secret, Math.floor(59 / 30), 8)).toBe("94287082");
    expect(codeFor(secret, Math.floor(1111111109 / 30), 8)).toBe("07081804");
    expect(codeFor(secret, Math.floor(1234567890 / 30), 8)).toBe("89005924");
  });

  it("encodes and decodes the secret both ways", () => {
    const raw = Buffer.from([1, 2, 3, 250, 251, 252, 0, 77]);
    expect(base32Decode(base32Encode(raw)).equals(raw)).toBe(true);
  });

  it("accepts the current code and one period either side, never twice, and never rubbish", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    const step = stepAt(NOW);
    const good = codeFor(secret, step);
    expect(verifyCode(secret, good, NOW)).toEqual({ ok: true, step });
    expect(verifyCode(secret, codeFor(secret, step - 1), NOW).ok).toBe(true);
    expect(verifyCode(secret, codeFor(secret, step + 3), NOW).ok).toBe(false);
    expect(verifyCode(secret, good, NOW, step).ok).toBe(false); // already used
    for (const bad of ["", "12345", "1234567", "abcdef", null, 123456]) expect(verifyCode(secret, bad, NOW).ok).toBe(false);
  });

  it("keeps the secret sealed and gives single-use recovery codes", () => {
    expect(openSecret(sealSecret("ABCDEFGH"))).toBe("ABCDEFGH");
    expect(openSecret("gcm:bad:bad:bad")).toBeNull();
    const { codes, hashes } = newRecoveryCodes();
    expect(codes).toHaveLength(10);
    const left = consumeRecoveryCode(hashes, codes[0].toUpperCase());
    expect(left).toHaveLength(9);
    expect(consumeRecoveryCode(left ?? [], codes[0])).toBeNull();
    expect(consumeRecoveryCode(hashes, "nonsense-code")).toBeNull();
  });
});

describe("two-step sign-in", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  async function turnOn(staffId: string, now: number) {
    // The person first sets their own password, then sets up two-step sign-in
    await changePassword(staffId, { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, now);
    const b = await beginSetup(staffId, now);
    if (!b.ok) throw new Error(b.error);
    const secret = b.secret.replace(/\s/g, "");
    const c = await confirmSetup(staffId, codeFor(secret, stepAt(now)), now);
    if (!c.ok) throw new Error(c.error);
    return { secret, recovery: c.recoveryCodes };
  }

  it("is off by default, so signing in works as before", async () => {
    const r = await authenticate({ identifier: "MS1001", password: DEFAULT_PW }, ctx, NOW);
    expect(r.ok).toBe(true);
  });

  it("sets up with a right code, refuses a wrong one, and shows recovery codes once", async () => {
    await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, NOW);
    const b = await beginSetup("MS0001", NOW);
    expect(b.ok && b.url).toContain("otpauth://totp/");
    expect((await confirmSetup("MS0001", "000000", NOW)).ok).toBe(false);
    expect((await getUser("MS0001"))?.totp?.enabled).toBe(false);
    const secret = (b.ok ? b.secret : "").replace(/\s/g, "");
    const c = await confirmSetup("MS0001", codeFor(secret, stepAt(NOW)), NOW);
    expect(c.ok && c.recoveryCodes).toHaveLength(10);
    expect((await getUser("MS0001"))?.totp?.enabled).toBe(true);
    expect((await beginSetup("MS0001", NOW)).ok).toBe(false); // already on
  });

  it("asks for the code after the right password, and only then signs in", async () => {
    const { secret } = await turnOn("MS0001", NOW);
    const later = NOW + 120_000;
    const noCode = await authenticate({ identifier: "MS0001", password: NEW_PW }, ctx, later);
    expect(noCode).toEqual({ ok: false, reason: "needs_code" });
    const wrongPw = await authenticate({ identifier: "MS0001", password: "wrong-password-1", code: codeFor(secret, stepAt(later)) }, ctx, later);
    expect(wrongPw).toEqual({ ok: false, reason: "invalid" }); // the code alone is never enough
    const bad = await authenticate({ identifier: "MS0001", password: NEW_PW, code: "111111" }, ctx, later);
    expect(bad).toEqual({ ok: false, reason: "invalid" });
    const ok = await authenticate({ identifier: "MS0001", password: NEW_PW, code: codeFor(secret, stepAt(later)) }, ctx, later);
    expect(ok.ok).toBe(true);
    // the same code cannot be used a second time
    const replay = await authenticate({ identifier: "MS0001", password: NEW_PW, code: codeFor(secret, stepAt(later)) }, ctx, later + 1000);
    expect(replay).toEqual({ ok: false, reason: "invalid" });
  });

  it("lets a recovery code in once", async () => {
    const { recovery } = await turnOn("MS0001", NOW);
    const later = NOW + 120_000;
    expect((await authenticate({ identifier: "MS0001", password: NEW_PW, code: recovery[0] }, ctx, later)).ok).toBe(true);
    expect((await authenticate({ identifier: "MS0001", password: NEW_PW, code: recovery[0] }, ctx, later + 1000)).ok).toBe(false);
    expect((await authenticate({ identifier: "MS0001", password: NEW_PW, code: recovery[1] }, ctx, later + 2000)).ok).toBe(true);
  });

  it("counts wrong codes towards locking the account", async () => {
    await turnOn("MS0001", NOW);
    const later = NOW + 120_000;
    for (let i = 0; i < 5; i++) await authenticate({ identifier: "MS0001", password: NEW_PW, code: "000000" }, ctx, later + i);
    expect((await getUser("MS0001"))?.lockedUntil).toBeGreaterThan(later);
  });

  it("turns off only with the password and a current code, and an admin can reset it", async () => {
    const { secret } = await turnOn("MS0001", NOW);
    const later = NOW + 120_000;
    expect((await disableTwoStep("MS0001", "wrong", codeFor(secret, stepAt(later)), later)).ok).toBe(false);
    expect((await disableTwoStep("MS0001", NEW_PW, "000000", later)).ok).toBe(false);
    expect((await getUser("MS0001"))?.totp?.enabled).toBe(true);
    expect((await disableTwoStep("MS0001", NEW_PW, codeFor(secret, stepAt(later)), later)).ok).toBe(true);
    expect((await getUser("MS0001"))?.totp).toBeUndefined();
    await turnOn("MS0001", later + 200_000);
    await adminResetTwoStep("MS0001", "MS0002", later + 400_000);
    expect((await getUser("MS0001"))?.totp).toBeUndefined();
  });
});
