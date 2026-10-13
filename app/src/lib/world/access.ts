/**
 * Floor access rules as plain functions (safe on the server and in the browser).
 */
export interface FloorRule {
  level: string;
  access: "open" | "closed" | "units";
  units: string[];
  note: string;
}

export interface FloorStatus {
  blocked: boolean;
  note: string;
}

/** Why a person cannot use a floor, or null if they can. Admins may preview closed floors. */
export function floorBlock(rules: readonly FloorRule[], level: string, who: { unit: string; role: string }): string | null {
  const rule = rules.find((r) => r.level === level);
  if (!rule || rule.access === "open") return null;
  if (who.role === "admin") return null;
  if (rule.access === "closed") return rule.note || "This floor is restricted for now.";
  return rule.units.includes(who.unit) ? null : rule.note || "This floor is not open to your team.";
}

/** The state of every level for one person, so the lift and the map can show locks. */
export function floorStatuses(rules: readonly FloorRule[], levels: readonly { id: string }[], who: { unit: string; role: string }): Record<string, FloorStatus> {
  return Object.fromEntries(
    levels.map((l) => {
      const note = floorBlock(rules, l.id, who);
      return [l.id, { blocked: note !== null, note: note ?? "" }];
    }),
  );
}
