"use client";

import Link from "next/link";

// Never render error.message or the stack: they can leak internals. Next.js only gives a digest in production.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page narrow">
      <div className="card stack" role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">We hit a problem. Please try again. If it keeps happening, tell Learning &amp; Development.</p>
        <div className="row">
          <button type="button" className="btn" onClick={() => reset()}>Try again</button>
          <Link href="/" className="btn btn-ghost">Go home</Link>
        </div>
      </div>
    </main>
  );
}
