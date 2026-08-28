// ============================================================================
// CareerPilot AI — /api/resumes
// ============================================================================

import { requireUser, jsonOk, jsonInternal } from "@/lib/api-helpers";
import { getResumes } from "@/lib/firestore/resumes";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const resumes = await getResumes(user.uid);
    return jsonOk(resumes);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get resumes");
  }
}

// POST is handled by /api/resumes/upload for file uploads.
// This route only supports listing resumes.
