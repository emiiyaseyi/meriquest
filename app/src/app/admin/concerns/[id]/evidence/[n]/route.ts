import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server/auth/dal";
import { getEvidenceFile } from "@/lib/server/concerns/service";
import { EXTENSION, type EvidenceType } from "@/lib/concerns";

/** Evidence is only ever handed to an admin, as a download, with its real (checked) type. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; n: string }> }) {
  const admin = await requireRole("admin");
  const { id, n } = await ctx.params;
  const file = await getEvidenceFile(admin, id, Number(n));
  if (!file) return new NextResponse("Not found", { status: 404 });
  const ext = EXTENSION[file.type as EvidenceType] ?? "bin";
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename="evidence-${n}.${ext}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
