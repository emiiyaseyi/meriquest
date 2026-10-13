import { NextResponse } from "next/server";
import { requireArea } from "@/lib/server/auth/dal";
import { audit } from "@/lib/server/audit";
import { buildReport, reportCsv } from "@/lib/server/reports/service";

/** The progress report as a spreadsheet file. Admin only; the export is recorded in the audit log. */
export async function GET() {
  const admin = await requireArea("reports");
  const csv = reportCsv(await buildReport());
  await audit(admin.staffId, "report_export", "progress", {});
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meriquest-progress-${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
