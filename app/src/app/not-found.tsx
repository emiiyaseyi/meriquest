import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <Logo variant="light" width={220} />
      <div className="auth-card stack">
        <h1>Page not found</h1>
        <p className="muted">That page does not exist, or you do not have access to it.</p>
        <Link href="/" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>Go home</Link>
      </div>
    </main>
  );
}
