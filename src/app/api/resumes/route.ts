// ============================================================================
// CareerPilot AI — /api/resumes
// ============================================================================

import { requireUser, jsonOk, jsonCreated, jsonError, jsonInternal } from "@/lib/api-helpers";
import { createResume, getResumes } from "@/lib/firestore/resumes";
import { ResumeCreateSchema } from "@/lib/validation/schemas";

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

export async function POST(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = ResumeCreateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    const resume = await createResume(user.uid, parsed.data);
    return jsonCreated(resume);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to create resume");
  }
}
