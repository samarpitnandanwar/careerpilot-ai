// ============================================================================
// CareerPilot AI — Notification Service
// ============================================================================
//
// Firestore service for notifications:
//   - createNotification (idempotent via notificationKey)
//   - getNotifications (with status filter and limit)
//   - getUnreadCount (efficient count)
//   - markNotificationRead (server-controlled readAt)
//   - markAllNotificationsRead (batch with safe limit)
// ============================================================================

import { getDb, notificationsCol, newId, now } from "@/lib/firestore/db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreNotification } from "./types";
import type { GeneratedNotification } from "./generator";
import { areNotificationsEnabled } from "./preferences";

// ---------------------------------------------------------------------------
// Create notification (idempotent via notificationKey)
// ---------------------------------------------------------------------------

/**
 * Create a notification if one with the same notificationKey doesn't already exist.
 * Respects the user's notification preferences — if notificationsEnabled is false,
 * returns a safe no-op result without persisting.
 * Returns the existing notification if duplicate, or the new notification.
 */
export async function createNotification(
  uid: string,
  data: GeneratedNotification,
): Promise<FirestoreNotification | null> {
  // Check preference — if notifications disabled, return null (no-op)
  try {
    const enabled = await areNotificationsEnabled(uid);
    if (!enabled) {
      return null;
    }
  } catch {
    // If preference check fails, default to enabled (safe fallback)
  }

  return handleFirestoreError(async () => {
    const db = getDb();

    // Check for duplicate notificationKey (idempotency)
    const existing = await notificationsCol(db, uid)
      .where("notificationKey", "==", data.notificationKey)
      .limit(1)
      .get();

    if (!existing.empty) {
      return existing.docs[0].data() as FirestoreNotification;
    }

    const id = newId(db, uid, "notifications");
    const nowStr = now();

    const notification: FirestoreNotification = {
      id,
      type: data.type,
      priority: data.priority,
      title: data.title,
      message: data.message,
      applicationId: data.applicationId,
      jobId: data.jobId,
      interviewId: data.interviewId,
      resumeId: data.resumeId,
      actionId: null,
      sourceEventId: data.sourceEventId,
      notificationKey: data.notificationKey,
      read: false,
      readAt: null,
      createdAt: nowStr,
      expiresAt: data.expiresAt,
    };

    await notificationsCol(db, uid).doc(id).set(notification);
    return notification;
  });
}

// ---------------------------------------------------------------------------
// Get notifications (with filter and limit)
// ---------------------------------------------------------------------------

export interface GetNotificationsOptions {
  status?: "unread" | "read";
  limit?: number;
}

export async function getNotifications(
  uid: string,
  options: GetNotificationsOptions = {},
): Promise<FirestoreNotification[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    let query: FirebaseFirestore.Query = notificationsCol(db, uid);

    if (options.status === "unread") {
      query = query.where("read", "==", false);
    } else if (options.status === "read") {
      query = query.where("read", "==", true);
    }

    query = query.orderBy("createdAt", "desc");

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snap = await query.get();
    return snap.docs.map((doc) => doc.data() as FirestoreNotification);
  });
}

// ---------------------------------------------------------------------------
// Get unread count
// ---------------------------------------------------------------------------

export async function getUnreadCount(uid: string): Promise<number> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await notificationsCol(db, uid)
      .where("read", "==", false)
      .count()
      .get();
    return snap.data().count;
  });
}

// ---------------------------------------------------------------------------
// Mark single notification as read (server-controlled readAt)
// ---------------------------------------------------------------------------

export async function markNotificationRead(
  uid: string,
  notificationId: string,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await notificationsCol(db, uid).doc(notificationId).update({
      read: true,
      readAt: now(),
    });
  });
}

// ---------------------------------------------------------------------------
// Mark all notifications as read (batch with safe limit)
// ---------------------------------------------------------------------------

const MAX_BATCH_SIZE = 500;

export async function markAllNotificationsRead(uid: string): Promise<number> {
  return handleFirestoreError(async () => {
    const db = getDb();
    let totalUpdated = 0;

    // Process in batches to handle large numbers of unread notifications
    let hasMore = true;
    while (hasMore) {
      const snap = await notificationsCol(db, uid)
        .where("read", "==", false)
        .limit(MAX_BATCH_SIZE)
        .get();

      if (snap.empty) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      for (const doc of snap.docs) {
        batch.update(doc.ref, {
          read: true,
          readAt: now(),
        });
      }
      await batch.commit();
      totalUpdated += snap.docs.length;

      // If we got fewer than MAX_BATCH_SIZE, we're done
      if (snap.docs.length < MAX_BATCH_SIZE) {
        hasMore = false;
      }
    }

    return totalUpdated;
  });
}
