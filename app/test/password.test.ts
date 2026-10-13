import { beforeEach, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/lib/server/env";
import { checkPasswordPolicy, defaultPasswordMatches, hashPassword, verifyPassword } from "@/lib/server/auth/password";
import { DEFAULT_PW } from "./helpers";

const policy = { passwordMinLength: 10, passwordNeedLetter: true, passwordNeedNumber: true, passwordNeedSymbol: false };
const who = { staffId: "MS1001", email: "tolu.adebayo@meristemng.com" };

beforeEach(() => resetEnvCache());

describe("hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const h = await hashPassword("Correct-Horse-9");
    expect(h).not.toContain("Correct-Horse-9");
    expect(await verifyPassword("Correct-Horse-9", h)).toBe(true);
    expect(await verifyPassword("correct-horse-9", h)).toBe(false);
  });

  it("uses the whole password, not just the first 72 bytes", async () => {
    const base = "a1".repeat(40); // 80 chars
    const h = await hashPassword(base + "X");
    expect(await verifyPassword(base + "Y", h)).toBe(false);
    expect(await verifyPassword(base + "X", h)).toBe(true);
  });

  it("produces different hashes for the same password (salted)", async () => {
    expect(await hashPassword("Same-Password-1")).not.toBe(await hashPassword("Same-Password-1"));
  });
});

describe("default password", () => {
  it("matches only the env default", () => {
    expect(defaultPasswordMatches(DEFAULT_PW)).toBe(true);
    expect(defaultPasswordMatches(DEFAULT_PW + " ")).toBe(false);
    expect(defaultPasswordMatches("")).toBe(false);
  });
});

describe("password policy", () => {
  it("accepts a good password", () => {
    expect(checkPasswordPolicy("Gr33n-Branch-Rising", policy, who)).toBeNull();
  });

  it.each([
    ["short1A", /at least 10/],
    ["onlyletterslong", /number/],
    ["12345678901234", /letter/],
    ["password123", /at least 10|common/],
    ["Password1234".repeat(20), /at most 128/],
    [DEFAULT_PW, /different from the default/],
    ["MS1001-MS1001", null], // contains the id but is not equal to it, so allowed
  ])("rejects %s", (pw, expected) => {
    const r = checkPasswordPolicy(pw, policy, who);
    if (expected === null) expect(r).toBeNull();
    else expect(r).toMatch(expected as RegExp);
  });

  it("rejects the staff ID and the email name as a password", () => {
    const loose = { ...policy, passwordMinLength: 8, passwordNeedNumber: false };
    expect(checkPasswordPolicy("tolu.adebayo", loose, who)).toMatch(/cannot be your/);
    expect(checkPasswordPolicy("MS1001", { ...loose, passwordMinLength: 3 }, who)).toMatch(/cannot be your/);
    expect(checkPasswordPolicy("ms1001abcd1", loose, who)).toBeNull();
  });

  it("enforces the symbol rule when configured", () => {
    expect(checkPasswordPolicy("Gr33nBranchRising", { ...policy, passwordNeedSymbol: true }, who)).toMatch(/symbol/);
  });
});
