// ============================================================================
// CareerPilot AI — /api/applications/[id]
// ============================================================================

import { requireUser, jsonOk, jsonError, jsonNotFound, jsonInternal } from "@/lib/api-helpers";
import {
  getApplication,
  updateApplication,
  deleteApplication,
  getCurrentAnalysis,
} from "@/lib/firestore/applications";
import { ApplicationUpdateSchema } from "@/lib/validation/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const application = await getApplication(user.uid, id);
    if (!application) return jsonNotFound("Application not found");

    // Attach the current analysis if available
    let analysis = null;
    if (application.currentAnalysisId) {
      analysis = await getCurrentAnalysis(user.uid, id);
    }

    return jsonOk({ ...application, analysis });
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
