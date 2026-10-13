import { beforeEach, describe, expect, it } from "vitest";
import {
  createStaff,
  ForbiddenError,
  resetPasswordToDefault,
  setLineManager,
  setRole,
  setStatus,
  unlockAccount,
} from "@/lib/server/auth/admin";
import { authenticate, changePassword } from "@/lib/server/auth/service";
import { getUser, listUsers } from "@/lib/server/auth/users";
import { createSession, validateSession } from "@/lib/server/auth/session";
import { recentAudit } from "@/lib/server/audit";
import { getStore } from "@/lib/server/store";
import type { UserDTO } from "@/lib/server/types";
import { DEFAULT_PW, dto, freshWorld, IP, NEW_PW } from "./helpers";

let admin: UserDTO;
let player: UserDTO;
let manager: UserDTO;

beforeEach(async () => {
  await freshWorld();
  // The bootstrap admin starts on the default password; admin powers require a changed password.
  const r = await changePassword("MS0001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 5);
  if (!r.ok) throw new Error(r.error);
  admin = await dto("MS0001");
  player = await dto("MS1001");
  manager = await dto("MS1002");
});

const newStaff = {
  staffId: "MS4001",
  name: "Test Person",
  email: "test.person@meristemng.com",
  unit: "cx",
  segment: "front",
  title: "Officer",
  role: "player",
  tenureYears: "2",
  isLineManager: false,
};

describe("authorisation (deny by default)", () => {
  it("every admin operation throws ForbiddenError for non-admins", async () => {
    for (const actor of [player, manager]) {
      await expect(resetPasswordToDefault(actor, "MS1003")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(unlockAccount(actor, "MS1003")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(setStatus(actor, "MS1003", "disabled")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(setRole(actor, "MS1001", "admin")).rejects.toBeInstanceOf(ForbiddenError);
      await expect(setLineManager(actor, "MS1003", true)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(createStaff(actor, newStaff)).rejects.toBeInstanceOf(ForbiddenError);
    }
  });

  it("rejects null/undefined actors and spoofed role objects without a real admin record", async () => {
    // @ts-expect-error deliberately wrong
    await expect(setRole(null, "MS1001", "admin")).rejects.toBeInstanceOf(ForbiddenError);
    // @ts-expect-error deliberately wrong
    await expect(setRole(undefined, "MS1001", "admin")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("a forged actor object cannot grant admin power (the role is re-read from the store)", async () => {
    await expect(resetPasswordToDefault({ ...player, role: "admin", mustChangePassword: false }, "MS1003")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setRole({ ...manager, role: "admin", mustChangePassword: false }, "MS1002", "admin")).rejects.toBeInstanceOf(ForbiddenError);
    expect((await getUser("MS1002"))?.role).toBe("manager");
  });

  it("an admin still on the default password has no admin powers", async () => {
    await resetPasswordToDefault(admin, "MS0001"); // admin puts themselves back on the default
    await expect(setRole(admin, "MS1001", "reviewer")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("a disabled admin has no admin powers", async () => {
    await getStore().update("users", "MS0001", (u) => ({ ...(u as object), status: "disabled" }) as never);
    await expect(setRole(admin, "MS1001", "reviewer")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("a privilege change was never applied after a forbidden attempt", async () => {
    await expect(setRole(player, "MS1001", "admin")).rejects.toThrow();
    expect((await getUser("MS1001"))?.role).toBe("player");
  });
});

describe("admin operations", () => {
  it("resets a password to the default, forces a change and signs the user out", async () => {
    const s = await createSession("MS1001", { sessionHours: 8 }, 10);
    expect(await resetPasswordToDefault(admin, "MS1001")).toEqual({ ok: true });
    const u = await getUser("MS1001");
    expect(u?.passwordHash).toBeNull();
    expect(u?.mustChangePassword).toBe(true);
    expect(await validateSession(s.token, { idleMinutes: 60 }, 11)).toBeNull();
    expect((await authenticate({ identifier: "MS1001", password: DEFAULT_PW }, { ip: IP }, 20)).ok).toBe(true);
  });

  it("unlocks an account", async () => {
    await getStore().update("users", "MS1001", (u) => ({ ...(u as object), lockedUntil: 9e15, failedAttempts: 3 }) as never);
    expect(await unlockAccount(admin, "MS1001")).toEqual({ ok: true });
    expect((await getUser("MS1001"))?.lockedUntil).toBeNull();
  });

  it("disables and re-enables an account and ends its sessions", async () => {
    const s = await createSession("MS1001", { sessionHours: 8 }, 10);
    expect(await setStatus(admin, "MS1001", "disabled")).toEqual({ ok: true });
    expect(await validateSession(s.token, { idleMinutes: 60 }, 11)).toBeNull();
    expect((await authenticate({ identifier: "MS1001", password: DEFAULT_PW }, { ip: IP }, 20)).ok).toBe(false);
    expect(await setStatus(admin, "MS1001", "active")).toEqual({ ok: true });
    expect((await authenticate({ identifier: "MS1001", password: DEFAULT_PW }, { ip: IP }, 30)).ok).toBe(true);
  });

  it("will not let an admin lock themselves out or leave the system with no admin", async () => {
    expect(await setStatus(admin, "MS0001", "disabled")).toMatchObject({ ok: false });
    expect(await setRole(admin, "MS0001", "player")).toMatchObject({ ok: false });
    // promote a second admin (who has set their own password), then the first may step down
    await changePassword("MS1002", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 7);
    expect(await setRole(admin, "MS1002", "admin")).toEqual({ ok: true });
    const second = await dto("MS1002");
    expect(await setStatus(second, "MS0001", "disabled")).toEqual({ ok: true });
    // MS1002 is now the only active admin and cannot be removed or disabled
    expect(await setRole(second, "MS1002", "player")).toMatchObject({ ok: false });
    expect(await setStatus(second, "MS1002", "disabled")).toMatchObject({ ok: false });
  });

  it("rejects invalid roles and unknown staff", async () => {
    expect(await setRole(admin, "MS1001", "superuser")).toMatchObject({ ok: false });
    expect(await setRole(admin, "MS1001", "__proto__")).toMatchObject({ ok: false });
    expect(await setRole(admin, "MS9999", "manager")).toMatchObject({ ok: false });
    expect(await resetPasswordToDefault(admin, "MS9999")).toMatchObject({ ok: false });
  });

  it("sets the line-manager flag", async () => {
    expect(await setLineManager(admin, "MS1001", true)).toEqual({ ok: true });
    expect((await getUser("MS1001"))?.isLineManager).toBe(true);
  });

  it("audits every change with the acting admin", async () => {
    await setRole(admin, "MS1001", "reviewer");
    await setStatus(admin, "MS1003", "disabled");
    const events = await recentAudit();
    expect(events.find((e) => e.action === "role_changed")).toMatchObject({ actor: "MS0001", target: "MS1001" });
    expect(events.find((e) => e.action === "account_disabled")).toMatchObject({ actor: "MS0001", target: "MS1003" });
  });
});

describe("createStaff validation", () => {
  it("creates a staff member on the default password", async () => {
    expect(await createStaff(admin, newStaff)).toEqual({ ok: true });
    const u = await getUser("MS4001");
    expect(u).toMatchObject({ name: "Test Person", status: "active", passwordHash: null, mustChangePassword: true, role: "player" });
  });

  it.each([
    ["bad staff id", { staffId: "XX1" }],
    ["off-domain email", { email: "x@gmail.com" }],
    ["short name", { name: "A" }],
    ["unknown role", { role: "root" }],
    ["unknown segment", { segment: "left" }],
    ["unit with spaces", { unit: "c x" }],
    ["negative tenure", { tenureYears: "-1" }],
    ["absurd tenure", { tenureYears: "999" }],
  ])("rejects %s", async (_n, patch) => {
    expect(await createStaff(admin, { ...newStaff, ...patch })).toMatchObject({ ok: false });
    expect(await getUser("MS4001")).toBeNull();
  });

  it("rejects duplicate IDs and emails without overwriting", async () => {
    expect(await createStaff(admin, { ...newStaff, staffId: "MS1001", email: "someone.else@meristemng.com" })).toMatchObject({ ok: false });
    expect((await getUser("MS1001"))?.name).toBe("Tolu Adebayo");
    expect(await createStaff(admin, { ...newStaff, email: "tolu.adebayo@meristemng.com" })).toMatchObject({ ok: false });
  });

  it("ignores unexpected fields so a client cannot smuggle in a hash or a role escalation", async () => {
    await createStaff(admin, { ...newStaff, passwordHash: "$2a$04$fake", mustChangePassword: false, status: "disabled" });
    const u = await getUser("MS4001");
    expect(u?.passwordHash).toBeNull();
    expect(u?.mustChangePassword).toBe(true);
    expect(u?.status).toBe("active");
  });
});

describe("seeding", () => {
  it("seeds the bootstrap admin and the sample staff exactly once", async () => {
    const before = (await listUsers()).length;
    expect(before).toBe(10);
    const { ensureSeeded } = await import("@/lib/server/seed");
    await ensureSeeded();
    expect((await listUsers()).length).toBe(before);
  });

  it("everyone starts on the default password with a forced change", async () => {
    for (const u of await listUsers()) {
      if (u.staffId === "MS0001") continue; // changed in beforeEach
      expect(u.passwordHash).toBeNull();
      expect(u.mustChangePassword).toBe(true);
    }
  });
});
