import { directory, getKudos, myRole } from "@/lib/server/people/service";
import { meJson } from "@/lib/server/api";

export const dynamic = "force-dynamic";

/** ?kind=directory&q=&unit= colleagues, ?kind=kudos the kudos screen, ?kind=role the person's own role. */
export const GET = (req: Request) =>
  meJson(async (user, r) => {
    const p = new URL(r.url).searchParams;
    const kind = p.get("kind");
    if (kind === "directory") return directory(user, p.get("q"), p.get("unit"));
    if (kind === "kudos") return getKudos(user);
    return myRole(user);
  }, req);
