// Checks the database connection and the kv table with a harmless round trip. Run with:
//   npm run db:check
// Prints only non-secret facts (never the connection string or password).
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in app/.env.local.");
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
console.log(`Host: ${u.hostname}:${u.port || 5432}  TLS: ${ssl === false ? "off" : ssl.rejectUnauthorized ? "verified" : "unverified"}`);

const client = new pg.Client({ connectionString: u.toString(), ssl, connectionTimeoutMillis: 15_000 });
let failed = false;
try {
  const t0 = Date.now();
  await client.connect();
  console.log(`Connected in ${Date.now() - t0} ms`);
  const v = await client.query("SELECT version() AS v, current_database() AS db");
  console.log(`Server: ${v.rows[0].v.split(",")[0]}  Database: ${v.rows[0].db}`);

  const t = await client.query("SELECT to_regclass('public.kv') AS kv");
  if (!t.rows[0].kv) {
    console.log("Table kv: MISSING. Run: npm run db:migrate");
    process.exitCode = 2;
  } else {
    const rls = await client.query("SELECT relrowsecurity AS on FROM pg_class WHERE relname = 'kv'");
    const n = await client.query("SELECT count(*)::int AS c FROM kv");
    console.log(`Table kv: present, row level security ${rls.rows[0].on ? "ON" : "OFF"}, ${n.rows[0].c} row(s)`);

    // Round trip in a throwaway collection, then clean up.
    const id = `check-${Date.now()}`;
    await client.query("INSERT INTO kv (col, id, doc) VALUES ('healthcheck', $1, $2::jsonb)", [id, JSON.stringify({ ok: true })]);
    const r = await client.query("SELECT doc FROM kv WHERE col = 'healthcheck' AND id = $1", [id]);
    await client.query("DELETE FROM kv WHERE col = 'healthcheck' AND id = $1", [id]);
    console.log(`Round trip (write, read, delete): ${r.rows[0]?.doc?.ok === true ? "OK" : "FAILED"}`);

    // Advisory lock functions must work through the pooler (the adapter's atomic updates rely on them).
    await client.query("BEGIN");
    const lock = await client.query("SELECT pg_advisory_xact_lock(hashtextextended('check:lock', 0)) IS NOT NULL AS ok");
    await client.query("COMMIT");
    console.log(`Advisory transaction lock: ${lock.rows[0].ok ? "OK" : "FAILED"}`);
  }
} catch (e) {
  failed = true;
  const code = e && typeof e === "object" && "code" in e ? ` (${e.code})` : "";
  console.error(`Check failed${code}: ${e instanceof Error ? e.message.replace(/postgres(ql)?:\/\/\S+/gi, "<url hidden>") : "unknown error"}`);
} finally {
  await client.end().catch(() => undefined);
}
if (failed) process.exitCode = 1;
