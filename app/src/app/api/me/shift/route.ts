import { getShift } from "@/lib/server/shift/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => meJson((u) => getShift(u), req);
