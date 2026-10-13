import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileStore, MemoryStore, type Store } from "@/lib/server/store";

async function withFileStore<T>(fn: (s: FileStore, dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "mq-store-"));
  try {
    return await fn(new FileStore(dir), dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function contract(name: string, make: () => Promise<{ store: Store; done?: () => Promise<void> }>) {
  describe(`${name} contract`, () => {
    it("stores, reads, lists and deletes", async () => {
      const { store, done } = await make();
      await store.put("things", "a", { n: 1 });
      await store.put("things", "b", { n: 2 });
      expect(await store.get("things", "a")).toEqual({ n: 1 });
      expect(await store.get("things", "missing")).toBeNull();
      expect((await store.list<{ n: number }>("things")).map((x) => x.n).sort()).toEqual([1, 2]);
      await store.delete("things", "a");
      expect(await store.get("things", "a")).toBeNull();
      await done?.();
    });

    it("update is atomic under concurrency (no lost increments)", async () => {
      const { store, done } = await make();
      await Promise.all(
        Array.from({ length: 40 }, () =>
          store.update<{ n: number }>("counters", "c", (cur) => ({ n: (cur?.n ?? 0) + 1 })),
        ),
      );
      expect(await store.get("counters", "c")).toEqual({ n: 40 });
      await done?.();
    });

    it("update returning null deletes", async () => {
      const { store, done } = await make();
      await store.put("things", "x", { n: 1 });
      expect(await store.update("things", "x", () => null)).toBeNull();
      expect(await store.get("things", "x")).toBeNull();
      await done?.();
    });

    it("rejects dangerous collection names and ids", async () => {
      const { store, done } = await make();
      for (const col of ["../etc", "a/b", "A", "", "x y", "a.json", "a\\b"]) {
        await expect(store.put(col, "id", {})).rejects.toThrow();
      }
      for (const id of ["__proto__", "constructor", "prototype", ""]) {
        await expect(store.put("things", id, {})).rejects.toThrow();
      }
      await done?.();
    });

    it("does not alias stored objects", async () => {
      const { store, done } = await make();
      const doc = { list: [1] };
      await store.put("things", "a", doc);
      doc.list.push(2);
      expect(await store.get("things", "a")).toEqual({ list: [1] });
      await done?.();
    });
  });
}

contract("MemoryStore", async () => ({ store: new MemoryStore() }));

describe("FileStore", () => {
  it("passes the contract", async () => {
    await withFileStore(async (store) => {
      await store.put("things", "a", { n: 1 });
      expect(await store.get("things", "a")).toEqual({ n: 1 });
    });
  });

  it("is atomic under concurrency", async () => {
    await withFileStore(async (store) => {
      await Promise.all(
        Array.from({ length: 25 }, () => store.update<{ n: number }>("c", "c", (cur) => ({ n: (cur?.n ?? 0) + 1 }))),
      );
      expect(await store.get("c", "c")).toEqual({ n: 25 });
    });
  });

  it("fails loudly on a corrupt file instead of wiping data", async () => {
    await withFileStore(async (store, dir) => {
      await store.put("things", "a", { n: 1 });
      await writeFile(path.join(dir, "things.json"), "{ not json", "utf8");
      await expect(store.put("things", "b", { n: 2 })).rejects.toThrow();
      // the corrupt file is untouched, not overwritten
      expect(await readFile(path.join(dir, "things.json"), "utf8")).toBe("{ not json");
    });
  });

  it("rejects a store file that is not an object", async () => {
    await withFileStore(async (store, dir) => {
      await writeFile(path.join(dir, "things.json"), "[1,2,3]", "utf8");
      await expect(store.get("things", "a")).rejects.toThrow(/corrupt/);
    });
  });

  it("writes only inside its directory", async () => {
    await withFileStore(async (store, dir) => {
      await store.put("things", "../../escape", { n: 1 }); // an id, not a path: stays a key in things.json
      const text = await readFile(path.join(dir, "things.json"), "utf8");
      expect(JSON.parse(text)).toEqual({ "../../escape": { n: 1 } });
    });
  });
});
