// ============================================================================
// CareerPilot AI — /api/applications
// ============================================================================

import { requireUser, jsonOk, jsonCreated, jsonError, jsonInternal } from "@/lib/api-helpers";
import { createApplication, getApplications } from "@/lib/firestore/applications";
import { ApplicationCreateSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const applications = await getApplications(user.uid);
    return jsonOk(applications);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get applications");
  }
}

export async function POST(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = ApplicationCreateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    const application = await createApplication(user.uid, parsed.data);
    return jsonCreated(application);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to create application");
  }
}
