/**
 * Storage boundary. All persistence goes through this interface so adapters (local files, in-memory
 * for tests, Postgres) can be swapped without touching business logic.
 */
export interface Store {
  get<T>(col: string, id: string): Promise<T | null>;
  put<T>(col: string, id: string, doc: T): Promise<void>;
  delete(col: string, id: string): Promise<void>;
  list<T>(col: string): Promise<T[]>;
  /** Atomic read-modify-write. Return null to delete. Returns the stored value. */
  update<T>(col: string, id: string, fn: (current: T | null) => T | null): Promise<T | null>;
}

const COLLECTION_RE = /^[a-z][a-z0-9_]{0,40}$/;
const FORBIDDEN_IDS = new Set(["__proto__", "constructor", "prototype"]);

export function assertCollection(col: string): void {
  if (!COLLECTION_RE.test(col)) throw new Error("Invalid collection name");
}

export function assertId(id: string): void {
  if (typeof id !== "string" || id.length < 1 || id.length > 200 || FORBIDDEN_IDS.has(id)) {
    throw new Error("Invalid id");
  }
}
