import { getSim } from "@/lib/server/leadership/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => meJson((u, r) => getSim(u, new URL(r.url).searchParams.get("kind") === "clientsim" ? "clientsim" : "leadership"), req);
