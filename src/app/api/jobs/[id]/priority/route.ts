// ============================================================================
// CareerPilot AI — /api/jobs/[id]/priority
// ============================================================================
//
// POST: Run priority analysis for a job
// GET:  Retrieve latest cached priority score
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonNotFound,
  jsonInternal,
} from "@/lib/api-helpers";
import { getJob } from "@/lib/firestore/jobs";
import { getLatestJobAnalysis } from "@/lib/firestore/job-analyses";
import { getLatestPriorityScore, createPriorityScore } from "@/lib/firestore/priority";
import { runPriorityAnalysis } from "@/lib/priority/engine";
import type { FirestoreJobPriority } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: jobId } = await params;

  try {
    // Load job
    const job = await getJob(user.uid, jobId);
    if (!job) return jsonNotFound("Job not found");

    // Load match analysis
    const matchAnalysis = await getLatestJobAnalysis(user.uid, jobId);

    // Load application for this job (if exists)
    const application = await findApplicationForJob(user.uid, jobId);

    // Load interviews for this application (if exists)
    const interviews = application
      ? await findInterviewsForApplication(user.uid, application.id)
      : [];

    // Load profile
    const profile = await findProfile(user.uid);

    // Run priority analysis
    const result = await runPriorityAnalysis({
      job,
      matchAnalysis,
      application,
      interviews,
      profile,
    });

    // Save to Firestore
    const priorityData: Omit<FirestoreJobPriority, "id" | "createdAt" | "updatedAt"> = {
      jobId,
      matchAnalysisId: result.matchAnalysisId,
      applicationId: result.applicationId,
      resumeId: result.resumeId,
      score: result.score,
      level: result.level,
      factors: result.factors,
      explanation: result.explanation,
      recommendedAction: result.recommendedAction,
    };

    const saved = await createPriorityScore(user.uid, jobId, priorityData);

    return jsonOk({ priority: saved });
  } catch (error) {
    console.error("[Priority] Analysis failed:", error);
    return jsonInternal(
      error instanceof Error ? error.message : "Priority analysis failed",
    );
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: jobId } = await params;

  try {
    const job = await getJob(user.uid, jobId);
    if (!job) return jsonNotFound("Job not found");

    const score = await getLatestPriorityScore(user.uid, jobId);
    if (!score) {
      return jsonOk({ priority: null, message: "No priority score yet. POST to calculate." });
    }

    return jsonOk({ priority: score });
  } catch (error) {
    return jsonInternal(
      error instanceof Error ? error.message : "Failed to get priority score",
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findApplicationForJob(uid: string, jobId: string) {
  const { getApplications } = await import("@/lib/firestore/applications");
  const apps = await getApplications(uid);
  return apps.find((a) => a.jobId === jobId) ?? null;
}

async function findInterviewsForApplication(uid: string, applicationId: string) {
  const { getInterviews } = await import("@/lib/firestore/interviews");
  const interviews = await getInterviews(uid);
  return interviews.filter((i) => i.applicationId === applicationId);
}

async function findProfile(uid: string) {
  const { getProfile } = await import("@/lib/firestore/users");
  return getProfile(uid);
}
