import { getArrivals } from "@/lib/server/arrivals/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** The person's visitors for today. Asking also counts the time they are in the game, so visitors arrive while they play. */
export const GET = (req: Request) => meJson((user) => getArrivals(user), req);
