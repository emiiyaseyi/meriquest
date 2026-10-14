import { getMarket, getPortfolio } from "@/lib/server/market/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** ?kind=market the practice prices, ?kind=portfolio the person's own practice portfolio. */
export const GET = (req: Request) =>
  meJson(async (user, r) => {
    const kind = new URL(r.url).searchParams.get("kind");
    return kind === "portfolio" ? getPortfolio(user) : getMarket(user);
  }, req);
