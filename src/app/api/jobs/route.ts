// ============================================================================
// CareerPilot AI — /api/jobs
// ============================================================================

import { requireUser, jsonOk, jsonCreated, jsonError, jsonInternal } from "@/lib/api-helpers";
import { createJob, getJobs } from "@/lib/firestore/jobs";
import { JobCreateSchema } from "@/lib/validation/schemas";
import type { FirestoreJobStatus } from "@/types";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status") as FirestoreJobStatus | null;
    const jobs = await getJobs(user.uid, statusParam ?? undefined);
    return jsonOk(jobs);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get jobs");
  }
}

export async function POST(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = JobCreateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    const job = await createJob(user.uid, parsed.data);
    return jsonCreated(job);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to create job");
  }
}
