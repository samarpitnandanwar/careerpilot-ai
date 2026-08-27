// ============================================================================
// CareerPilot AI — Notifications Firestore Service
// ============================================================================

import { getDb, notificationsCol, newId, now } from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreNotification, NotificationCreateInput } from "@/types";

export async function createNotification(
  uid: string,
  input: NotificationCreateInput,
): Promise<FirestoreNotification> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "notifications");
    const nowStr = now();

    const notification: FirestoreNotification = {
      id,
      type: input.type,
      title: input.title,
      message: input.message,
      read: false,
      createdAt: nowStr,
      scheduledFor: input.scheduledFor,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    };

    await notificationsCol(db, uid).doc(id).set(notification);
    return notification;
  });
}

export async function getNotifications(uid: string): Promise<FirestoreNotification[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await notificationsCol(db, uid).orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => doc.data() as FirestoreNotification);
  });
}

export async function markNotificationRead(
  uid: string,
  notificationId: string,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await notificationsCol(db, uid).doc(notificationId).update({ read: true });
  });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const batch = db.batch();
    const snap = await notificationsCol(db, uid).where("read", "==", false).get();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { read: true });
    }
    await batch.commit();
  });
}

export async function deleteNotification(
  uid: string,
  notificationId: string,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await notificationsCol(db, uid).doc(notificationId).delete();
  });
}
