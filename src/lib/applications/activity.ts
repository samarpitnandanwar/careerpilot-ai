// ============================================================================
// CareerPilot AI — Application Activity Service
// ============================================================================
//
// Creates immutable activity events for application lifecycle changes.
// Every important status change creates an activity record.
// Timestamps and previousStatus are derived server-side — never trusted from client.
// ============================================================================

import { getDb, applicationActivitiesCol, newId, now } from "@/lib/firestore/db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { ApplicationActivity, ActivityType, ApplicationStatus } from "@/types";

// ---------------------------------------------------------------------------
// Create activity event
// ---------------------------------------------------------------------------

export async function createActivity(
  uid: string,
  applicationId: string,
  data: {
    type: ActivityType;
    previousStatus: ApplicationStatus | null;
    newStatus: ApplicationStatus | null;
    message: string;
    metadata?: Record<string, string>;
  },
): Promise<ApplicationActivity> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "applicationActivities");
    const timestamp = now();

    const activity: ApplicationActivity = {
      id,
      applicationId,
      type: data.type,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      message: data.message,
      metadata: data.metadata ?? null,
      timestamp,
      createdAt: timestamp,
    };

    await applicationActivitiesCol(db, uid, applicationId).doc(id).set(activity);
    return activity;
  });
}

// ---------------------------------------------------------------------------
// Get activities for an application
// ---------------------------------------------------------------------------

export async function getActivities(
  uid: string,
  applicationId: string,
): Promise<ApplicationActivity[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await applicationActivitiesCol(db, uid, applicationId)
      .orderBy("timestamp", "desc")
      .get();

    return snap.docs.map((doc) => doc.data() as ApplicationActivity);
  });
}

// ---------------------------------------------------------------------------
// Create note activity
// ---------------------------------------------------------------------------

export async function addNoteActivity(
  uid: string,
  applicationId: string,
  note: string,
): Promise<ApplicationActivity> {
  return createActivity(uid, applicationId, {
    type: "NOTE_ADDED",
    previousStatus: null,
    newStatus: null,
    message: note,
  });
}
