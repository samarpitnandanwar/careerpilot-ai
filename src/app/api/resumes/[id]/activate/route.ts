// ============================================================================
// CareerPilot AI — POST /api/resumes/[id]/activate
// ============================================================================
//
// Activates a resume: deactivates all others, activates the selected one.
// Uses batch operation for atomicity.
// ============================================================================

import { requireUser, jsonOk, jsonNotFound, jsonInternal } from "@/lib/api-helpers";
import { getResume, setActiveResume } from "@/lib/firestore/resumes";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id } = await params;

  try {
    const resume = await getResume(user.uid, id);
    if (!resume) return jsonNotFound("Resume not found");

    await setActiveResume(user.uid, id);

    return jsonOk({ active: true, resumeId: id });
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to activate resume");
  }
}
