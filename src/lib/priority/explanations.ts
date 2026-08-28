// ============================================================================
// CareerPilot AI — Priority Explanations
// ============================================================================
//
// Generates human-readable explanations for each priority factor and the
// overall priority score. Every explanation is grounded in actual data.
//
// Uses the real job deadline, NEVER postedAt.
// ============================================================================

import type { ApplicationStatus, PriorityLevel, RecommendedAction } from "@/types";
import { APPLICATION_STATE_LABELS, getDaysUntilDeadline } from "./scorer";

// ---------------------------------------------------------------------------
// Factor explanation builder
// ---------------------------------------------------------------------------

export interface FactorExplanationInput {
  matchQuality: number;
  matchScore: number;
  urgency: number;
  deadline: number;
  deadlineDate: string | null;
  deadlineExpired: boolean;
  careerFit: number;
  profileExists: boolean;
  applicationState: number;
  applicationStatus: ApplicationStatus;
  interviewDate: string | null;
}

export function buildFactorExplanations(
  input: FactorExplanationInput,
): { name: string; weight: number; value: number; impact: string; explanation: string }[] {
  const factors: { name: string; weight: number; value: number; impact: string; explanation: string }[] = [];

  // Match Quality
  factors.push({
    name: "Match Quality",
    weight: 0.35,
    value: input.matchQuality,
    impact: input.matchQuality >= 60 ? "positive" : input.matchQuality >= 40 ? "neutral" : "negative",
    explanation: buildMatchExplanation(input.matchScore, input.matchQuality),
  });

  // Urgency
  factors.push({
    name: "Urgency",
    weight: 0.25,
    value: input.urgency,
    impact: input.urgency >= 70 ? "positive" : input.urgency >= 40 ? "neutral" : "low",
    explanation: buildUrgencyExplanation(input.urgency, input.deadlineDate, input.interviewDate),
  });

  // Career Fit
  factors.push({
    name: "Career Fit",
    weight: 0.15,
    value: input.careerFit,
    impact: input.careerFit >= 60 ? "positive" : input.careerFit >= 40 ? "neutral" : "low",
    explanation: buildCareerFitExplanation(input.careerFit, input.profileExists),
  });

  // Deadline
  factors.push({
    name: "Deadline",
    weight: 0.15,
    value: input.deadline,
    impact: input.deadline >= 60 ? "positive" : input.deadline >= 30 ? "neutral" : "low",
    explanation: buildDeadlineExplanation(input.deadline, input.deadlineDate, input.deadlineExpired),
  });

  // Application State
  factors.push({
    name: "Application State",
    weight: 0.10,
    value: input.applicationState,
    impact: input.applicationState >= 70 ? "positive" : input.applicationState >= 40 ? "neutral" : "low",
    explanation: buildApplicationStateExplanation(input.applicationStatus),
  });

  return factors;
}

// ---------------------------------------------------------------------------
// Individual factor explanations
// ---------------------------------------------------------------------------

function buildMatchExplanation(matchScore: number, matchQuality: number): string {
  if (matchQuality >= 90) {
    return `Excellent match (${matchScore}%) — strong alignment across skills and experience.`;
  }
  if (matchQuality >= 70) {
    return `Strong match (${matchScore}%) — good alignment with most requirements.`;
  }
  if (matchQuality >= 50) {
    return `Moderate match (${matchScore}%) — meets some requirements with notable gaps.`;
  }
  if (matchScore > 0) {
    return `Weak match (${matchScore}%) — significant gaps between profile and requirements.`;
  }
  return "No match analysis available yet. Run match analysis to see your fit score.";
}

