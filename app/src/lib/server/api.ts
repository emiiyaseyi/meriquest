import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth/dal";
import type { UserDTO } from "./types";

/**
 * Read-only data for the game screens, served as plain requests instead of Server Actions. Server Actions from one
 * browser run one at a time, so a slow move or purchase made the screens behind it wait; plain requests run side by
 * side. Each one checks who is asking, answers only about that person, and is never cached.
 */
export async function meJson<T>(handler: (user: UserDTO, req: Request) => Promise<T>, req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  if (user.mustChangePassword) return NextResponse.json({ error: "Change your password first" }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  try {
    return NextResponse.json(await handler(user, req), { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Could not load that just now" }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
