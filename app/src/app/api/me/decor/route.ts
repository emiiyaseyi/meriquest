import { getDecor } from "@/lib/server/decor/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => meJson((u) => getDecor(u), req);
