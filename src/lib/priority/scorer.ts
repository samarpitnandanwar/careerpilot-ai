// ============================================================================
// CareerPilot AI — Priority Scorer
// ============================================================================
//
// Deterministic priority scoring. NO Gemini dependency.
// Calculates priority across multiple dimensions: match quality, urgency,
// application state, career fit, and deadlines.
//
// IMPORTANT: postedAt must NEVER be used as a deadline.
// The deadline field represents the actual application closing deadline.
// If no deadline exists, deadline = null and we use neutral scoring.
// ============================================================================

import type { ApplicationStatus, PriorityLevel, RecommendedAction } from "@/types";

// ---------------------------------------------------------------------------
// Configuration — single location for all priority weights
// ---------------------------------------------------------------------------

export const PRIORITY_WEIGHTS = {
  matchQuality: 0.35,
  urgency: 0.25,
  careerFit: 0.15,
  deadline: 0.15,
  applicationState: 0.10,
} as const;

// Priority level thresholds
export const PRIORITY_THRESHOLDS = {
  CRITICAL: 90,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 1,
  EXCLUDED: 0,
} as const;

// Application state scores (0-100, how much priority boost from current state)
export const APPLICATION_STATE_SCORES: Record<ApplicationStatus, number> = {
  saved: 40,
  applied: 55,
  screening: 70,
  interview: 85,
  offer: 95,
  rejected: 0,
  withdrawn: 10,
};

// Application state labels for explanations
export const APPLICATION_STATE_LABELS: Record<ApplicationStatus, string> = {
  saved: "Not yet applied",
  applied: "Application submitted",
  screening: "In screening process",
  interview: "Interview stage",
  offer: "Offer received",
  rejected: "Application rejected",
  withdrawn: "Application withdrawn",
};

// ---------------------------------------------------------------------------
// Date helpers — centralized date evaluation
// ---------------------------------------------------------------------------

/**
 * Calculate days until a given date string. Positive = future, negative = past.
 * Returns null if the date is invalid/unparseable.
 */
