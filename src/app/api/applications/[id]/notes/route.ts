// ============================================================================
// CareerPilot AI — /api/applications/[id]/notes
// ============================================================================
//
// POST: Add a note to an application (creates activity event)
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonNotFound,
  jsonError,
  jsonInternal,
} from "@/lib/api-helpers";
import { getApplication, addNote } from "@/lib/firestore/applications";
import { ApplicationNoteSchema } from "@/lib/validation/schemas";

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
    const parsed = ApplicationNoteSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    // Add note (server-controlled timestamp and activity)
    await addNote(user.uid, applicationId, parsed.data.note);

    return jsonOk({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(
      error instanceof Error ? error.message : "Failed to add note",
    );
  }
}
