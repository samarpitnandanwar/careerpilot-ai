// ============================================================================
// CareerPilot AI — Firestore Collection References
// ============================================================================
//
// All data is isolated under users/{uid}/.
// Every function takes uid as the FIRST parameter — the verified UID from
// the Identity Platform token, never from client request.
// ============================================================================

import {
  FieldValue,
  type CollectionReference,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";

// ---------------------------------------------------------------------------
// Collection reference builders
// ---------------------------------------------------------------------------

function col<T extends DocumentData = DocumentData>(
  db: Firestore,
  ...segments: string[]
): CollectionReference<T> {
  return db.collection(segments.join("/")) as CollectionReference<T>;
}

export function usersCol(db: Firestore) {
  return col(db, "users");
}

export function userDoc(db: Firestore, uid: string) {
  return usersCol(db).doc(uid);
}

export function profilesCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "profile");
}

export function resumesCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "resumes");
}

export function jobsCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "jobs");
}

export function applicationsCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "applications");
}

export function analysesCol(db: Firestore, uid: string, applicationId: string) {
  return col(db, "users", uid, "applications", applicationId, "analyses");
}

export function interviewsCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "interviews");
}

export function notificationsCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "notifications");
}

export function activityCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "activity");
}

export function jobAnalysesCol(db: Firestore, uid: string, jobId: string) {
  return col(db, "users", uid, "jobs", jobId, "analyses");
}

export function jobAnalysisDoc(
  db: Firestore,
  uid: string,
  jobId: string,
  analysisId: string,
) {
  return jobAnalysesCol(db, uid, jobId).doc(analysisId);
}

export function jobPrioritiesCol(db: Firestore, uid: string, jobId: string) {
  return col(db, "users", uid, "jobs", jobId, "priority");
}

export function jobPriorityDoc(
  db: Firestore,
  uid: string,
  jobId: string,
  priorityId: string,
) {
  return jobPrioritiesCol(db, uid, jobId).doc(priorityId);
}

export function interviewPrepCol(
  db: Firestore,
  uid: string,
  applicationId: string,
) {
  return col(db, "users", uid, "applications", applicationId, "interviewPrep");
}

export function interviewPrepDoc(
  db: Firestore,
  uid: string,
  applicationId: string,
  prepId: string,
) {
  return interviewPrepCol(db, uid, applicationId).doc(prepId);
}

export function applicationActivitiesCol(
  db: Firestore,
  uid: string,
  applicationId: string,
) {
  return col(db, "users", uid, "applications", applicationId, "activities");
}

export function actionsCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "actions");
}

export function actionDoc(db: Firestore, uid: string, actionId: string) {
  return actionsCol(db, uid).doc(actionId);
}

export function eventProcessingCol(db: Firestore, uid: string) {
  return col(db, "users", uid, "eventProcessing");
}

export function eventProcessingDoc(
  db: Firestore,
  uid: string,
  eventId: string,
) {
  return eventProcessingCol(db, uid).doc(eventId);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getDb(): Firestore {
  return getAdminFirestore();
}

/** Returns an ISO timestamp string for server-side use. */
export function now(): string {
  return new Date().toISOString();
}

/** Returns a Firestore server timestamp for field writes. */
export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}

/** Generates a new auto-ID for a collection. */
export function newId(db: Firestore, uid: string, collection: string): string {
  return db.collection("users").doc(uid).collection(collection).doc().id;
}
