import { beforeEach, describe, expect, it } from "vitest";
import { checkMessage, cleanMessage, dmId, normaliseForFilter } from "@/lib/chat";
import { findPeople, getThread, listConversations, listReports, postMessage, reportMessage, reviewReport, countOpenChatReports, unmute } from "@/lib/server/chat/service";
import { listNotices } from "@/lib/server/notices/service";
import { chatSchema } from "@/lib/server/config/definitions";
import { DEFAULT_CHAT } from "@/lib/server/config/chat-content";
import { dto, freshWorld } from "./helpers";

const NOW = Date.parse("2026-10-14T11:00:00+01:00");
const opts = { blockedWords: ["idiot", "shut up"], blockLinks: true };

describe("chat rules", () => {
  it("ships valid settings", () => {
    expect(chatSchema.safeParse(DEFAULT_CHAT).success).toBe(true);
  });

  it("cleans messages and caps their length", () => {
    expect(cleanMessage("  hi\u0000 there\u202e\r\n\n\n\nbye  ", 100)).toBe("hi there\n\nbye");
    expect(cleanMessage(5, 10)).toBe("");
    expect(cleanMessage("x".repeat(50), 10)).toHaveLength(10);
  });

  it("blocks listed words even when disguised, but not harmless words that contain them", () => {
    expect(normaliseForFilter("1d1ot!")).toBe("idiot");
    expect(checkMessage("you are an idiot", opts).ok).toBe(false);
    expect(checkMessage("you are an 1d.i.o.t", opts).ok).toBe(false);
    expect(checkMessage("SHUT   UP", opts).ok).toBe(false);
    expect(checkMessage("you are an i d i o t", opts).ok).toBe(false);
    expect(checkMessage("an idiotic plan", opts).ok).toBe(true); // a different word
    expect(checkMessage("Good morning team", opts).ok).toBe(true);
    const bad = checkMessage("idiot", opts);
    expect(bad.ok === false && bad.reason).not.toMatch(/idiot/); // never repeats the word
  });

  it("blocks links and empty messages", () => {
    expect(checkMessage("see https://x.example/win", opts).ok).toBe(false);
    expect(checkMessage("see www.example.com", opts).ok).toBe(false);
    expect(checkMessage("see example.ng now", opts).ok).toBe(false);
    expect(checkMessage("", opts).ok).toBe(false);
  });

  it("gives the same conversation id both ways round", () => {
    expect(dmId("MS1001", "MS1002")).toBe(dmId("MS1002", "MS1001"));
  });
});

