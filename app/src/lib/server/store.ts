import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getEnv } from "./env";
import { assertCollection, assertId, type Store } from "./store-types";
import { createPgDb, PgStore } from "./pg";

// The interface and id/collection checks live in store-types.ts (so the Postgres adapter can use
// them without a circular import). They are re-exported here for the rest of the app.
export { assertCollection, assertId };
export type { Store };

/**
 * Adapters: Postgres (production and shared dev), local JSON files (single-process dev only: it
 * cannot work on serverless hosts such as Netlify), and in-memory (tests).
 */

/* ---------------------------- in-memory (tests) ---------------------------- */

export class MemoryStore implements Store {
  private data = new Map<string, Map<string, string>>();
  private chain: Promise<unknown> = Promise.resolve();

  private run<T>(fn: () => T): Promise<T> {
    const next = this.chain.then(fn, fn);
    this.chain = next.catch(() => undefined);
    return next;
  }

  private col(col: string): Map<string, string> {
    assertCollection(col);
    let m = this.data.get(col);
    if (!m) {
      m = new Map();
      this.data.set(col, m);
    }
    return m;
  }

  async get<T>(col: string, id: string): Promise<T | null> {
    assertId(id);
    return this.run(() => {
      const raw = this.col(col).get(id);
      return raw === undefined ? null : (JSON.parse(raw) as T);
    });
  }

  async put<T>(col: string, id: string, doc: T): Promise<void> {
    assertId(id);
    return this.run(() => {
      this.col(col).set(id, JSON.stringify(doc));
    });
  }

  async delete(col: string, id: string): Promise<void> {
    assertId(id);
    return this.run(() => {
      this.col(col).delete(id);
    });
  }

  list<T>(col: string): Promise<T[]> {
    return this.run(() => [...this.col(col).values()].map((r) => JSON.parse(r) as T));
  }

  async update<T>(col: string, id: string, fn: (current: T | null) => T | null): Promise<T | null> {
    assertId(id);
    return this.run(() => {
      const m = this.col(col);
      const raw = m.get(id);
      const next = fn(raw === undefined ? null : (JSON.parse(raw) as T));
      if (next === null) {
        m.delete(id);
        return null;
      }
      m.set(id, JSON.stringify(next));
      return JSON.parse(JSON.stringify(next)) as T;
    });
  }
}

/* ------------------------------ file (local dev) ------------------------------ */

const g = globalThis as unknown as { __mqFileChain?: Promise<unknown> };

export class FileStore implements Store {
  private dir: string;

  constructor(dir: string) {
    this.dir = path.resolve(dir);
  }

  /** One queue per process so concurrent requests cannot interleave writes. */
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const prev = g.__mqFileChain ?? Promise.resolve();
    const next = prev.then(fn, fn);
    g.__mqFileChain = next.catch(() => undefined);
    return next;
  }

  private file(col: string): string {
    assertCollection(col);
    return path.join(this.dir, `${col}.json`);
  }

  private async read(col: string): Promise<Map<string, unknown>> {
    let text: string;
    try {
      text = await fs.readFile(this.file(col), "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return new Map();
      throw e;
    }
    // A corrupt file must fail loudly: silently treating it as empty would wipe data on the next write.
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Store file for "${col}" is corrupt`);
    }
    return new Map(Object.entries(parsed as Record<string, unknown>));
  }

  private async write(col: string, map: Map<string, unknown>): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const target = this.file(col);
    const tmp = `${target}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(Object.fromEntries(map)), { encoding: "utf8", mode: 0o600 });
    // Cloud-synced folders (OneDrive) can briefly lock files: retry a few times.
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(tmp, target);
        return;
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (attempt < 6 && (code === "EPERM" || code === "EBUSY" || code === "EACCES")) {
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
          continue;
        }
        await fs.rm(tmp, { force: true });
        throw e;
      }
    }
  }

  async get<T>(col: string, id: string): Promise<T | null> {
    assertId(id);
    return this.run(async () => ((await this.read(col)).get(id) as T | undefined) ?? null);
  }

  async put<T>(col: string, id: string, doc: T): Promise<void> {
    assertId(id);
    return this.run(async () => {
      const m = await this.read(col);
      m.set(id, doc);
      await this.write(col, m);
    });
  }

  async delete(col: string, id: string): Promise<void> {
    assertId(id);
    return this.run(async () => {
      const m = await this.read(col);
      if (m.delete(id)) await this.write(col, m);
    });
  }

  list<T>(col: string): Promise<T[]> {
    return this.run(async () => [...(await this.read(col)).values()] as T[]);
  }

  async update<T>(col: string, id: string, fn: (current: T | null) => T | null): Promise<T | null> {
    assertId(id);
    return this.run(async () => {
      const m = await this.read(col);
      const next = fn((m.get(id) as T | undefined) ?? null);
      if (next === null) {
        if (m.delete(id)) await this.write(col, m);
        return null;
      }
      m.set(id, next);
      await this.write(col, m);
      return next;
    });
  }
}

/* --------------------------------- accessor --------------------------------- */

const gs = globalThis as unknown as { __mqStore?: Store };

export function getStore(): Store {
  if (!gs.__mqStore) {
    const env = getEnv();
    if (env.STORE === "postgres") {
      // getEnv() has already guaranteed DATABASE_URL is present for this mode.
      gs.__mqStore = new PgStore(createPgDb(env.DATABASE_URL as string, env.NODE_ENV));
    } else {
      gs.__mqStore = env.STORE === "memory" ? new MemoryStore() : new FileStore(env.DATA_DIR);
    }
  }
  return gs.__mqStore;
}

/** For tests only. */
export function setStoreForTests(store: Store | null): void {
  gs.__mqStore = store ?? undefined;
}
