// ============================================================================
// CareerPilot AI — /api/interviews/[id]
// ============================================================================

import { requireUser, jsonOk, jsonError, jsonNotFound, jsonInternal } from "@/lib/api-helpers";
import { getInterview, updateInterview, deleteInterview } from "@/lib/firestore/interviews";
import { InterviewUpdateSchema } from "@/lib/validation/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const interview = await getInterview(user.uid, id);
    if (!interview) return jsonNotFound("Interview not found");
    return jsonOk(interview);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get interview");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const existing = await getInterview(user.uid, id);
    if (!existing) return jsonNotFound("Interview not found");

    const body = await request.json();
    const parsed = InterviewUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    await updateInterview(user.uid, id, parsed.data);
    return jsonOk({ id });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to update interview");
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const existing = await getInterview(user.uid, id);
    if (!existing) return jsonNotFound("Interview not found");

    await deleteInterview(user.uid, id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to delete interview");
  }
}
