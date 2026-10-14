import { getTravel } from "@/lib/server/travel/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => meJson((u) => getTravel(u), req);
