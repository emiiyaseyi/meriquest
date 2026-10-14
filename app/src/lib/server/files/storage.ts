import "server-only";
import { getStore } from "../store";
import { getEnv } from "../env";

/**
 * Where uploaded files (concern evidence) live. In development and tests they stay in the database. When
 * SUPABASE_URL and SUPABASE_SERVICE_KEY are set they go to a private Supabase Storage bucket instead, so large files
 * do not fill the database and can have their own access rules. Files are never public: they are only ever read back by
 * the server and handed to an admin as a download.
 */
export interface FileStorage {
  put(key: string, bytes: Buffer, type: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const SAFE_KEY = /^[A-Za-z0-9_:.-]{1,120}$/;
const assertKey = (key: string) => {
  if (!SAFE_KEY.test(key)) throw new Error("Invalid file key");
};

interface DbFile {
  id: string;
  type: string;
  data: string; // base64
}

export class DbFileStorage implements FileStorage {
  async put(key: string, bytes: Buffer, type: string): Promise<void> {
    assertKey(key);
    await getStore().put<DbFile>("stored_files", key, { id: key, type, data: bytes.toString("base64") });
  }
  async get(key: string): Promise<Buffer | null> {
    assertKey(key);
    const d = await getStore().get<DbFile>("stored_files", key);
    return d ? Buffer.from(d.data, "base64") : null;
  }
  async delete(key: string): Promise<void> {
    assertKey(key);
    await getStore().delete("stored_files", key);
  }
}

export class SupabaseFileStorage implements FileStorage {
  constructor(
    private readonly base: string,
    private readonly serviceKey: string,
    private readonly bucket: string,
  ) {}

  private url(key: string): string {
    assertKey(key);
    return `${this.base.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(this.bucket)}/${encodeURIComponent(key)}`;
  }
  private headers(extra?: Record<string, string>): Record<string, string> {
    return { Authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey, ...extra };
  }

  async put(key: string, bytes: Buffer, type: string): Promise<void> {
    const res = await fetch(this.url(key), { method: "POST", headers: this.headers({ "Content-Type": type, "x-upsert": "true" }), body: new Uint8Array(bytes), signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`File storage refused the upload (${res.status})`);
  }
  async get(key: string): Promise<Buffer | null> {
    const res = await fetch(this.url(key), { headers: this.headers(), signal: AbortSignal.timeout(20_000) });
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw new Error(`File storage could not read the file (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  async delete(key: string): Promise<void> {
    const res = await fetch(this.url(key), { method: "DELETE", headers: this.headers(), signal: AbortSignal.timeout(20_000) });
    if (!res.ok && res.status !== 404) throw new Error(`File storage could not delete the file (${res.status})`);
  }
}

export function getFileStorage(): FileStorage {
  const env = getEnv();
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) return new SupabaseFileStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, env.EVIDENCE_BUCKET);
  return new DbFileStorage();
}
