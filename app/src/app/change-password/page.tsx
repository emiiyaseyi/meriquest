import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/AuthForms";
import { requireUser } from "@/lib/server/auth/dal";
import { getConfig } from "@/lib/server/config/registry";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowMustChange: true });
  const a = await getConfig("auth");
  const parts = [`At least ${a.passwordMinLength} characters`];
  if (a.passwordNeedLetter) parts.push("a letter");
  if (a.passwordNeedNumber) parts.push("a number");
  if (a.passwordNeedSymbol) parts.push("a symbol");
  return (
    <main className="page narrow">
      <div className="card stack">
        <h1>{user.mustChangePassword ? "Set your password" : "Change password"}</h1>
        <ChangePasswordForm rules={`${parts.join(", ")}.`} forced={user.mustChangePassword} />
      </div>
    </main>
  );
}
