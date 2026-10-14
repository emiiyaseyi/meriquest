import { getClients } from "@/lib/server/clients/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** The person's own Client Desk for today. */
export const GET = (req: Request) => meJson((user) => getClients(user), req);
