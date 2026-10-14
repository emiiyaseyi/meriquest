import { getCompliance } from "@/lib/server/compliance/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** The person's own Compliance Desk. */
export const GET = (req: Request) => meJson((user) => getCompliance(user), req);
