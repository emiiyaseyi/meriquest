import { resetEnvCache } from "@/lib/server/env";
import { MemoryStore, setStoreForTests } from "@/lib/server/store";
import { ensureSeeded, resetSeedState } from "@/lib/server/seed";
import { getUser } from "@/lib/server/auth/users";
import { toDTO, type UserDTO } from "@/lib/server/types";

export const DEFAULT_PW = "TestDefault#2026!x";
export const NEW_PW = "Gr33n-Branch-Rising";
export const IP = "203.0.113.7";

/** Fresh in-memory store, fresh env cache, sample staff seeded. */
export async function freshWorld(): Promise<void> {
  resetEnvCache();
  resetSeedState();
  setStoreForTests(new MemoryStore());
  await ensureSeeded(1_000);
}

export async function dto(staffId: string): Promise<UserDTO> {
  const u = await getUser(staffId);
  if (!u) throw new Error(`no such user ${staffId}`);
  return toDTO(u);
}
