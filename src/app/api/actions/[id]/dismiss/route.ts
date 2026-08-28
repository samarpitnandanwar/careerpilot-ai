// ============================================================================
// CareerPilot AI — Action Dismiss API
// ============================================================================

import { requireUser, jsonError, jsonOk } from "@/lib/api-helpers";
import { dismissAction } from "@/lib/actions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const uid = user.uid;
  const { id } = await params;

  try {
    const action = await dismissAction(uid, id);
    if (!action) {
      return jsonError("Action not found", 404);
    }
    return jsonOk(action);
  } catch (error) {
    console.error("[Actions] Dismiss error:", error);
    return jsonError("Failed to dismiss action", 500);
  }
}
