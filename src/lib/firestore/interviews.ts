// ============================================================================
// CareerPilot AI — Interviews Firestore Service
// ============================================================================

import { getDb, interviewsCol, newId, now } from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreInterview, InterviewCreateInput, InterviewUpdateInput } from "@/types";

export async function createInterview(
  uid: string,
  input: InterviewCreateInput,
): Promise<FirestoreInterview> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "interviews");
    const nowStr = now();

    const interview: FirestoreInterview = {
      id,
      applicationId: input.applicationId,
      scheduledAt: input.scheduledAt,
      interviewType: input.interviewType,
      round: input.round,
      status: "scheduled",
      questions: [],
      notes: input.notes,
      feedback: "",
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await interviewsCol(db, uid).doc(id).set(interview);
    return interview;
  });
}

export async function getInterviews(uid: string): Promise<FirestoreInterview[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await interviewsCol(db, uid).orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => doc.data() as FirestoreInterview);
  });
}

export async function getInterview(
  uid: string,
  interviewId: string,
): Promise<FirestoreInterview | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await interviewsCol(db, uid).doc(interviewId).get();
    return snap.exists ? (snap.data() as FirestoreInterview) : null;
  });
}

export async function updateInterview(
  uid: string,
  interviewId: string,
  data: InterviewUpdateInput,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await interviewsCol(db, uid).doc(interviewId).update({
      ...data,
      updatedAt: now(),
    });
  });
}

export async function deleteInterview(uid: string, interviewId: string): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await interviewsCol(db, uid).doc(interviewId).delete();
  });
}
