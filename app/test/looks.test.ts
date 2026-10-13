import { beforeEach, describe, expect, it } from "vitest";
import { cleanLook, defaultLook } from "@/lib/world/player";
import { BOTTOM_COLOURS, HAIR_COLOURS, OUTFIT_COLOURS, SKIN_TONES, parseChosenLook, sameLook } from "@/lib/world/looks";
import { getOrCreatePlayer, saveLook } from "@/lib/server/world/service";
import { freshWorld } from "./helpers";

const good = { body: "woman", hairStyle: "braids", outfit: "office", fabric: "ankara", skin: SKIN_TONES[2], hair: HAIR_COLOURS[0], top: OUTFIT_COLOURS[3], pants: BOTTOM_COLOURS[1] };

describe("appearance choices", () => {
  it("accepts a look made only of the offered choices", () => {
    expect(parseChosenLook(good)).toMatchObject({ body: "woman", hairStyle: "braids" });
  });
  it("rejects anything not on the lists", () => {
    for (const bad of [
      { ...good, skin: "#123456" },
      { ...good, hairStyle: "mohawk" },
      { ...good, outfit: "armour" },
      { ...good, fabric: "<script>" },
      { ...good, body: "robot" },
      { ...good, top: "red" },
      { ...good, pants: undefined },
      null,
      "string",
      42,
    ]) expect(parseChosenLook(bad)).toBeNull();
  });
  it("older saved looks still load, with the new parts filled in", () => {
    const fb = defaultLook("MS1");
    const old = cleanLook({ skin: "#8a5a3c", hair: "#14110f", hairStyle: "short", top: "#2d5d41", pants: "#1f2a3d" }, fb);
    expect(old.hairStyle).toBe("short");
    expect(old.body).toBe(fb.body);
    expect(old.outfit).toBe(fb.outfit);
  });
  it("heals tampered looks", () => {
    const fb = defaultLook("MS2");
    const fixed = cleanLook({ skin: "javascript:1", hair: 5, hairStyle: "x", body: "y", outfit: "z", fabric: "w", top: "#zzzzzz", pants: null }, fb);
    expect(sameLook(fixed, fb)).toBe(true);
  });
  it("the default look is stable and uses only offered choices", () => {
    const a = defaultLook("MS3");
    expect(defaultLook("MS3")).toEqual(a);
    expect(parseChosenLook(a)).not.toBeNull();
  });
});

describe("saving a look", () => {
  beforeEach(async () => {
    await freshWorld();
  });
  it("stores a valid look and refuses an invalid one", async () => {
    const user = { staffId: "MS4000" };
    await getOrCreatePlayer(user);
    const r = await saveLook(user, good);
    expect(r.ok).toBe(true);
    expect((await getOrCreatePlayer(user)).look).toMatchObject({ body: "woman", outfit: "office", fabric: "ankara" });
    const bad = await saveLook(user, { ...good, skin: "#000000" });
    expect(bad.ok).toBe(false);
    expect((await getOrCreatePlayer(user)).look.skin).toBe(SKIN_TONES[2]);
  });
});
