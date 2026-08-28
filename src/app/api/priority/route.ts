// ============================================================================
// CareerPilot AI — GET /api/priority
// ============================================================================
//
// Returns priority scores for all of the user's jobs.
// Used by the dashboard and jobs page for ranking and sorting.
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonInternal,
} from "@/lib/api-helpers";
import { getJobs } from "@/lib/firestore/jobs";
import { getLatestJobAnalysis } from "@/lib/firestore/job-analyses";
import { getLatestPriorityScores, createPriorityScore } from "@/lib/firestore/priority";
import { calculatePriority } from "@/lib/priority/engine";
import type { FirestoreJobPriority } from "@/types";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    // Load all jobs
    const jobs = await getJobs(user.uid);
    if (jobs.length === 0) {
      return jsonOk({ priorities: [], total: 0 });
    }

    const jobIds = jobs.map((j) => j.id);

    // Try to load cached priority scores
    const cachedScores = await getLatestPriorityScores(user.uid, jobIds);

    // Calculate priorities for jobs that don't have cached scores
    const uncachedJobs = jobs.filter((j) => !cachedScores.has(j.id));

    const newScores: FirestoreJobPriority[] = [];

    if (uncachedJobs.length > 0) {
      const profile = await findProfile(user.uid);
      const applications = await findAllApplications(user.uid);
      const allInterviews = await findAllInterviews(user.uid);

      // Build application lookup
      const appByJob = new Map<string, (typeof applications)[0]>();
      for (const app of applications) {
        appByJob.set(app.jobId, app);
      }

      // Build interviews lookup
      const interviewsByApp = new Map<string, (typeof allInterviews)>();
      for (const interview of allInterviews) {
        const existing = interviewsByApp.get(interview.applicationId) ?? [];
        existing.push(interview);
        interviewsByApp.set(interview.applicationId, existing);
      }

      // Calculate for uncached jobs
      for (const job of uncachedJobs) {
        try {
          const analysis = await getLatestJobAnalysis(user.uid, job.id);
          const app = appByJob.get(job.id) ?? null;
          const interviews = app ? (interviewsByApp.get(app.id) ?? []) : [];

          const result = calculatePriority({
            job,
            matchAnalysis: analysis,
            application: app,
            interviews,
            profile,
          });

          // Save the new score
          const saved = await createPriorityScore(user.uid, job.id, {
            jobId: job.id,
            matchAnalysisId: result.matchAnalysisId,
            applicationId: result.applicationId,
            resumeId: result.resumeId,
            score: result.score,
            level: result.level,
            factors: result.factors,
            explanation: result.explanation,
            recommendedAction: result.recommendedAction,
          });

          newScores.push(saved);
        } catch {
          // Skip jobs that fail — don't crash the whole batch
        }
      }
    }

    // Merge cached and new scores with job details
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const allScores: {
      jobId: string;
      title: string;
      company: string;
      deadline: string | null;
      priority: FirestoreJobPriority;
    }[] = [];

    for (const [jobId, score] of cachedScores) {
      const job = jobMap.get(jobId);
      if (job) {
        allScores.push({
          jobId,
          title: job.title,
          company: job.company,
          deadline: job.deadline,
          priority: score,
        });
      }
    }

    for (const score of newScores) {
      const job = jobMap.get(score.jobId);
      if (job) {
        allScores.push({
          jobId: score.jobId,
          title: job.title,
          company: job.company,
          deadline: job.deadline,
          priority: score,
        });
      }
    }

    // Sort by score descending
    allScores.sort((a, b) => b.priority.score - a.priority.score);

    return jsonOk({
      priorities: allScores,
      total: allScores.length,
    });
  } catch (error) {
    return jsonInternal(
      error instanceof Error ? error.message : "Failed to get priorities",
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findProfile(uid: string) {
  const { getProfile } = await import("@/lib/firestore/users");
  return getProfile(uid);
}

async function findAllApplications(uid: string) {
  const { getApplications } = await import("@/lib/firestore/applications");
  return getApplications(uid);
}

async function findAllInterviews(uid: string) {
  const { getInterviews } = await import("@/lib/firestore/interviews");
  return getInterviews(uid);
}
