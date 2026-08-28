// ============================================================================
// CareerPilot AI — /api/resumes/[id]
// ============================================================================

import { requireUser, jsonOk, jsonError, jsonNotFound, jsonInternal } from "@/lib/api-helpers";
import { getResume, updateResume, deleteResume } from "@/lib/firestore/resumes";
import { deleteResumeFile } from "@/lib/storage";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const resume = await getResume(user.uid, id);
    if (!resume) return jsonNotFound("Resume not found");
    return jsonOk(resume);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get resume");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const existing = await getResume(user.uid, id);
    if (!existing) return jsonNotFound("Resume not found");

    const body = await request.json();
    const { fileName } = body as { fileName?: string };

    if (fileName && typeof fileName === "string" && fileName.length > 0 && fileName.length <= 255) {
      await updateResume(user.uid, id, { fileName });
    }

    return jsonOk({ id });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to update resume");
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const existing = await getResume(user.uid, id);
    if (!existing) return jsonNotFound("Resume not found");

    // Delete from Cloud Storage
    try {
      await deleteResumeFile(user.uid, existing.storagePath);
    } catch (error) {
      console.warn("[Resume] Failed to delete storage object:", error);
      // Continue with Firestore deletion even if Storage delete fails
    }

    // Delete from Firestore
    await deleteResume(user.uid, id);

    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to delete resume");
  }
}
