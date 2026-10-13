import { can, type Area } from "./permissions";
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "../env";
import { ensureSeeded } from "../seed";
import type { Role, UserDTO } from "../types";
import { userFromToken } from "./service";
import { destroySession } from "./session";

/**
 * Data Access Layer for identity (Next.js data-security guide). Every page and Server Action
 * calls into here; nothing trusts the client. `__Host-` cookies are Secure, Path=/ and host-only.
 */
const cookieName = () => (getEnv().NODE_ENV === "production" ? "__Host-mq_session" : "mq_session");

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(cookieName())?.value;
}

export async function setSessionCookie(token: string, expiresAt: number): Promise<void> {
  (await cookies()).set(cookieName(), token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(cookieName());
}

export async function endCurrentSession(): Promise<void> {
  await destroySession(await readSessionToken());
  await clearSessionCookie();
}

/** Best-effort client IP, used only for throttling and audit. Not a security boundary. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const raw = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown";
  return raw.trim().slice(0, 64) || "unknown";
}

/** The signed-in user (as a safe DTO) or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  await ensureSeeded();
  return userFromToken(await readSessionToken());
});

/** Require a signed-in user. Users still on the default password are held at /change-password. */
export async function requireUser(opts?: { allowMustChange?: boolean }): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts?.allowMustChange) redirect("/change-password");
  return user;
}

/** Require a role that may use an area of the admin screens. Failing users are sent home without being told why. */
export async function requireArea(area: Area): Promise<UserDTO> {
  const user = await requireUser();
  if (!can(user.role, area)) redirect("/");
  return user;
}

/** Require one of the given roles. Failing users are sent home without being told why. */
export async function requireRole(...roles: Role[]): Promise<UserDTO> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
