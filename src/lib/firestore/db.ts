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
