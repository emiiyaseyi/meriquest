"use server";

import { redirect } from "next/navigation";
import { authenticate, changePassword } from "@/lib/server/auth/service";
import { clearSessionCookie, clientIp, endCurrentSession, requireUser, setSessionCookie } from "@/lib/server/auth/dal";
import { ensureSeeded } from "@/lib/server/seed";

export interface FormState {
  error?: string;
  /** The password was right and the account needs the code from its authenticator app. */
  needsCode?: boolean;
}

const GENERIC_LOGIN_ERROR = "That staff ID/email and password do not match. After several tries the account locks for a while.";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await ensureSeeded();
  const result = await authenticate(
    { identifier: formData.get("identifier"), password: formData.get("password"), code: formData.get("code") },
    { ip: await clientIp() },
  );
  if (!result.ok) {
    if (result.reason === "throttled") {
      const mins = Math.max(1, Math.ceil(result.retryAfterSec / 60));
      return { error: `Too many attempts. Please try again in about ${mins} minute${mins === 1 ? "" : "s"}.` };
    }
    if (result.reason === "needs_code") return { needsCode: true };
    return { error: GENERIC_LOGIN_ERROR };
  }
  await setSessionCookie(result.token, result.expiresAt);
  redirect(result.user.mustChangePassword ? "/change-password" : "/");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // Re-verify the caller inside the action: a page-level check does not protect a Server Action.
  const user = await requireUser({ allowMustChange: true });
  const result = await changePassword(user.staffId, {
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!result.ok) return { error: result.error };
  await setSessionCookie(result.token, result.expiresAt);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endCurrentSession();
  await clearSessionCookie();
  redirect("/login");
}
