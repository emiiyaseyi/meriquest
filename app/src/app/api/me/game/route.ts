import { getGameState } from "@/lib/server/game/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => meJson((u) => getGameState(u), req);
