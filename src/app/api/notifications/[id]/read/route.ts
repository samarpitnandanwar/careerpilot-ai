// ============================================================================
// CareerPilot AI — POST /api/notifications/[id]/read
// ============================================================================

import { requireUser, jsonOk, jsonNotFound, jsonInternal } from "@/lib/api-helpers";
import { markNotificationRead } from "@/lib/notifications/service";
import { getDb } from "@/lib/firestore/db";
import type { FirestoreNotification } from "@/lib/notifications/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: notificationId } = await params;

  try {
    // Verify notification exists and user owns it
    const db = getDb();
    const snap = await db
      .collection("users")
      .doc(user.uid)
      .collection("notifications")
      .doc(notificationId)
      .get();

    if (!snap.exists) {
      return jsonNotFound("Notification not found");
    }

    const notification = snap.data() as FirestoreNotification;

    // Server-controlled read timestamp
    await markNotificationRead(user.uid, notificationId);

    return jsonOk({ ...notification, read: true, readAt: new Date().toISOString() });
  } catch {
    return jsonInternal("Failed to mark notification as read");
  }
}
