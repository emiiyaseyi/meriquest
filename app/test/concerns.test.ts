import { beforeEach, describe, expect, it } from "vitest";
import { getStore } from "@/lib/server/store";
import { countNewConcerns, getConcern, getEvidenceFile, listConcerns, listMyConcerns, submitConcern, updateConcern, type ConcernInput } from "@/lib/server/concerns/service";
import { cleanText, safeFileName, sniffEvidence } from "@/lib/concerns";
import { freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-13T11:00:00+01:00");
const reporter = { staffId: "MS7001", name: "Amaka Okoro", unit: "wealth", role: "player" as const };
const other = { staffId: "MS7002", name: "Bayo Ade", unit: "wealth", role: "player" as const };
const admin = { staffId: "MS0001", name: "Admin", unit: "it", role: "admin" as const };

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n");

const base = (over: Partial<ConcernInput> = {}): ConcernInput => ({
  category: "harassment",
  description: "A colleague kept sending me unwelcome messages after I asked them to stop.",
  about: "A colleague",
  occurredAt: NOW - 3_600_000,
  files: [],
  ...over,
});

describe("evidence rules", () => {
  it("recognises files by their contents, not their names", () => {
    expect(sniffEvidence(PNG)).toBe("image/png");
    expect(sniffEvidence(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffEvidence(PDF)).toBe("application/pdf");
    expect(sniffEvidence(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("image/webp");
    expect(sniffEvidence(new TextEncoder().encode("MZ\x90\x00 executable"))).toBeNull();
    expect(sniffEvidence(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffEvidence(new Uint8Array([]))).toBeNull();
  });
  it("makes file names safe", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\Users\\me\\evil<script>.png")).toBe("evilscript.png");
    expect(safeFileName("..")).toBe("evidence");
    expect(safeFileName("a".repeat(200) + ".png").length).toBeLessThanOrEqual(60);
  });
  it("cleans text", () => {
    expect(cleanText("  hi\u0000 there\r\nnext  ", 100)).toBe("hi there\nnext");
    expect(cleanText(5, 10)).toBe("");
    expect(cleanText("x".repeat(50), 10)).toHaveLength(10);
  });
});

describe("sending a concern", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("records who, what, when it happened, when it arrived and where", async () => {
    const r = await submitConcern(reporter, base(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.number).toBe("CR-0001");
    const c = await getConcern(admin, r.id);
    expect(c).toMatchObject({ reporterId: "MS7001", reporterName: "Amaka Okoro", status: "new", submittedAt: NOW, occurredAt: NOW - 3_600_000 });
    expect(c?.context.scene).toBeTruthy();
    expect((await submitConcern(reporter, base(), NOW + 1000)).ok && true).toBe(true);
  });

  it("numbers concerns in order", async () => {
    const a = await submitConcern(reporter, base(), NOW);
    const b = await submitConcern(other, base(), NOW);
    expect([a, b].map((x) => (x.ok ? x.number : ""))).toEqual(["CR-0001", "CR-0002"]);
  });

  it("stores evidence with its type, size, hash and the file's own timestamp", async () => {
    const r = await submitConcern(reporter, base({ files: [{ name: "chat screenshot.png", bytes: PNG, lastModified: NOW - 86_400_000 }, { name: "../note.pdf", bytes: PDF, lastModified: null }] }), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = await getConcern(admin, r.id);
    expect(c?.evidence).toHaveLength(2);
    expect(c?.evidence[0]).toMatchObject({ n: 1, type: "image/png", name: "chat screenshot.png", fileModifiedAt: NOW - 86_400_000, addedAt: NOW });
    expect(c?.evidence[1]).toMatchObject({ n: 2, type: "application/pdf", name: "note.pdf", fileModifiedAt: null });
    expect(c?.evidence[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    const f = await getEvidenceFile(admin, r.id, 1, NOW + 5);
    expect(f?.type).toBe("image/png");
    expect([...(f?.bytes ?? [])]).toEqual([...PNG]);
  });

  it("refuses bad input", async () => {
    const cases: [Partial<ConcernInput>, RegExp][] = [
      [{ category: "nonsense" }, /kind of concern/],
      [{ category: 5 }, /kind of concern/],
      [{ description: "too short" }, /at least 20/],
      [{ occurredAt: NOW + 3_600_000 }, /already passed/],
      [{ occurredAt: NOW - 400 * 86_400_000 }, /already passed/],
      [{ occurredAt: "yesterday" }, /already passed/],
      [{ files: [{ name: "x.png", bytes: new TextEncoder().encode("<script>alert(1)</script>"), lastModified: null }] }, /PNG, JPEG or WebP/],
      [{ files: [{ name: "x.png", bytes: new Uint8Array([]), lastModified: null }] }, /empty/],
      [{ files: [{ name: "big.png", bytes: new Uint8Array(2 * 1024 * 1024 + 1).fill(1).map((_, i) => (i < 8 ? PNG[i] : 1)), lastModified: null }] }, /2 MB/],
      [{ files: Array.from({ length: 4 }, () => ({ name: "x.png", bytes: PNG, lastModified: null })) }, /up to 3/],
    ];
    for (const [over, msg] of cases) {
      const r = await submitConcern(reporter, base(over), NOW);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(msg);
    }
    expect(await listMyConcerns(reporter)).toHaveLength(0);
  });

  it("limits how many a person can send in a day", async () => {
    for (let i = 0; i < 5; i++) expect((await submitConcern(reporter, base(), NOW + i)).ok).toBe(true);
    const sixth = await submitConcern(reporter, base(), NOW + 10);
    expect(sixth.ok).toBe(false);
    expect((await submitConcern(other, base(), NOW + 11)).ok).toBe(true);
  });

  it("keeps hostile text as plain text (never HTML)", async () => {
    const r = await submitConcern(reporter, base({ about: "<img src=x onerror=alert(1)>", description: "<script>alert(1)</script> this is a long enough description" }), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = await getConcern(admin, r.id);
    // Stored as given; the pages render it as text, and React escapes it
    expect(c?.description).toContain("<script>");
  });
});

describe("who can read concerns", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("lets only an admin list, open and download", async () => {
    const r = await submitConcern(reporter, base({ files: [{ name: "a.png", bytes: PNG, lastModified: null }] }), NOW);
    if (!r.ok) throw new Error("setup");
    await expect(listConcerns(reporter)).rejects.toThrow("Forbidden");
    await expect(getConcern(reporter, r.id)).rejects.toThrow("Forbidden");
    await expect(getEvidenceFile(other, r.id, 1)).rejects.toThrow("Forbidden");
    await expect(countNewConcerns(reporter)).rejects.toThrow("Forbidden");
    await expect(updateConcern(reporter, r.id, "resolved", "x")).rejects.toThrow("Forbidden");
    expect((await listConcerns(admin)).map((c) => c.number)).toEqual(["CR-0001"]);
    expect(await countNewConcerns(admin)).toBe(1);
  });

  it("shows a reporter only their own reports and only the status", async () => {
    await submitConcern(reporter, base(), NOW);
    await submitConcern(other, base(), NOW);
    const mine = await listMyConcerns(reporter);
    expect(mine).toHaveLength(1);
    expect(Object.keys(mine[0]).sort()).toEqual(["category", "number", "status", "submittedAt"]);
  });

  it("rejects ids and file numbers that are not real", async () => {
    expect(await getConcern(admin, "../../users/MS0001")).toBeNull();
    expect(await getConcern(admin, "c_nothere")).toBeNull();
    expect(await getEvidenceFile(admin, "c_" + "0".repeat(18), 1)).toBeNull();
    const r = await submitConcern(reporter, base({ files: [{ name: "a.png", bytes: PNG, lastModified: null }] }), NOW);
    if (!r.ok) throw new Error("setup");
    expect(await getEvidenceFile(admin, r.id, 2)).toBeNull();
    expect(await getEvidenceFile(admin, r.id, 0)).toBeNull();
    expect(await getEvidenceFile(admin, r.id, 1.5)).toBeNull();
  });

  it("refuses a file whose stored contents no longer match what arrived", async () => {
    const r = await submitConcern(reporter, base({ files: [{ name: "a.png", bytes: PNG, lastModified: null }] }), NOW);
    if (!r.ok) throw new Error("setup");
    await getStore().put("concern_files", `${r.id}:1`, { id: `${r.id}:1`, concernId: r.id, n: 1, type: "image/png", data: Buffer.from("tampered").toString("base64") });
    expect(await getEvidenceFile(admin, r.id, 1)).toBeNull();
  });

  it("records the review: status, notes with who and when, and an audit trail", async () => {
    const r = await submitConcern(reporter, base(), NOW);
    if (!r.ok) throw new Error("setup");
    expect((await updateConcern(admin, r.id, "in_review", "Spoke to the reporter.", NOW + 1000)).ok).toBe(true);
    const c = await getConcern(admin, r.id);
    expect(c?.status).toBe("in_review");
    expect(c?.notes).toEqual([{ at: NOW + 1000, by: "MS0001", text: "Spoke to the reporter." }]);
    expect((await updateConcern(admin, r.id, "bogus", "")).ok).toBe(false);
    expect((await updateConcern(admin, "c_" + "1".repeat(18), "resolved", "")).ok).toBe(false);
    const events = (await getStore().list<{ action: string }>("audit")).map((e) => e.action);
    expect(events).toContain("concern.submitted");
    expect(events).toContain("concern.updated");
    expect((await listMyConcerns(reporter))[0].status).toBe("in_review");
  });
});
