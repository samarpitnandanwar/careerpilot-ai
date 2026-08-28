// ============================================================================
// CareerPilot AI — Priority Scores Firestore Service
// ============================================================================
//
// Stores priority scores under users/{uid}/jobs/{jobId}/priority/{priorityId}.
// Each score is versioned — previous scores are preserved.
// ============================================================================

import { getDb, jobPrioritiesCol, newId, now } from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreJobPriority } from "@/types";

/**
 * Create a new priority score for a job.
 */
export async function createPriorityScore(
  uid: string,
  jobId: string,
  data: Omit<FirestoreJobPriority, "id" | "createdAt" | "updatedAt">,
): Promise<FirestoreJobPriority> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "jobPriorities");
    const timestamp = now();

    const score: FirestoreJobPriority = {
      id,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await jobPrioritiesCol(db, uid, jobId).doc(id).set(score);
    return score;
  });
}

/**
 * Get the most recent priority score for a job.
 */
export async function getLatestPriorityScore(
  uid: string,
  jobId: string,
): Promise<FirestoreJobPriority | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await jobPrioritiesCol(db, uid, jobId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    return snap.docs.length > 0
      ? (snap.docs[0].data() as FirestoreJobPriority)
      : null;
  });
}

/**
 * Get priority scores for multiple jobs (for dashboard ranking).
 */
export async function getLatestPriorityScores(
  uid: string,
  jobIds: string[],
): Promise<Map<string, FirestoreJobPriority>> {
  const result = new Map<string, FirestoreJobPriority>();

  // Fetch in parallel
  const promises = jobIds.map(async (jobId) => {
    const score = await getLatestPriorityScore(uid, jobId);
    if (score) {
      result.set(jobId, score);
    }
  });

  await Promise.all(promises);
  return result;
}

/**
 * Get all priority scores for a job (version history).
 */
export async function getJobPriorityScores(
  uid: string,
  jobId: string,
): Promise<FirestoreJobPriority[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await jobPrioritiesCol(db, uid, jobId)
      .orderBy("createdAt", "desc")
      .get();

    return snap.docs.map((doc) => doc.data() as FirestoreJobPriority);
  });
}
