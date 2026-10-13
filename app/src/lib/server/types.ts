export type Role = "player" | "manager" | "admin" | "reviewer";
export const ROLES: readonly Role[] = ["player", "manager", "admin", "reviewer"];

export type Segment = "front" | "middle" | "back";

/** Full stored record. NEVER send this to the client: it holds the password hash. */
export interface UserRecord {
  staffId: string; // uppercase, e.g. MS1001
  name: string;
  email: string; // lowercase
  unit: string;
  segment: Segment;
  title: string;
  role: Role;
  isLineManager: boolean; // admin-set from the profile (RULEBOOK §2.10)
  tenureYears: number;
  status: "active" | "disabled";
  /** null means "still on the default password": the server then checks the env default. */
  passwordHash: string | null;
  mustChangePassword: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number | null;
  passwordChangedAt: number | null;
}

/** The only user shape that may reach components or be returned from actions. */
export interface UserDTO {
  staffId: string;
  name: string;
  email: string;
  unit: string;
  segment: Segment;
  title: string;
  role: Role;
  isLineManager: boolean;
  tenureYears: number;
  mustChangePassword: boolean;
}

export function toDTO(u: UserRecord): UserDTO {
  return {
    staffId: u.staffId,
    name: u.name,
    email: u.email,
    unit: u.unit,
    segment: u.segment,
    title: u.title,
    role: u.role,
    isLineManager: u.isLineManager,
    tenureYears: u.tenureYears,
    mustChangePassword: u.mustChangePassword,
  };
}