describe("chat service", () => {
  beforeEach(async () => {
    await freshWorld();
  });

  it("shows only the groups for a person's unit, and lets them post and read", async () => {
    const tolu = await dto("MS1001");
    const rows = await listConversations(tolu);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("g:everyone");
    expect(ids).toContain("g:cx");
    expect(ids).not.toContain("g:wealth");
    expect((await postMessage(tolu, "g:wealth", "hello", NOW)).ok).toBe(false); // not their group
    expect((await postMessage(tolu, "g:cx", "Good morning team", NOW)).ok).toBe(true);
    const t = await getThread(await dto("MS1003"), "g:cx");
    expect(t.ok && t.messages.map((m) => m.text)).toEqual(["Good morning team"]);
    expect((await getThread(await dto("MS2001"), "g:cx")).ok).toBe(false);
  });

  it("refuses blocked words, long floods and invalid conversations", async () => {
    const tolu = await dto("MS1001");
    expect((await postMessage(tolu, "g:everyone", "you idiot", NOW)).ok).toBe(false);
    expect((await postMessage(tolu, "../x", "hi", NOW)).ok).toBe(false);
    for (let i = 0; i < 8; i++) expect((await postMessage(tolu, "g:everyone", `message ${i}`, NOW + i)).ok).toBe(true);
    const flood = await postMessage(tolu, "g:everyone", "one more", NOW + 100);
    expect(flood.ok).toBe(false);
  });

  it("keeps direct messages private to the two people, and tells the other person", async () => {
    const a = await dto("MS1001");
    const b = await dto("MS1003");
    const c = await dto("MS1002");
    const conv = dmId(a.staffId, b.staffId);
    expect((await postMessage(a, conv, "Can you cover the desk?", NOW)).ok).toBe(true);
    expect((await getThread(b, conv)).ok).toBe(true);
    expect((await getThread(c, conv)).ok).toBe(false);
    expect((await postMessage(c, conv, "snooping", NOW)).ok).toBe(false);
    expect((await listConversations(c)).map((r) => r.id)).not.toContain(conv);
    expect((await listConversations(b)).map((r) => r.id)).toContain(conv);
    expect((await listNotices(b))[0].text).toContain("sent you a message");
    expect((await findPeople(a, "ibrah")).map((p) => p.staffId)).toEqual(["MS1003"]);
    expect(await findPeople(a, "i")).toEqual([]);
  });

  it("hides a message after enough reports, and the admin can remove it and mute the person", async () => {
    const tolu = await dto("MS1001");
    const r1 = await dto("MS1003");
    const r2 = await dto("MS1002");
    const admin = await dto("MS0001");
    await postMessage(tolu, "g:cx", "something rude but not on the list", NOW);
    const id = ((await getThread(r1, "g:cx")) as { messages: { id: string }[] }).messages[0].id;
    expect((await reportMessage(tolu, "g:cx", id, "mine", NOW)).ok).toBe(false); // your own
    expect((await reportMessage(r1, "g:cx", id, "rude", NOW)).ok).toBe(true);
    expect((await reportMessage(r1, "g:cx", id, "again", NOW)).ok).toBe(false); // once each
    expect((await getThread(r2, "g:cx") as { messages: unknown[] }).messages).toHaveLength(1); // one report: still shown
    expect((await reportMessage(r2, "g:cx", id, "rude", NOW)).ok).toBe(true);
    expect((await getThread(r2, "g:cx") as { messages: unknown[] }).messages).toHaveLength(0); // two reports: hidden
    expect(await countOpenChatReports(admin)).toBe(2);
    const list = await listReports(admin, NOW);
    expect(list[0].message?.text).toContain("rude");
    expect((await reviewReport(admin, list[0].id, "mute-day", NOW)).ok).toBe(true);
    expect((await postMessage(tolu, "g:cx", "hello again", NOW + 1000)).ok).toBe(false); // muted
    expect((await listNotices(tolu))[0].text).toContain("paused");
    expect((await unmute(admin, "MS1001", NOW + 2000)).ok).toBe(true);
    expect((await postMessage(tolu, "g:cx", "sorry, hello again", NOW + 3000)).ok).toBe(true);
  });

  it("lets only the review team read reports and act on them", async () => {
    const tolu = await dto("MS1001");
    const admin = await dto("MS0001");
    await expect(listReports(tolu)).rejects.toThrow();
    await expect(reviewReport(tolu, "r_000000000000", "remove")).rejects.toThrow();
    const ld = { ...admin, role: "ld" as const };
    await expect(listReports(ld)).rejects.toThrow();
    await expect(listReports({ ...admin, role: "reviewer" as const })).resolves.toBeDefined();
  });

  it("restores a message when the admin dismisses a report", async () => {
    const tolu = await dto("MS1001");
    const r1 = await dto("MS1003");
    const r2 = await dto("MS1002");
    const admin = await dto("MS0001");
    await postMessage(tolu, "g:cx", "borderline joke", NOW);
    const id = ((await getThread(r1, "g:cx")) as { messages: { id: string }[] }).messages[0].id;
    await reportMessage(r1, "g:cx", id, "x", NOW);
    await reportMessage(r2, "g:cx", id, "x", NOW);
    const [first] = await listReports(admin, NOW);
    await reviewReport(admin, first.id, "dismiss", NOW);
    expect((await getThread(r1, "g:cx") as { messages: unknown[] }).messages).toHaveLength(1);
  });
});
