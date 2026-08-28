// ============================================================================
// CareerPilot AI — /api/applications/[id]/status
// ============================================================================
//
// POST: Server-controlled status change with activity logging
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonNotFound,
  jsonError,
  jsonInternal,
} from "@/lib/api-helpers";
import { getApplication, changeApplicationStatus } from "@/lib/firestore/applications";
import { ApplicationStatusChangeSchema } from "@/lib/validation/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: applicationId } = await params;

  try {
    // Verify application exists and user owns it
    const existing = await getApplication(user.uid, applicationId);
    if (!existing) return jsonNotFound("Application not found");

    // Parse and validate request body
    const body = await request.json();
    const parsed = ApplicationStatusChangeSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    // Server-controlled status change (validates transition, creates activity)
    const updated = await changeApplicationStatus(
      user.uid,
      applicationId,
      parsed.data.status,
      parsed.data.message,
    );

    return jsonOk(updated);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");

    // Handle known application errors
    if (error && typeof error === "object" && "code" in error) {
      const appError = error as { code: string; message: string };
      if (appError.code === "INVALID_TRANSITION") {
        return jsonError(appError.message, 400);
      }
      if (appError.code === "NOT_FOUND") {
        return jsonNotFound(appError.message);
      }
    }

    return jsonInternal(
      error instanceof Error ? error.message : "Failed to change status",
    );
  }
}