export function getDaysUntilDeadline(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Check whether a real deadline has expired.
 * Returns false for null/missing/invalid deadlines (unknown is not expired).
 */
export function isDeadlineExpired(deadline: string | null): boolean {
  const days = getDaysUntilDeadline(deadline);
  return days !== null && days < 0;
}

/**
 * Check whether a deadline is active (exists and has not expired).
 */
export function isDeadlineActive(deadline: string | null): boolean {
  const days = getDaysUntilDeadline(deadline);
  return days !== null && days >= 0;
}

// ---------------------------------------------------------------------------
// Match quality scoring
// ---------------------------------------------------------------------------

export function calculateMatchQuality(matchScore: number): number {
  // Continuous mapping: 0-100 match → 0-100 priority contribution
  // Exponential curve slightly boosts high matches
  if (matchScore >= 90) return 95 + (matchScore - 90) * 0.5;
  if (matchScore >= 75) return 70 + ((matchScore - 75) / 15) * 25;
  if (matchScore >= 60) return 45 + ((matchScore - 60) / 15) * 25;
  if (matchScore >= 40) return 20 + ((matchScore - 40) / 20) * 25;
  return (matchScore / 40) * 20;
}

// ---------------------------------------------------------------------------
// Urgency scoring
// ---------------------------------------------------------------------------

export function calculateUrgency(
  deadline: string | null,
  interviewDate: string | null,
  assessmentDeadline: string | null,
  followUpDate: string | null,
  createdAt: string,
): number {
  const now = new Date();
  const scores: number[] = [];

  // Deadline urgency — only if a real deadline exists
  if (deadline) {
    const days = getDaysUntilDeadline(deadline);
    if (days !== null) {
      if (days < 0) {
        // Expired deadline — low urgency for new activity, but don't crash
        scores.push(15);
      } else {
        scores.push(daysToUrgencyScore(days));
      }
    }
  }

  // Interview date urgency
  if (interviewDate) {
    const days = getDaysUntilDeadline(interviewDate);
    if (days !== null) {
      if (days < 0) {
        // Past interview → still important but not urgent
        scores.push(50);
      } else {
        scores.push(daysToUrgencyScore(days));
      }
    }
  }

  // Assessment deadline
  if (assessmentDeadline) {
    const days = getDaysUntilDeadline(assessmentDeadline);
    if (days !== null) {
      if (days < 0) {
        scores.push(15);
      } else {
        scores.push(daysToUrgencyScore(days));
      }
    }
  }

  // Follow-up date
  if (followUpDate) {
    const days = getDaysUntilDeadline(followUpDate);
    if (days !== null) {
      if (days < 0) {
        // Overdue follow-up → high urgency
        scores.push(85);
      } else {
        scores.push(daysToUrgencyScore(days));
      }
    }
  }

  // If no time-sensitive events, check recency of creation
  if (scores.length === 0) {
    const daysSinceCreated = daysBetweenDates(createdAt, now.toISOString());
    // Recently created jobs get a moderate urgency boost
    if (daysSinceCreated <= 3) return 60;
    if (daysSinceCreated <= 7) return 45;
    if (daysSinceCreated <= 14) return 35;
    return 25;
  }

  // Take the highest urgency from all time-sensitive events
  return Math.max(...scores);
}

function daysToUrgencyScore(days: number): number {
  if (days < 0) return 10; // Past deadline
  if (days === 0) return 98; // Today
  if (days <= 1) return 95; // Tomorrow
  if (days <= 3) return 85;
  if (days <= 7) return 70;
  if (days <= 14) return 50;
  if (days <= 30) return 30;
  return 15; // Far away
}

// ---------------------------------------------------------------------------
// Deadline scoring
// ---------------------------------------------------------------------------

/**
 * Calculate deadline priority contribution.
 *
 * - null deadline → neutral 50 (no deadline means no penalty, no bonus)
 * - expired deadline → low score (5)
 * - deadline today/tomorrow → high score
 * - distant deadline → moderate-low score
 *
 * Does NOT use createdAt as a proxy for deadline.
 */
export function calculateDeadlineScore(
  deadline: string | null,
): number {
  if (!deadline) {
    // No deadline — neutral score. A job with no deadline can still be high
    // priority due to match quality, interview scheduling, etc.
    return 50;
  }

  const days = getDaysUntilDeadline(deadline);

  // Invalid date — treat as no deadline
  if (days === null) return 50;

  if (days < 0) return 5; // Expired
  if (days === 0) return 95; // Today
  if (days <= 3) return 85;
  if (days <= 7) return 70;
  if (days <= 14) return 55;
  if (days <= 30) return 40;
  return 20;
}

// ---------------------------------------------------------------------------
// Career fit scoring
// ---------------------------------------------------------------------------

export interface CareerProfile {
  targetRoles?: string[];
  targetCompanies?: string[];
  preferredLocations?: string[];
  remotePreference?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  skills?: string[];
}

export function calculateCareerFit(
  job: {
    title?: string | null;
    company?: string | null;
    location?: string | null;
    employmentType?: string | null;
    salary?: string | null;
    skills?: string[];
  },
  profile: CareerProfile | null,
): number {
  if (!profile) return 50; // No profile → neutral score

  let score = 50; // Base
  let factors = 0;

  // Target role match (weight: 30%)
  if (profile.targetRoles && profile.targetRoles.length > 0 && job.title) {
    const title = job.title;
    const roleMatch = profile.targetRoles.some((role) =>
      title.toLowerCase().includes(role.toLowerCase()),
    );
    const contribution = roleMatch ? 30 : -5;
    score += contribution;
    factors++;
  }

  // Target company match (weight: 20%)
  if (profile.targetCompanies && profile.targetCompanies.length > 0 && job.company) {
    const company = job.company;
    const companyMatch = profile.targetCompanies.some((co) =>
      company.toLowerCase().includes(co.toLowerCase()),
    );
    const contribution = companyMatch ? 20 : -3;
    score += contribution;
    factors++;
  }

  // Location match (weight: 15%)
  if (profile.preferredLocations && profile.preferredLocations.length > 0 && job.location) {
    const locationLower = job.location.toLowerCase();
    const locationMatch = profile.preferredLocations.some(
      (loc) => locationLower.includes(loc.toLowerCase()),
    );
    // Remote preference
    const isRemote = locationLower.includes("remote");
    const remoteMatch =
      isRemote &&
      (profile.remotePreference === "remote" || profile.remotePreference === "hybrid");

    if (locationMatch || remoteMatch) {
      score += 15;
    } else if (isRemote && profile.remotePreference === "onsite") {
      score -= 10;
    }
    factors++;
  }

  // Salary match (weight: 15%)
  if (profile.salaryMin && job.salary) {
    const parsed = parseSalary(job.salary);
    if (parsed) {
      const salaryMatch = parsed.max >= profile.salaryMin;
      score += salaryMatch ? 15 : -5;
      factors++;
    }
  }

  // Skill overlap (weight: 20%)
  if (profile.skills && profile.skills.length > 0 && job.skills && job.skills.length > 0) {
    const profileSkillsLower = profile.skills.map((s) => s.toLowerCase());
    const jobSkillsLower = job.skills.map((s) => s.toLowerCase());
    const overlap = jobSkillsLower.filter((s) => profileSkillsLower.includes(s)).length;
    const overlapPct = overlap / jobSkillsLower.length;
    const skillScore = Math.round(overlapPct * 20);
    score += skillScore - 10; // Range: -10 to +10
    factors++;
  }

  // If no factors were evaluated, return neutral
  if (factors === 0) return 50;

  return clampScore(score);
}

// ---------------------------------------------------------------------------
// Application state scoring
// ---------------------------------------------------------------------------

export function calculateApplicationStateScore(status: ApplicationStatus): number {
  return APPLICATION_STATE_SCORES[status] ?? 40;
}

// ---------------------------------------------------------------------------
// Combined priority score
// ---------------------------------------------------------------------------

export interface PriorityFactors {
  matchQuality: number;
  urgency: number;
  careerFit: number;
  deadline: number;
  applicationState: number;
}

export function calculatePriorityScore(factors: PriorityFactors): number {
  const score =
    factors.matchQuality * PRIORITY_WEIGHTS.matchQuality +
    factors.urgency * PRIORITY_WEIGHTS.urgency +
    factors.careerFit * PRIORITY_WEIGHTS.careerFit +
    factors.deadline * PRIORITY_WEIGHTS.deadline +
    factors.applicationState * PRIORITY_WEIGHTS.applicationState;

  return clampScore(Math.round(score));
}

// ---------------------------------------------------------------------------
// Priority level derivation
// ---------------------------------------------------------------------------

/**
 * Derive priority level from score.
 *
 * If the deadline is expired and the job has NOT been applied to yet,
 * cap at LOW to prevent expired opportunities from appearing high priority.
 *
 * For active applications (applied/screening/interview/offer), an expired
 * application deadline does NOT destroy priority — the user may still be
 * in the pipeline.
 */
export function derivePriorityLevel(
  score: number,
  status: ApplicationStatus,
  deadlineExpired: boolean,
): PriorityLevel {
  if (status === "rejected") return "EXCLUDED";
  if (status === "withdrawn") return "LOW";

  // Expired deadline + not yet applied → cap at LOW
  // This prevents "APPLY_NOW" for expired opportunities
  if (deadlineExpired && status === "saved") {
    return "LOW";
  }

  if (score >= PRIORITY_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (score >= PRIORITY_THRESHOLDS.HIGH) return "HIGH";
  if (score >= PRIORITY_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

// ---------------------------------------------------------------------------
// Recommended action derivation
// ---------------------------------------------------------------------------

/**
 * Derive recommended action.
 *
 * If the deadline is expired:
 *   - saved → DEPRIORITIZE (cannot apply anymore)
 *   - applied/screening/interview/offer → keep existing pipeline action
 *     (the user is already in the process)
 *
 * This ensures:
 *   - expired + saved + high match → DEPRIORITIZE (not APPLY_NOW)
 *   - expired + applied → FOLLOW_UP/WAIT still valid
 *   - expired + interview → PREPARE_INTERVIEW still valid
 *   - expired + offer → REVIEW_OFFER still valid
 */
export function deriveRecommendedAction(
  status: ApplicationStatus,
  matchScore: number,
  urgencyScore: number,
  interviewDate: string | null,
  assessmentDeadline: string | null,
  deadlineExpired: boolean,
): RecommendedAction {
  if (status === "rejected") return "EXCLUDED";
  if (status === "withdrawn") return "DEPRIORITIZE";

  // Offer → review
  if (status === "offer") return "REVIEW_OFFER";

  // Interview stage — deadline expiry doesn't change this
  if (status === "interview") {
    if (interviewDate) {
      const days = getDaysUntilDeadline(interviewDate);
      if (days !== null && days <= 3) return "PREPARE_INTERVIEW";
    }
    return "PREPARE_INTERVIEW";
  }

  // Screening → prepare for interview — deadline expiry doesn't change this
  if (status === "screening") return "PREPARE_INTERVIEW";

  // Assessment deadline approaching
  if (assessmentDeadline) {
    const days = getDaysUntilDeadline(assessmentDeadline);
    if (days !== null && days >= 0 && days <= 7) return "COMPLETE_ASSESSMENT";
  }

  // Applied → follow up — deadline expiry doesn't prevent following up
  if (status === "applied") {
    if (urgencyScore >= 70) return "FOLLOW_UP";
    return "WAIT";
  }

  // Saved — decide based on match, urgency, and deadline expiry
  if (status === "saved") {
    // Expired deadline + saved → cannot apply anymore
    if (deadlineExpired) return "DEPRIORITIZE";

    if (matchScore >= 75 && urgencyScore >= 70) return "APPLY_NOW";
    if (matchScore >= 60 && urgencyScore >= 50) return "PREPARE_APPLICATION";
    if (matchScore >= 60) return "PREPARE_APPLICATION";
    return "DEPRIORITIZE";
  }

  return "WAIT";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

function daysBetweenDates(a: string, b: string): number {
  const diffMs = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function parseSalary(salaryStr: string): { min: number; max: number } | null {
  // Try to parse salary like "$120k-$180k" or "120000-180000"
  const cleaned = salaryStr.replace(/[$,]/g, "").toLowerCase();
  const rangeMatch = cleaned.match(/(\d+)\s*k?\s*[-–to]+\s*(\d+)\s*k?/);
  if (rangeMatch) {
    let min = parseInt(rangeMatch[1], 10);
    let max = parseInt(rangeMatch[2], 10);
    if (min < 1000) min *= 1000;
    if (max < 1000) max *= 1000;
    return { min, max };
  }
  const singleMatch = cleaned.match(/(\d+)\s*k?/);
  if (singleMatch) {
    let val = parseInt(singleMatch[1], 10);
    if (val < 1000) val *= 1000;
    return { min: val, max: val };
  }
  return null;
}
