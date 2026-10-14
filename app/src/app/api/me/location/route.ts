import { getLocation } from "@/lib/server/game/activities";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => meJson((u) => getLocation(u), req);
