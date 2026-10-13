import { describe, expect, it } from "vitest";
import { withConnectRetry } from "@/lib/server/pg";

describe("database connect retry", () => {
  it("tries again after a connection timeout and then succeeds", async () => {
    let n = 0;
    const out = await withConnectRetry(async () => {
      if (++n < 3) throw new Error("Connection terminated due to connection timeout");
      return "ok";
    }, 1);
    expect(out).toBe("ok");
    expect(n).toBe(3);
  });
  it("gives up after three tries", async () => {
    let n = 0;
    await expect(withConnectRetry(async () => { n++; throw new Error("Connection terminated due to connection timeout"); }, 1)).rejects.toThrow();
    expect(n).toBe(3);
  });
  it("never retries an error that is not about connecting", async () => {
    let n = 0;
    await expect(withConnectRetry(async () => { n++; throw new Error('duplicate key value violates unique constraint'); }, 1)).rejects.toThrow();
    expect(n).toBe(1);
  });
});
