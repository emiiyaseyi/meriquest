import { myReport } from "@/lib/server/reports/mine";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** The person's own progress report. */
export const GET = (req: Request) => meJson((user) => myReport(user), req);
