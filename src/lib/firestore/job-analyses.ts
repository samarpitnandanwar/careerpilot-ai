// ============================================================================
// CareerPilot AI — Job Analyses Firestore Service
// ============================================================================
//
// Stores match analyses under users/{uid}/jobs/{jobId}/analyses/{analysisId}.
// Each analysis is versioned — previous analyses are preserved.
// ============================================================================

import { getDb, jobAnalysesCol, jobAnalysisDoc, newId, now } from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreJobAnalysis } from "@/types";

/**
 * Create a new match analysis for a job.
 */
export async function createJobAnalysis(
  uid: string,
  jobId: string,
  data: Omit<FirestoreJobAnalysis, "id" | "createdAt">,
): Promise<FirestoreJobAnalysis> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "jobAnalyses");
    const createdAt = now();

    const analysis: FirestoreJobAnalysis = {
      id,
      ...data,
      createdAt,
    };

    await jobAnalysesCol(db, uid, jobId).doc(id).set(analysis);
    return analysis;
  });
}

/**
 * Get the most recent analysis for a job.
 */
export async function getLatestJobAnalysis(
  uid: string,
  jobId: string,
): Promise<FirestoreJobAnalysis | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await jobAnalysesCol(db, uid, jobId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    return snap.docs.length > 0
      ? (snap.docs[0].data() as FirestoreJobAnalysis)
      : null;
  });
}

/**
 * Get all analyses for a job, ordered by creation date descending.
 */
export async function getJobAnalyses(
  uid: string,
  jobId: string,
): Promise<FirestoreJobAnalysis[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await jobAnalysesCol(db, uid, jobId)
      .orderBy("createdAt", "desc")
      .get();

    return snap.docs.map((doc) => doc.data() as FirestoreJobAnalysis);
  });
}

/**
 * Get a specific analysis by ID.
 */
export async function getJobAnalysis(
  uid: string,
  jobId: string,
  analysisId: string,
): Promise<FirestoreJobAnalysis | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await jobAnalysisDoc(db, uid, jobId, analysisId).get();
    return snap.exists ? (snap.data() as FirestoreJobAnalysis) : null;
  });
}

/**
 * Check if a valid analysis exists for a job.
 * Returns true if there's at least one analysis with a good score.
 */
export async function hasValidAnalysis(
  uid: string,
  jobId: string,
): Promise<boolean> {
  const latest = await getLatestJobAnalysis(uid, jobId);
  return latest !== null;
}
