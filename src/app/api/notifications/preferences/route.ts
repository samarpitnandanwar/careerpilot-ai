// ============================================================================
// CareerPilot AI — /api/notifications/preferences
// ============================================================================

import { requireUser, jsonOk, jsonError, jsonInternal } from "@/lib/api-helpers";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferencesUpdateSchema,
} from "@/lib/notifications/preferences";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const preferences = await getNotificationPreferences(user.uid);
    return jsonOk(preferences);
  } catch {
    return jsonInternal("Failed to get notification preferences");
  }
}

export async function PATCH(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = NotificationPreferencesUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    const preferences = await updateNotificationPreferences(user.uid, parsed.data);
    return jsonOk(preferences);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal("Failed to update notification preferences");
  }
}
