// ============================================================================
// CareerPilot AI — Action Complete API
// ============================================================================

import { requireUser, jsonError, jsonOk } from "@/lib/api-helpers";
import { completeAction } from "@/lib/actions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const uid = user.uid;
  const { id } = await params;

  try {
    const action = await completeAction(uid, id);
    if (!action) {
      return jsonError("Action not found", 404);
    }
    return jsonOk(action);
  } catch (error) {
    console.error("[Actions] Complete error:", error);
    return jsonError("Failed to complete action", 500);
  }
}
