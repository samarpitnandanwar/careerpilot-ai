// ============================================================================
// CareerPilot AI — /api/jobs/[id]
// ============================================================================

import { requireUser, jsonOk, jsonError, jsonNotFound, jsonInternal } from "@/lib/api-helpers";
import { getJob, updateJob, deleteJob } from "@/lib/firestore/jobs";
import { JobUpdateSchema } from "@/lib/validation/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const job = await getJob(user.uid, id);
    if (!job) return jsonNotFound("Job not found");
    return jsonOk(job);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get job");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const existing = await getJob(user.uid, id);
    if (!existing) return jsonNotFound("Job not found");

    const body = await request.json();
    const parsed = JobUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    await updateJob(user.uid, id, parsed.data);
    return jsonOk({ id });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to update job");
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const existing = await getJob(user.uid, id);
    if (!existing) return jsonNotFound("Job not found");

    await deleteJob(user.uid, id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to delete job");
  }
}
