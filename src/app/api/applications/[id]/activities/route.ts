// ============================================================================
// CareerPilot AI — /api/applications/[id]/activities
// ============================================================================
//
// GET: Retrieve activity history for an application
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonNotFound,
  jsonInternal,
} from "@/lib/api-helpers";
import { getApplication } from "@/lib/firestore/applications";
import { getActivities } from "@/lib/applications/activity";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: applicationId } = await params;

  try {
    // Verify application exists and user owns it
    const existing = await getApplication(user.uid, applicationId);
    if (!existing) return jsonNotFound("Application not found");

    // Get activities (ordered by timestamp desc)
    const activities = await getActivities(user.uid, applicationId);

    return jsonOk(activities);
  } catch (error) {
    return jsonInternal(
      error instanceof Error ? error.message : "Failed to get activities",
    );
  }
}
