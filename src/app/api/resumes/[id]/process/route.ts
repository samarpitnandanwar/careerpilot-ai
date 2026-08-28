// ============================================================================
// CareerPilot AI — POST /api/resumes/[id]/process
// ============================================================================
//
// Triggers (re-)processing of an existing resume.
// Downloads from Storage → Extracts → Gemini → Validates → Saves.
// ============================================================================

import { requireUser, jsonOk, jsonInternal } from "@/lib/api-helpers";
import { getResume } from "@/lib/firestore/resumes";
import { processResume } from "@/lib/resume";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const resume = await getResume(user.uid, id);
    if (!resume) {
      return jsonOk({ success: false, error: "Resume not found" }, 404);
    }

    const result = await processResume(
      user.uid,
      id,
      resume.storagePath,
      resume.fileType,
    );

    if (result.success) {
      return jsonOk(result);
    }

    // Processing failed — return the error details
    return jsonOk(result, 422);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to process resume");
  }
}
