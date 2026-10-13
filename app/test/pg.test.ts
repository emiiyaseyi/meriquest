import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PgStore, pgConnection, type Db } from "@/lib/server/pg";
import { setStoreForTests } from "@/lib/server/store";
import { resetEnvCache } from "@/lib/server/env";
import { resetSeedState, ensureSeeded } from "@/lib/server/seed";
import { authenticate, changePassword } from "@/lib/server/auth/service";
import { recentAudit } from "@/lib/server/audit";
import { DEFAULT_PW, IP, NEW_PW } from "./helpers";

const MIGRATION = readFileSync(new URL("../db/migrations/0001_kv.sql", import.meta.url), "utf8");

let pg: PGlite;
const makeDb = (): Db => ({
  query: (t, p) => pg.query(t, p as unknown[]) as never,
  tx: (fn) => pg.transaction((tx) => fn({ query: (t, p) => tx.query(t, p as unknown[]) as never })),
});

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(MIGRATION);
});
afterAll(async () => {
  await pg.close();
});

describe("migration", () => {
  it("is safe to run twice", async () => {
    await expect(pg.exec(MIGRATION)).resolves.toBeDefined();
  });

  it("turns row level security on with no policies (nothing readable through a public API)", async () => {
    const t = await pg.query<{ relrowsecurity: boolean }>("SELECT relrowsecurity FROM pg_class WHERE relname = 'kv'");
    expect(t.rows[0].relrowsecurity).toBe(true);
    const pol = await pg.query("SELECT 1 FROM pg_policies WHERE tablename = 'kv'");
    expect(pol.rows).toHaveLength(0);
  });

  it("the database itself refuses bad collection names and oversized ids", async () => {
    await expect(pg.query("INSERT INTO kv (col, id, doc) VALUES ('Bad Name', 'x', '{}')")).rejects.toThrow();
    await expect(pg.query("INSERT INTO kv (col, id, doc) VALUES ('ok', $1, '{}')", ["x".repeat(201)])).rejects.toThrow();
    await expect(pg.query("INSERT INTO kv (col, id, doc) VALUES ('ok', '', '{}')")).rejects.toThrow();
  });
});

