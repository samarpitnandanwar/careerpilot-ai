// ============================================================================
// CareerPilot AI — Activity Firestore Service
// ============================================================================

import { getDb, activityCol, newId, now } from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreActivity } from "@/types";

export interface CreateActivityInput {
  type: string;
  message: string;
  entityType: string;
  entityId: string;
}

export async function createActivity(
  uid: string,
  input: CreateActivityInput,
): Promise<FirestoreActivity> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "activity");

    const activity: FirestoreActivity = {
      id,
      ...input,
      createdAt: now(),
    };

    await activityCol(db, uid).doc(id).set(activity);
    return activity;
  });
}

export async function getActivity(
  uid: string,
  limit = 50,
): Promise<FirestoreActivity[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await activityCol(db, uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((doc) => doc.data() as FirestoreActivity);
  });
}

/**
 * Helper to log common activity events.
 * Call this after each significant data mutation.
 */
export async function logActivity(
  uid: string,
  type: string,
  message: string,
  entityType: string,
  entityId: string,
): Promise<void> {
  await createActivity(uid, { type, message, entityType, entityId });
}
