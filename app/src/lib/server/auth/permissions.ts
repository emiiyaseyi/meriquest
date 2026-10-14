import type { Role } from "../types";

/**
 * What each role may open in the admin area. This is deliberately in code and not an admin setting: who can see
 * personal and sensitive records must not be changeable from the screen it protects.
 *   admin    everything
 *   ld       the learning team: progress reports, Academy courses, announcements and placements
 *   reviewer conduct concerns only
 *   manager  no admin area (managers use the My team screen)
 */
export type Area = "settings" | "staff" | "placements" | "reports" | "academy" | "announcements" | "concerns" | "audit" | "succession";

export const AREAS: readonly Area[] = ["settings", "staff", "placements", "reports", "academy", "announcements", "concerns", "audit", "succession"];

export const AREAS_BY_ROLE: Record<Role, readonly Area[]> = {
  admin: AREAS,
  ld: ["reports", "academy", "announcements", "placements", "succession"],
  reviewer: ["concerns"],
  manager: [],
  player: [],
};

export const can = (role: Role | undefined, area: Area): boolean => (role ? AREAS_BY_ROLE[role].includes(area) : false);

/** Throws when the role may not use the area. Used inside services as a second check after the page or action. */
export function assertArea(actor: { role: Role }, area: Area): void {
  if (!can(actor.role, area)) throw new Error("Forbidden");
}

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", ld: "Learning and Development", reviewer: "Reviewer", manager: "Manager", player: "Staff" };
