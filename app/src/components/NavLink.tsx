"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Nav link that shows the lime "active" tab. `exact` limits matching to the same path. */
export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
