// ============================================================================
// CareerPilot AI — /api/interviews
// ============================================================================

import { requireUser, jsonOk, jsonCreated, jsonError, jsonInternal } from "@/lib/api-helpers";
import { createInterview, getInterviews } from "@/lib/firestore/interviews";
import { InterviewCreateSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const interviews = await getInterviews(user.uid);
    return jsonOk(interviews);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get interviews");
  }
}

export async function POST(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = InterviewCreateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    const interview = await createInterview(user.uid, parsed.data);
    return jsonCreated(interview);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to create interview");
  }
}
