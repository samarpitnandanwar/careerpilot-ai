// ============================================================================
// CareerPilot AI — /api/notifications
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonCreated,
  jsonError,
  jsonInternal,
} from "@/lib/api-helpers";
import {
  createNotification,
  getNotifications,
  markAllNotificationsRead,
} from "@/lib/firestore/notifications";
import { NotificationCreateSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const notifications = await getNotifications(user.uid);
    return jsonOk(notifications);
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to get notifications");
  }
}

export async function POST(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = NotificationCreateSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    const notification = await createNotification(user.uid, parsed.data);
    return jsonCreated(notification);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to create notification");
  }
}

/** PATCH with { action: "markAllRead" } marks all notifications as read. */
export async function PATCH(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    if (body.action === "markAllRead") {
      await markAllNotificationsRead(user.uid);
      return jsonOk({ updated: true });
    }
    return jsonError("Unknown action");
  } catch (error) {
    return jsonInternal(error instanceof Error ? error.message : "Failed to update notifications");
  }
}
