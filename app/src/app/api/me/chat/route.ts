import { findPeople, getThread, listConversations } from "@/lib/server/chat/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** ?list=1 the conversations, ?conv=ID one conversation, ?q=NAME people to start a direct message with. */
export const GET = (req: Request) =>
  meJson(async (user, r) => {
    const p = new URL(r.url).searchParams;
    if (p.get("conv")) return getThread(user, p.get("conv"));
    if (p.get("q") !== null) return findPeople(user, p.get("q"));
    return listConversations(user);
  }, req);
