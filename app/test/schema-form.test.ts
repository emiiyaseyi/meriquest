import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CONFIG, CONFIG_KEYS } from "@/lib/server/config/definitions";
import { blank, type JS } from "@/components/SchemaForm";

describe("settings form editor", () => {
  it("can draw a form for every setting", () => {
    for (const key of CONFIG_KEYS) {
      const js = z.toJSONSchema(CONFIG[key].schema, { unrepresentable: "any", io: "input" }) as JS;
      expect(js, key).toBeTruthy();
      expect(["object", "array"], key).toContain(Array.isArray(js.type) ? js.type[0] : js.type);
    }
  });

  it("makes sensible blank values for new list items", () => {
    const js = z.toJSONSchema(CONFIG.shifts.schema, { unrepresentable: "any", io: "input" }) as JS;
    const task = js.properties?.tasks?.items as JS;
    const fresh = blank(task) as Record<string, unknown>;
    expect(fresh).toMatchObject({ id: "", title: "", story: "", units: [], choices: [] });
  });

  it("round trips a default through the form's JSON and the real rules", () => {
    for (const key of ["shifts", "decor", "locations", "leadership", "gameplay"] as const) {
      const value = JSON.parse(JSON.stringify(CONFIG[key].default));
      expect(CONFIG[key].schema.safeParse(value).success, key).toBe(true);
    }
  });
});