function buildUrgencyExplanation(
  urgency: number,
  deadlineDate: string | null,
  interviewDate: string | null,
): string {
  // Interview approaching takes precedence
  if (interviewDate) {
    const days = getDaysUntilDeadline(interviewDate);
    if (days !== null) {
      if (days <= 0) return "Interview is today or already happened.";
      if (days <= 3) return `Interview in ${days} day(s) — immediate preparation needed.`;
      if (days <= 7) return `Interview in ${days} days — start preparing soon.`;
      return `Interview in ${days} days — plan your preparation.`;
    }
  }

  // Real deadline urgency
  if (deadlineDate) {
    const days = getDaysUntilDeadline(deadlineDate);
    if (days !== null) {
      if (days < 0) return "Application deadline has passed.";
      if (days <= 3) return `Application deadline in ${days} day(s) — apply immediately.`;
      if (days <= 7) return `Application deadline in ${days} days — act soon.`;
      if (days <= 14) return `Application deadline in ${days} days — moderate urgency.`;
      return `Application deadline in ${days} days — no immediate rush.`;
    }
  }

  return "No time-sensitive events. Moderate urgency based on recency.";
}

function buildCareerFitExplanation(careerFit: number, profileExists: boolean): string {
  if (!profileExists) {
    return "Career profile not set up yet. Complete onboarding to improve career fit scoring.";
  }
  if (careerFit >= 75) {
    return "Strong career alignment — role matches your targets and preferences.";
  }
  if (careerFit >= 55) {
    return "Good career alignment — some match with your preferences.";
  }
  if (careerFit >= 40) {
    return "Moderate alignment — partial match with your career goals.";
  }
  return "Limited alignment with your stated career preferences.";
}

function buildDeadlineExplanation(deadline: number, deadlineDate: string | null, deadlineExpired: boolean): string {
  // No deadline set
  if (!deadlineDate) {
    return "No application deadline specified. Priority is based on match quality and other factors.";
  }

  const days = getDaysUntilDeadline(deadlineDate);

  // Invalid date
  if (days === null) {
    return "Deadline information is unavailable or invalid.";
  }

  // Expired deadline
  if (deadlineExpired) {
    return "This opportunity's application deadline has expired. New applications may not be accepted.";
  }

  // Active deadline
  if (days === 0) return "Application deadline is today.";
  if (days <= 3) return `Deadline in ${days} day(s) — high time pressure.`;
  if (days <= 7) return `Deadline in ${days} days — moderate time pressure.`;
  if (days <= 14) return `Deadline in ${days} days — sufficient time to prepare.`;
  return `Deadline in ${days} days — plenty of time to prepare a strong application.`;
}

function buildApplicationStateExplanation(status: ApplicationStatus): string {
  return APPLICATION_STATE_LABELS[status] ?? "Unknown status.";
}

// ---------------------------------------------------------------------------
// Summary explanation
// ---------------------------------------------------------------------------

export interface SummaryExplanationInput {
  score: number;
  level: PriorityLevel;
  matchScore: number;
  matchQuality: number;
  urgency: number;
  deadline: number;
  deadlineDate: string | null;
  deadlineExpired: boolean;
  careerFit: number;
  applicationStatus: ApplicationStatus;
  recommendedAction: RecommendedAction;
  interviewDate: string | null;
}

export function buildSummaryExplanation(input: SummaryExplanationInput): string {
  const parts: string[] = [];

  // Opening
  parts.push(`${input.score}% priority — ${input.level}.`);

  // Match
  if (input.matchQuality >= 75) {
    parts.push(`Strong ${input.matchScore}% match.`);
  } else if (input.matchQuality >= 50) {
    parts.push(`${input.matchScore}% match — moderate fit.`);
  } else if (input.matchScore > 0) {
    parts.push(`Low ${input.matchScore}% match.`);
  }

  // Deadline state
  if (input.deadlineExpired) {
    parts.push("Application deadline has expired.");
  } else if (input.deadlineDate) {
    const days = getDaysUntilDeadline(input.deadlineDate);
    if (days !== null && days >= 0 && days <= 3) {
      parts.push(`Deadline in ${days} day(s).`);
    }
  }

  // Urgency
  if (input.urgency >= 80) {
    if (input.interviewDate) {
      parts.push("Interview approaching soon.");
    } else if (!input.deadlineExpired) {
      parts.push("Time-sensitive — act quickly.");
    }
  } else if (input.urgency >= 50) {
    parts.push("Moderate urgency.");
  }

  // Action
  const actionLabel = input.recommendedAction.replace(/_/g, " ").toLowerCase();
  parts.push(`→ ${capitalize(actionLabel)}.`);

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
