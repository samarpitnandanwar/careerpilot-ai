// ============================================================================
// CareerPilot AI — /api/applications
// ============================================================================
//
// GET: List applications with optional filtering
// POST: Create application (with duplicate protection)
// ============================================================================

import { requireUser, jsonOk, jsonCreated, jsonError, jsonInternal } from "@/lib/api-helpers";
import { createApplication, getApplications } from "@/lib/firestore/applications";
import { ApplicationCreateSchema } from "@/lib/validation/schemas";
import type { ApplicationStatus } from "@/types";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status") as ApplicationStatus | null;
    const searchParam = url.searchParams.get("search");

    let applications = await getApplications(user.uid);

    // Filter by status if provided
    if (statusParam) {
      applications = applications.filter((a) => a.status === statusParam);
    }

    // Filter by search term (company or title)
    if (searchParam) {
      const search = searchParam.toLowerCase();
      applications = applications.filter(
        (a) =>
          a.jobTitle.toLowerCase().includes(search) ||
          a.company.toLowerCase().includes(search),
      );
    }

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
