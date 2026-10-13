// Applies the SQL files in db/migrations once each, in order. Run with:
//   npm run db:migrate
// Reads DATABASE_URL from the environment (npm loads .env.local via --env-file).
// The connection string contains the password and is never printed.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in app/.env.local (see .env.example).");
  process.exit(1);
}

let u;
try {
  u = new URL(url);
} catch {
  console.error("DATABASE_URL is not a valid connection string.");
  process.exit(1);
}
const mode = (u.searchParams.get("sslmode") ?? "require").toLowerCase();
u.searchParams.delete("sslmode");
const ssl = mode === "disable" ? false : { rejectUnauthorized: mode !== "no-verify" };

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const files = (await readdir(dir)).filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();

const client = new pg.Client({ connectionString: u.toString(), ssl, connectionTimeoutMillis: 15_000 });
try {
  await client.connect();
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  let applied = 0;
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await readFile(path.join(dir, f), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      console.log(`applied ${f}`);
      applied++;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
  console.log(applied === 0 ? "Database is up to date." : `Done: ${applied} migration(s) applied.`);
} catch (e) {
  // Print the reason without the connection string.
  console.error(`Migration failed: ${e instanceof Error ? e.message : "unknown error"}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
