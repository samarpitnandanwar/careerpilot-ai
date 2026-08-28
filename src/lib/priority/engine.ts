// ============================================================================
// CareerPilot AI — Priority Engine
// ============================================================================
//
// Orchestrates the full priority analysis:
//   Load context → Score factors → Derive level → Build explanation → Output
//
// Numerical scores are ALWAYS deterministic.
// NO Gemini dependency — purely algorithmic.
//
// IMPORTANT: Uses job.deadline (the actual application closing deadline),
// NEVER job.postedAt. If no deadline exists, deadline = null.
// ============================================================================

import type {
  FirestoreJob,
  FirestoreJobAnalysis,
  FirestoreApplication,
  FirestoreInterview,
  FirestoreProfile,
  ApplicationStatus,
  PriorityLevel,
  RecommendedAction,
} from "@/types";
import {
  calculateMatchQuality,
  calculateUrgency,
  calculateDeadlineScore,
  calculateCareerFit,
  calculateApplicationStateScore,
  calculatePriorityScore,
  derivePriorityLevel,
  deriveRecommendedAction,
  isDeadlineExpired,
  PRIORITY_THRESHOLDS,
  type CareerProfile,
  type PriorityFactors,
} from "./scorer";
import { buildFactorExplanations, buildSummaryExplanation } from "./explanations";

// ---------------------------------------------------------------------------
// Engine configuration
// ---------------------------------------------------------------------------

const PRIORITY_ENGINE_VERSION = "v1";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface PriorityEngineInput {
  job: FirestoreJob;
  matchAnalysis: FirestoreJobAnalysis | null;
  application: FirestoreApplication | null;
  interviews: FirestoreInterview[];
  profile: FirestoreProfile | null;
}

