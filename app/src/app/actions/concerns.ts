"use server";

import { requireUser } from "@/lib/server/auth/dal";
import { listMyConcerns, submitConcern, type EvidenceInput, type MyConcern, type SubmitResult } from "@/lib/server/concerns/service";

/* Every action re-checks the signed-in user: Server Actions can be called directly. */

export async function submitConcernAction(fd: FormData): Promise<SubmitResult> {
  const user = await requireUser();
  const files: EvidenceInput[] = [];
  const modified = fd.getAll("fileModified");
  for (const [i, f] of fd.getAll("files").entries()) {
    if (!(f instanceof File) || f.size === 0) continue;
    const bytes = new Uint8Array(await f.arrayBuffer());
    const m = Number(modified[i]);
    files.push({ name: f.name, bytes, lastModified: Number.isFinite(m) && m > 0 ? m : null });
  }
  return submitConcern(user, { category: fd.get("category"), description: fd.get("description"), about: fd.get("about"), occurredAt: fd.get("occurredAt") === null ? null : Number(fd.get("occurredAt")), files });
}

export async function myConcernsAction(): Promise<MyConcern[]> {
  const user = await requireUser();
  return listMyConcerns(user);
}
