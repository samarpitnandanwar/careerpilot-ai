// ============================================================================
// CareerPilot AI — Applications Firestore Service
// ============================================================================
//
// Includes the analyses subcollection for versioned AI analysis results.
// ============================================================================

import {
  getDb,
  applicationsCol,
  analysesCol,
  newId,
  now,
} from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type {
  FirestoreApplication,
  FirestoreAnalysis,
  ApplicationCreateInput,
  ApplicationUpdateInput,
  MatchRecommendation,
  MatchEvidence,
} from "@/types";

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function createApplication(
  uid: string,
  input: ApplicationCreateInput,
): Promise<FirestoreApplication> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "applications");
    const nowStr = now();

    const app: FirestoreApplication = {
      id,
      jobId: input.jobId,
      jobTitle: input.jobTitle,
      company: input.company,
      status: "saved",
      appliedAt: null,
      lastUpdatedAt: nowStr,
      nextAction: null,
      nextActionDate: null,
      currentAnalysisId: null,
      notes: input.notes,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await applicationsCol(db, uid).doc(id).set(app);
    return app;
  });
}

export async function getApplications(uid: string): Promise<FirestoreApplication[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await applicationsCol(db, uid).orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => doc.data() as FirestoreApplication);
  });
}

export async function getApplication(
  uid: string,
  applicationId: string,
): Promise<FirestoreApplication | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await applicationsCol(db, uid).doc(applicationId).get();
    return snap.exists ? (snap.data() as FirestoreApplication) : null;
  });
}

export async function updateApplication(
  uid: string,
  applicationId: string,
  data: ApplicationUpdateInput,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await applicationsCol(db, uid).doc(applicationId).update({
      ...data,
      lastUpdatedAt: now(),
      updatedAt: now(),
    });
  });
}

export async function deleteApplication(
  uid: string,
  applicationId: string,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await applicationsCol(db, uid).doc(applicationId).delete();
  });
}

// ---------------------------------------------------------------------------
// Analyses (subcollection under application)
// ---------------------------------------------------------------------------

export async function createAnalysis(
  uid: string,
  applicationId: string,
  data: {
    model: string;
    promptVersion: string;
    overallScore: number;
    skillScore: number;
    experienceScore: number;
    educationScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    evidence: MatchEvidence[];
    recommendation: MatchRecommendation;
  },
): Promise<FirestoreAnalysis> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "analyses");
    const nowStr = now();

    const analysis: FirestoreAnalysis = {
      id,
      ...data,
      createdAt: nowStr,
    };

    // Write the analysis document
    await analysesCol(db, uid, applicationId).doc(id).set(analysis);

    // Update the parent application to reference this analysis
    await applicationsCol(db, uid).doc(applicationId).update({
      currentAnalysisId: id,
      updatedAt: nowStr,
    });

    return analysis;
  });
}

export async function getAnalyses(
  uid: string,
  applicationId: string,
): Promise<FirestoreAnalysis[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await analysesCol(db, uid, applicationId)
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((doc) => doc.data() as FirestoreAnalysis);
  });
}

export async function getAnalysis(
  uid: string,
  applicationId: string,
  analysisId: string,
): Promise<FirestoreAnalysis | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await analysesCol(db, uid, applicationId).doc(analysisId).get();
    return snap.exists ? (snap.data() as FirestoreAnalysis) : null;
  });
}

export async function getCurrentAnalysis(
  uid: string,
  applicationId: string,
): Promise<FirestoreAnalysis | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const appSnap = await applicationsCol(db, uid).doc(applicationId).get();
    if (!appSnap.exists) return null;

    const appData = appSnap.data() as FirestoreApplication;
    if (!appData.currentAnalysisId) return null;

    const analysisSnap = await analysesCol(db, uid, applicationId)
      .doc(appData.currentAnalysisId)
      .get();

    return analysisSnap.exists
      ? (analysisSnap.data() as FirestoreAnalysis)
      : null;
  });
}