export interface PriorityEngineOutput {
  id: string;
  jobId: string;
  matchAnalysisId: string | null;
  applicationId: string | null;
  resumeId: string | null;
  score: number;
  level: PriorityLevel;
  factors: {
    name: string;
    weight: number;
    value: number;
    impact: string;
    explanation: string;
  }[];
  explanation: string;
  recommendedAction: RecommendedAction;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validatePriorityInput(input: PriorityEngineInput): { valid: boolean; error?: string } {
  if (!input.job) return { valid: false, error: "Job is required" };
  if (!input.job.id) return { valid: false, error: "Job ID is required" };
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Main priority calculation
// ---------------------------------------------------------------------------

export function calculatePriority(input: PriorityEngineInput): Omit<PriorityEngineOutput, "id" | "createdAt" | "updatedAt"> {
  const { job, matchAnalysis, application, interviews, profile } = input;

  // Extract scores from existing match analysis (don't recalculate)
  const matchScore = matchAnalysis?.overallScore ?? 50;

  // Find interview dates
  const upcomingInterview = interviews.find((i) => {
    if (!i.scheduledAt) return false;
    return new Date(i.scheduledAt) > new Date();
  });
  const interviewDate = upcomingInterview?.scheduledAt ?? null;

  // Application status
  const applicationStatus: ApplicationStatus = application?.status ?? "saved";
  const applicationId = application?.id ?? null;

  // ---- DEADLINE: use the REAL application deadline, NOT postedAt ----
  const realDeadline = job.deadline;
  const deadlineExpired = isDeadlineExpired(realDeadline);

  // Calculate each factor
  const matchQuality = calculateMatchQuality(matchScore);

  // Urgency uses the real deadline, not postedAt
  const urgency = calculateUrgency(
    realDeadline,
    interviewDate,
    null, // assessment deadline
    application?.followUpDate ?? null,
    job.createdAt,
  );

  // Deadline score uses the real deadline
  const deadlineScore = calculateDeadlineScore(realDeadline);

  // Build career profile for fit calculation
  const careerProfile: CareerProfile | undefined = profile
    ? {
        targetRoles: profile.targetRoles,
        targetCompanies: profile.targetCompanies,
        preferredLocations: profile.preferredLocations,
        remotePreference: profile.remotePreference,
        salaryMin: profile.salaryMin,
        salaryMax: profile.salaryMax,
        skills: profile.skills,
      }
    : undefined;

  const careerFit = calculateCareerFit(
    {
      title: job.title,
      company: job.company,
      location: job.location,
      employmentType: job.employmentType,
      salary: job.salary,
      skills: job.skills,
    },
    careerProfile ?? null,
  );

  const applicationState = calculateApplicationStateScore(applicationStatus);

  // Combined priority score
  const factors: PriorityFactors = {
    matchQuality,
    urgency,
    careerFit,
    deadline: deadlineScore,
    applicationState,
  };

  let score = calculatePriorityScore(factors);

  // If rejected or withdrawn, force score to 0
  if (applicationStatus === "rejected" || applicationStatus === "withdrawn") {
    score = 0;
  }

  // Expired deadline + saved (not yet applied) → cap at LOW priority
  // This prevents expired opportunities from receiving misleading high scores
  if (deadlineExpired && applicationStatus === "saved") {
    score = Math.min(score, PRIORITY_THRESHOLDS.LOW - 1);
  }

  // Derive level and action — pass deadlineExpired for correct behavior
  const level = derivePriorityLevel(score, applicationStatus, deadlineExpired);
  const recommendedAction = deriveRecommendedAction(
    applicationStatus,
    matchScore,
    urgency,
    interviewDate,
    null, // assessment deadline
    deadlineExpired,
  );

  // Build factor explanations
  const factorExplanations = buildFactorExplanations({
    matchQuality,
    matchScore,
    urgency,
    deadline: deadlineScore,
    deadlineDate: realDeadline,
    deadlineExpired,
    careerFit,
    profileExists: !!profile,
    applicationState,
    applicationStatus,
    interviewDate,
  });

  // Build summary explanation
  const explanation = buildSummaryExplanation({
    score,
    level,
    matchScore,
    matchQuality,
    urgency,
    deadline: deadlineScore,
    deadlineDate: realDeadline,
    deadlineExpired,
    careerFit,
    applicationStatus,
    recommendedAction,
    interviewDate,
  });

  return {
    jobId: job.id,
    matchAnalysisId: matchAnalysis?.id ?? null,
    applicationId,
    resumeId: matchAnalysis?.resumeId ?? null,
    score,
    level,
    factors: factorExplanations,
    explanation,
    recommendedAction,
  };
}

// ---------------------------------------------------------------------------
// Full analysis with ID generation
// ---------------------------------------------------------------------------

export async function runPriorityAnalysis(input: PriorityEngineInput): Promise<PriorityEngineOutput> {
  const validation = validatePriorityInput(input);
  if (!validation.valid) {
    throw new PriorityEngineError(validation.error!, "INVALID_INPUT");
  }

  const result = calculatePriority(input);
  const now = new Date().toISOString();

  return {
    ...result,
    id: generatePriorityId(),
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Batch priority for all jobs
// ---------------------------------------------------------------------------

export async function calculateAllPriorities(
  jobs: FirestoreJob[],
  analyses: Map<string, FirestoreJobAnalysis>,
  applications: Map<string, FirestoreApplication>,
  interviewsByApp: Map<string, FirestoreInterview[]>,
  profile: FirestoreProfile | null,
): Promise<Omit<PriorityEngineOutput, "id" | "createdAt" | "updatedAt">[]> {
  const results: Omit<PriorityEngineOutput, "id" | "createdAt" | "updatedAt">[] = [];

  for (const job of jobs) {
    const analysis = analyses.get(job.id) ?? null;

    // Find application for this job
    let app: FirestoreApplication | null = null;
    for (const [, a] of applications) {
      if (a.jobId === job.id) {
        app = a;
        break;
      }
    }

    // Find interviews for this application
    const appInterviews = app ? (interviewsByApp.get(app.id) ?? []) : [];

    const result = calculatePriority({
      job,
      matchAnalysis: analysis,
      application: app,
      interviews: appInterviews,
      profile,
    });

    results.push(result);
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePriorityId(): string {
  return globalThis.crypto.randomUUID();
}

export class PriorityEngineError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "PriorityEngineError";
  }
}

export { PRIORITY_ENGINE_VERSION };
