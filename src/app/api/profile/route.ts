// ============================================================================
// CareerPilot AI — /api/profile
// ============================================================================

import { requireUser, jsonOk, jsonError, jsonInternal } from "@/lib/api-helpers";
import { getProfile, upsertProfile } from "@/lib/firestore/users";
import { ProfileSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const profile = await getProfile(user.uid);
    return jsonOk(profile);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get profile");
  }
}

export async function PUT(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = ProfileSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    const profile = await upsertProfile(user.uid, parsed.data);
    return jsonOk(profile);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to save profile");
  }
}
