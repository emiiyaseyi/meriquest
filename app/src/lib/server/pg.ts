import "server-only";
import { Pool, type PoolConfig } from "pg";
import { assertCollection, assertId, type Store } from "./store-types";

/**
 * Postgres adapter for the Store interface. It talks to the database through the tiny `Db`
 * interface below, so the same code runs on a real server (node-postgres) and in tests (PGlite).
 * Every value reaches SQL as a bound parameter: nothing user-controlled is ever concatenated.
 */
export interface Queryable {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
}

/* ------------------------------ connection settings ------------------------------ */

export interface PgConnection {
  config: PoolConfig;
  warnings: string[];
}

/**
 * Turn DATABASE_URL into pool settings. TLS is always verified (certificate and host name) unless
 * the URL explicitly asks otherwise, and production refuses `sslmode=disable` and `no-verify`.
 * Errors never include the URL (it contains the password).
 */
export function pgConnection(databaseUrl: string, nodeEnv: string): PgConnection {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid connection string");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new Error("DATABASE_URL must start with postgres:// or postgresql://");
  const mode = (url.searchParams.get("sslmode") ?? "require").toLowerCase();
  const known = ["disable", "require", "verify-ca", "verify-full", "no-verify"];
  if (!known.includes(mode)) throw new Error("DATABASE_URL has an unknown sslmode");
  const insecure = mode === "disable" || mode === "no-verify";
  if (insecure && nodeEnv === "production") throw new Error("Production requires a verified TLS connection to the database");
  const warnings: string[] = [];
  if (insecure) warnings.push("Database TLS verification is off (development only)");
  // We set TLS ourselves, so remove sslmode (node-postgres would otherwise reinterpret it).
  url.searchParams.delete("sslmode");
  return {
    config: {
      connectionString: url.toString(),
      ssl: mode === "disable" ? false : { rejectUnauthorized: mode !== "no-verify" },
      // Serverless functions: a few short-lived connections per instance keep us under the host's cap.
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      // Client-side limit. (A server-side statement_timeout is sent as a startup option, which
      // connection poolers such as pooled.db.prisma.io may reject.)
      query_timeout: 15_000,
    },
    warnings,
  };
}

export function createPgDb(databaseUrl: string, nodeEnv: string): Db {
  const { config, warnings } = pgConnection(databaseUrl, nodeEnv);
  for (const w of warnings) console.warn(`[db] ${w}`);
  const pool = new Pool(config);
  // An idle-client error (for example the host restarting) must not crash the process.
  pool.on("error", () => console.error("[db] idle connection error"));
  return {
    query: (text, params) => pool.query(text, params as unknown[]) as never,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn({ query: (t, p) => client.query(t, p as unknown[]) as never });
        await client.query("COMMIT");
        return out;
      } catch (e) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* the original error matters more */
        }
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

/* ----------------------------------- the store ----------------------------------- */

export class PgStore implements Store {
  constructor(private readonly db: Db) {}

  async get<T>(col: string, id: string): Promise<T | null> {
    assertCollection(col);
    assertId(id);
    const r = await this.db.query<{ doc: T }>("SELECT doc FROM kv WHERE col = $1 AND id = $2", [col, id]);
    return r.rows[0]?.doc ?? null;
  }

  async put<T>(col: string, id: string, doc: T): Promise<void> {
    assertCollection(col);
    assertId(id);
    await this.db.query(
      "INSERT INTO kv (col, id, doc) VALUES ($1, $2, $3::jsonb) ON CONFLICT (col, id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()",
      [col, id, JSON.stringify(doc)],
    );
  }

  async delete(col: string, id: string): Promise<void> {
    assertCollection(col);
    assertId(id);
    await this.db.query("DELETE FROM kv WHERE col = $1 AND id = $2", [col, id]);
  }

  async list<T>(col: string): Promise<T[]> {
    assertCollection(col);
    const r = await this.db.query<{ doc: T }>("SELECT doc FROM kv WHERE col = $1 ORDER BY id", [col]);
    return r.rows.map((x) => x.doc);
  }

  /**
   * Atomic read-modify-write. A per-key advisory lock (held until the transaction ends) makes
   * concurrent updates to the same key queue up, including when the row does not exist yet, which a
   * plain row lock cannot do.
   */
  async update<T>(col: string, id: string, fn: (current: T | null) => T | null): Promise<T | null> {
    assertCollection(col);
    assertId(id);
    return this.db.tx(async (q) => {
      await q.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${col}:${id}`]);
      const cur = await q.query<{ doc: T }>("SELECT doc FROM kv WHERE col = $1 AND id = $2", [col, id]);
      const next = fn(cur.rows[0]?.doc ?? null);
      if (next === null) {
        await q.query("DELETE FROM kv WHERE col = $1 AND id = $2", [col, id]);
        return null;
      }
      await q.query(
        "INSERT INTO kv (col, id, doc) VALUES ($1, $2, $3::jsonb) ON CONFLICT (col, id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()",
        [col, id, JSON.stringify(next)],
      );
      return JSON.parse(JSON.stringify(next)) as T;
    });
  }
}