describe("PgStore", () => {
  it("stores, reads, lists, overwrites and deletes", async () => {
    const s = new PgStore(makeDb());
    await s.put("things", "a", { n: 1, tags: ["x"] });
    await s.put("things", "b", { n: 2 });
    expect(await s.get("things", "a")).toEqual({ n: 1, tags: ["x"] });
    expect(await s.get("things", "missing")).toBeNull();
    expect((await s.list<{ n: number }>("things")).map((d) => d.n)).toEqual([1, 2]);
    await s.put("things", "a", { n: 10 });
    expect(await s.get("things", "a")).toEqual({ n: 10 });
    await s.delete("things", "a");
    expect(await s.get("things", "a")).toBeNull();
    await s.delete("things", "never-existed"); // no error
  });

  it("keeps collections apart", async () => {
    const s = new PgStore(makeDb());
    await s.put("alpha", "1", { v: "a" });
    await s.put("beta", "1", { v: "b" });
    expect(await s.get("alpha", "1")).toEqual({ v: "a" });
    expect(await s.get("beta", "1")).toEqual({ v: "b" });
    expect(await s.list("alpha")).toHaveLength(1);
  });

  it("update is atomic under concurrency, including the first write to a missing key", async () => {
    const s = new PgStore(makeDb());
    await Promise.all(Array.from({ length: 30 }, () => s.update<{ n: number }>("counters", "c", (cur) => ({ n: (cur?.n ?? 0) + 1 }))));
    expect(await s.get("counters", "c")).toEqual({ n: 30 });
  });

  it("update returning null deletes, and a throwing callback rolls back", async () => {
    const s = new PgStore(makeDb());
    await s.put("things", "x", { n: 1 });
    await expect(
      s.update("things", "x", () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await s.get("things", "x")).toEqual({ n: 1 }); // unchanged
    expect(await s.update("things", "x", () => null)).toBeNull();
    expect(await s.get("things", "x")).toBeNull();
  });

  it("rejects dangerous names before any SQL runs", async () => {
    const s = new PgStore(makeDb());
    for (const col of ["../etc", "a/b", "A", "", "x y", "a.json", "a;DROP TABLE kv", "a'--"]) await expect(s.put(col, "id", {})).rejects.toThrow();
    for (const id of ["__proto__", "constructor", "prototype", ""]) await expect(s.put("things", id, {})).rejects.toThrow();
  });

  it("treats hostile ids and values as plain data, never as SQL", async () => {
    const s = new PgStore(makeDb());
    const evil = "x'); DROP TABLE kv; --";
    await s.put("things", evil, { note: "'; DELETE FROM kv; --", n: 1 });
    expect(await s.get("things", evil)).toEqual({ note: "'; DELETE FROM kv; --", n: 1 });
    expect((await pg.query("SELECT count(*)::int AS c FROM kv")).rows[0]).toMatchObject({ c: expect.any(Number) });
    expect((await pg.query("SELECT to_regclass('public.kv') AS t")).rows[0]).toMatchObject({ t: "kv" });
  });

  it("does not alias stored objects", async () => {
    const s = new PgStore(makeDb());
    const doc = { list: [1] };
    await s.put("things", "alias", doc);
    doc.list.push(2);
    expect(await s.get("things", "alias")).toEqual({ list: [1] });
  });
});

describe("the whole app on the Postgres adapter", () => {
  it("seeds, signs in, forces a password change, and audits", async () => {
    const pgdb = new PGlite();
    await pgdb.exec(MIGRATION);
    const db: Db = {
      query: (t, p) => pgdb.query(t, p as unknown[]) as never,
      tx: (fn) => pgdb.transaction((tx) => fn({ query: (t, p) => tx.query(t, p as unknown[]) as never })),
    };
    resetEnvCache();
    resetSeedState();
    setStoreForTests(new PgStore(db));
    await ensureSeeded(1_000);
    const login = await authenticate({ identifier: "MS1001", password: DEFAULT_PW }, { ip: IP }, 2_000);
    expect(login.ok && login.user.mustChangePassword).toBe(true);
    expect((await authenticate({ identifier: "MS1001", password: "wrong-pass-1" }, { ip: IP }, 3_000)).ok).toBe(false);
    const ch = await changePassword("MS1001", { current: DEFAULT_PW, next: NEW_PW, confirm: NEW_PW }, 4_000);
    expect(ch.ok).toBe(true);
    expect((await authenticate({ identifier: "MS1001", password: NEW_PW }, { ip: IP }, 5_000)).ok).toBe(true);
    expect((await recentAudit()).some((e) => e.action === "password_changed")).toBe(true);
    setStoreForTests(null);
    await pgdb.close();
  });
});

describe("pgConnection", () => {
  const url = "postgres://user:secret@pooled.db.example.io:5432/postgres?sslmode=require";

  it("verifies the TLS certificate by default and strips sslmode", () => {
    const { config } = pgConnection(url, "production");
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.connectionString).not.toContain("sslmode");
    expect(config.connectionString).toContain("pooled.db.example.io");
    expect(config.max).toBe(3);
  });

  it("defaults to verified TLS when sslmode is missing", () => {
    expect(pgConnection("postgres://u:p@h.example.io/db", "production").config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("refuses disabled or unverified TLS in production, allows it with a warning in development", () => {
    for (const mode of ["disable", "no-verify"]) {
      expect(() => pgConnection(`postgres://u:p@h.example.io/db?sslmode=${mode}`, "production")).toThrow(/verified TLS/);
      const dev = pgConnection(`postgres://u:p@h.example.io/db?sslmode=${mode}`, "development");
      expect(dev.warnings).toHaveLength(1);
    }
  });

  it("rejects wrong schemes and unknown modes", () => {
    expect(() => pgConnection("mysql://u:p@h/db", "development")).toThrow();
    expect(() => pgConnection("postgres://u:p@h/db?sslmode=banana", "development")).toThrow();
    expect(() => pgConnection("not a url", "development")).toThrow();
  });

  it("never puts the connection string (or password) in an error message", () => {
    for (const bad of ["postgres://user:topsecret@h/db?sslmode=banana", "mysql://user:topsecret@h/db", "user:topsecret@@@"]) {
      try {
        pgConnection(bad, "production");
      } catch (e) {
        expect(String((e as Error).message)).not.toContain("topsecret");
      }
    }
  });
});
