import "server-only";
import { getStore } from "../store";
import { audit } from "../audit";
import { CONFIG, isConfigKey, type ConfigKey, type ConfigValue } from "./definitions";

interface StoredConfig {
  value: unknown;
  version: number;
  updatedAt: number;
  updatedBy: string;
}

export interface ConfigHistoryEntry extends StoredConfig {
  key: string;
}

/** Current value of a config key: the admin's saved value, or the seeded default. */
export async function getConfig<K extends ConfigKey>(key: K): Promise<ConfigValue<K>> {
  const def = CONFIG[key];
  const stored = await getStore().get<StoredConfig>("config", key);
  if (stored) {
    const parsed = def.schema.safeParse(stored.value);
    if (parsed.success) return parsed.data as ConfigValue<K>;
    // A stored value that no longer matches the schema (e.g. after an upgrade) must never crash
    // the game or weaken a policy silently: fall back to the safe default and tell operators.
    console.error(`[config] stored value for "${key}" failed validation; using default`);
  }
  return def.schema.parse(def.default) as ConfigValue<K>;
}

export async function getConfigMeta(key: ConfigKey): Promise<{ version: number; updatedAt: number | null; updatedBy: string | null }> {
  const stored = await getStore().get<StoredConfig>("config", key);
  return { version: stored?.version ?? 0, updatedAt: stored?.updatedAt ?? null, updatedBy: stored?.updatedBy ?? null };
}

export async function getConfigJson(key: ConfigKey): Promise<string> {
  return JSON.stringify(await getConfig(key), null, 2);
}

export type SetConfigResult = { ok: true; version: number } | { ok: false; errors: string[] };

export const MAX_CONFIG_JSON_BYTES = 100_000;

/**
 * Validate and save a config value. Authorisation is the CALLER's job (admin check lives in the
 * admin DAL); this function only guarantees that nothing invalid is ever stored.
 */
export async function setConfig(
  key: string,
  rawJson: string,
  actorStaffId: string,
  now: number = Date.now(),
): Promise<SetConfigResult> {
  if (!isConfigKey(key)) return { ok: false, errors: ["Unknown setting"] };
  if (typeof rawJson !== "string" || rawJson.length > MAX_CONFIG_JSON_BYTES) {
    return { ok: false, errors: ["Value is too large"] };
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(rawJson);
  } catch {
    return { ok: false, errors: ["That is not valid JSON"] };
  }
  const parsed = CONFIG[key].schema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(value)"}: ${i.message}`),
    };
  }
  const saved = await getStore().update<StoredConfig>("config", key, (cur) => ({
    value: parsed.data,
    version: (cur?.version ?? 0) + 1,
    updatedAt: now,
    updatedBy: actorStaffId,
  }));
  const version = saved?.version ?? 1;
  await getStore().put<ConfigHistoryEntry>("config_history", `${key}@${version}`, {
    key,
    value: parsed.data,
    version,
    updatedAt: now,
    updatedBy: actorStaffId,
  });
  await audit(actorStaffId, "config_changed", key, { version }, now);
  return { ok: true, version };
}

/** Restore the seeded default for a key (stored as a new version so history is kept). */
export async function resetConfigToDefault(key: string, actorStaffId: string, now: number = Date.now()): Promise<SetConfigResult> {
  if (!isConfigKey(key)) return { ok: false, errors: ["Unknown setting"] };
  return setConfig(key, JSON.stringify(CONFIG[key].default), actorStaffId, now);
}
