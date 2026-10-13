import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Runs before every page request. It (1) sets a per-request CSP nonce, and (2) does an
 * OPTIMISTIC redirect for visitors with no session cookie. This is a convenience only:
 * real authentication and authorisation happen in the Data Access Layer and in every
 * Server Action (Next.js data-security guide).
 */
const PUBLIC_PATHS = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'", // style attributes cannot run script; needed for dynamic sizing
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const cookieName = process.env.NODE_ENV === "production" ? "__Host-mq_session" : "mq_session";
  const hasSessionCookie = request.cookies.has(cookieName);
  const path = request.nextUrl.pathname;

  if (!hasSessionCookie && !PUBLIC_PATHS.has(path)) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // /brand holds the public logo files the sign-in page needs before anyone is signed in.
      source: "/((?!api|_next/static|_next/image|brand/|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
