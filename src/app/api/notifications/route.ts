// ============================================================================
// CareerPilot AI — /api/notifications
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonError,
  jsonInternal,
} from "@/lib/api-helpers";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
} from "@/lib/notifications/service";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const limitParam = url.searchParams.get("limit");

    const status = statusParam && ["unread", "read"].includes(statusParam)
      ? (statusParam as "unread" | "read")
      : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const notifications = await getNotifications(user.uid, { status, limit });

    // If requesting unread, also include count
    if (status === "unread") {
      const count = await getUnreadCount(user.uid);
      return jsonOk({ notifications, unreadCount: count });
    }

    return jsonOk(notifications);
  } catch {
    return jsonInternal("Failed to get notifications");
  }
}

/** PATCH with { action: "markAllRead" } marks all notifications as read. */
export async function PATCH(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const body = await request.json();
    if (body.action === "markAllRead") {
      const count = await markAllNotificationsRead(user.uid);
      return jsonOk({ updated: true, count });
    }
    return jsonError("Unknown action");
  } catch {
    return jsonInternal("Failed to update notifications");
  }
}
