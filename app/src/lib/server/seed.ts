import "server-only";
import { getEnv } from "./env";
import { getStore } from "./store";
import { audit } from "./audit";
import { hashPassword } from "./auth/password";
import type { Role, Segment, UserRecord } from "./types";

/**
 * First-run seeding. Production gets exactly one bootstrap admin (on the default password, which
 * comes from a server secret and must be changed at first sign-in). Fictional sample staff are
 * seeded ONLY when SEED_SAMPLE_STAFF=true, which env validation forbids in production.
 */
interface SeedPerson {
  staffId: string;
  name: string;
  email: string;
  unit: string;
  segment: Segment;
  title: string;
  role: Role;
  isLineManager: boolean;
  tenureYears: number;
}

export const SAMPLE_STAFF: SeedPerson[] = [
  { staffId: "MS1001", name: "Tolu Adebayo", email: "tolu.adebayo@meristemng.com", unit: "cx", segment: "front", title: "Client Experience Officer", role: "player", isLineManager: false, tenureYears: 1 },
  { staffId: "MS1002", name: "Chiamaka Obi", email: "chiamaka.obi@meristemng.com", unit: "cx", segment: "front", title: "Team Lead, Client Experience", role: "manager", isLineManager: true, tenureYears: 9 },
  { staffId: "MS1003", name: "Ibrahim Sani", email: "ibrahim.sani@meristemng.com", unit: "cx", segment: "front", title: "Client Experience Officer", role: "player", isLineManager: false, tenureYears: 4 },
  { staffId: "MS2001", name: "Femi Ogunleye", email: "femi.ogunleye@meristemng.com", unit: "wealth", segment: "front", title: "Wealth Advisory Intern", role: "player", isLineManager: false, tenureYears: 0 },
  { staffId: "MS2002", name: "Ngozi Eze", email: "ngozi.eze@meristemng.com", unit: "wealth", segment: "front", title: "Wealth Advisory Officer", role: "player", isLineManager: false, tenureYears: 2 },
  { staffId: "MS2003", name: "Efe Briggs", email: "efe.briggs@meristemng.com", unit: "wealth", segment: "front", title: "Team Lead, Wealth Advisory", role: "manager", isLineManager: true, tenureYears: 10 },
  { staffId: "MS3001", name: "Daniel Etim", email: "daniel.etim@meristemng.com", unit: "invest", segment: "middle", title: "Investment Advisory Officer (MSP)", role: "player", isLineManager: false, tenureYears: 0 },
  { staffId: "MS3002", name: "Aisha Bello", email: "aisha.bello@meristemng.com", unit: "invest", segment: "middle", title: "Investment Advisory Officer", role: "player", isLineManager: false, tenureYears: 3 },
  { staffId: "MS3003", name: "Bayo Adewale", email: "bayo.adewale@meristemng.com", unit: "invest", segment: "middle", title: "Team Lead, Investment Advisory", role: "manager", isLineManager: true, tenureYears: 11 },
];

function newRecord(p: SeedPerson, now: number): UserRecord {
  return {
    ...p,
    status: "active",
    passwordHash: null, // on the default password until the first sign-in forces a change
    mustChangePassword: true,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    passwordChangedAt: null,
  };
}

let seeding: Promise<void> | null = null;

/** Idempotent and safe under concurrent requests (each insert is an atomic "create if absent"). */
export function ensureSeeded(now: number = Date.now()): Promise<void> {
  seeding ??= run(now).catch((e) => {
    seeding = null; // allow a retry on the next request
    throw e;
  });
  return seeding;
}

async function run(now: number): Promise<void> {
  const env = getEnv();
  const store = getStore();
  const people: SeedPerson[] = [
    {
      staffId: env.BOOTSTRAP_ADMIN_STAFF_ID.toUpperCase(),
      name: "L&D Administrator",
      email: env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
      unit: "ld",
      segment: "back",
      title: "Learning & Development",
      role: "admin",
      isLineManager: false,
      tenureYears: 5,
    },
    ...(env.SEED_SAMPLE_STAFF === "true" ? SAMPLE_STAFF : []),
  ];
  // The bootstrap admin gets its own one-time secret (hashed), never the shared staff default.
  const adminHash = env.BOOTSTRAP_ADMIN_PASSWORD ? await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD) : null;
  for (const p of people) {
    let created = false;
    await store.update<UserRecord>("users", p.staffId, (cur) => {
      if (cur) return cur;
      created = true;
      const rec = newRecord(p, now);
      if (p.role === "admin" && p.staffId === env.BOOTSTRAP_ADMIN_STAFF_ID.toUpperCase() && adminHash) rec.passwordHash = adminHash;
      return rec;
    });
    if (created) await audit("system", "staff_seeded", p.staffId, { role: p.role }, now);
  }
}

/** For tests only. */
export function resetSeedState(): void {
  seeding = null;
}
