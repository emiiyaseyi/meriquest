import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page narrow">
      <div className="card stack">
        <h1>Page not found</h1>
        <p className="muted">That page does not exist, or you do not have access to it.</p>
        <Link href="/" className="btn">Go home</Link>
      </div>
    </main>
  );
}
