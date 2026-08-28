// ============================================================================
// CareerPilot AI — POST /api/jobs/[id]/match
// ============================================================================
//
// Run match analysis for a job against the user's active resume.
// POST triggers a fresh analysis. GET returns the latest cached result.
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonError,
  jsonNotFound,
  jsonInternal,
} from "@/lib/api-helpers";
import { getJob } from "@/lib/firestore/jobs";
import { getResume } from "@/lib/firestore/resumes";
import { getLatestJobAnalysis, createJobAnalysis } from "@/lib/firestore/job-analyses";
import { runMatchAnalysis } from "@/lib/matching/engine";
import type { FirestoreJobAnalysis } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: jobId } = await params;

  try {
    // Load job
    const job = await getJob(user.uid, jobId);
    if (!job) return jsonNotFound("Job not found");

    // Load active resume
    let activeResume = await findActiveResume(user.uid);

    // Fallback: try to parse request body for resumeId
    if (!activeResume) {
      let body: { resumeId?: string } = {};
      try {
        body = await request.json();
      } catch {
        // No body or invalid JSON — that's fine
      }
      if (body.resumeId) {
        activeResume = await getResume(user.uid, body.resumeId);
      }
    }

    if (!activeResume) {
      return jsonError(
        "No resume found. Please upload and activate a resume first.",
        400,
      );
    }

    if (activeResume.status !== "ready" || !activeResume.parsedData) {
      return jsonError(
        "Your resume is still processing or failed to process. Please wait or re-upload.",
        400,
      );
    }

    // Run match analysis
    const result = await runMatchAnalysis({
      resume: activeResume.parsedData,
      job: job,
    });

    // Save to Firestore
    const analysisData: Omit<FirestoreJobAnalysis, "id" | "createdAt"> = {
      jobId,
      resumeId: activeResume.id,
      model: result.model,
      promptVersion: result.promptVersion,
      overallScore: result.overallScore,
      skillScore: result.skillScore,
      experienceScore: result.experienceScore,
      educationScore: result.educationScore,
      seniorityScore: result.seniorityScore,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      matchedPreferredSkills: result.matchedPreferredSkills,
      skillEvidence: result.skillEvidence,
      experienceGaps: result.experienceGaps,
      strengths: result.strengths,
      gaps: result.gaps,
      evidence: result.evidence,
      recommendation: result.recommendation,
      confidence: result.confidence,
      summary: result.summary,
    };

    const savedAnalysis = await createJobAnalysis(user.uid, jobId, analysisData);

    return jsonOk({
      analysis: savedAnalysis,
      // Also return the full engine output for immediate display
      full: result,
    });
  } catch (error) {
    console.error("[Match] Analysis failed:", error);
    if (error instanceof Error && error.message.includes("No resume")) {
      return jsonError(error.message, 400);
    }
    return jsonInternal(
      error instanceof Error ? error.message : "Match analysis failed",
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

    const analysis = await getLatestJobAnalysis(user.uid, jobId);
    if (!analysis) {
      return jsonOk({ analysis: null, message: "No analysis yet. POST to run analysis." });
    }

    return jsonOk({ analysis });
  } catch (error) {
    return jsonInternal(
      error instanceof Error ? error.message : "Failed to get analysis",
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findActiveResume(uid: string) {
  const { getResumes } = await import("@/lib/firestore/resumes");
  const resumes = await getResumes(uid);
  return resumes.find((r) => r.active && r.status === "ready" && r.parsedData) ?? null;
}
