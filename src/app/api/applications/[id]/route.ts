// ============================================================================
// CareerPilot AI — /api/applications/[id]
// ============================================================================
//
// GET: Get application with related data (job, analysis, priority, interviews)
// PATCH: Update application non-status fields (notes, deadline, follow-up)
// DELETE: Delete application
// ============================================================================

import { requireUser, jsonOk, jsonError, jsonNotFound, jsonInternal } from "@/lib/api-helpers";
import {
  getApplication,
  updateApplication,
  deleteApplication,
  getCurrentAnalysis,
} from "@/lib/firestore/applications";
import { getJob } from "@/lib/firestore/jobs";
import { getActivities } from "@/lib/applications/activity";
import { getInterviews } from "@/lib/firestore/interviews";
import { ApplicationUpdateSchema } from "@/lib/validation/schemas";
import { calculateNextAction } from "@/lib/applications/state-machine";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const application = await getApplication(user.uid, id);
    if (!application) return jsonNotFound("Application not found");

    // Load related data in parallel
    const [job, analysis, activities, interviews] = await Promise.all([
      getJob(user.uid, application.jobId),
      application.currentAnalysisId
        ? getCurrentAnalysis(user.uid, id)
        : Promise.resolve(null),
      getActivities(user.uid, id),
      getInterviews(user.uid),
    ]);

    // Filter interviews belonging to this application
    const appInterviews = interviews.filter((i) => i.applicationId === id);

    // Calculate current next action
    const nextAction = calculateNextAction(application.status, {
      deadline: application.deadline,
      followUpDate: application.followUpDate,
      interviewDate: appInterviews.find((i) => i.scheduledAt)?.scheduledAt ?? null,
      nextActionAt: application.nextActionAt,
    });

    return jsonOk({
      ...application,
      job,
      analysis,
      activities,
      interviews: appInterviews,
      nextAction,
    });
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get application");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const existing = await getApplication(user.uid, id);
    if (!existing) return jsonNotFound("Application not found");

    const body = await request.json();
    const parsed = ApplicationUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    await updateApplication(user.uid, id, parsed.data);
    return jsonOk({ id });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to update application");
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const existing = await getApplication(user.uid, id);
    if (!existing) return jsonNotFound("Application not found");

    await deleteApplication(user.uid, id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to delete application");
  }
}
