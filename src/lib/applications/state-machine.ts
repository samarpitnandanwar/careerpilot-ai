// ============================================================================
// CareerPilot AI — Application State Machine
// ============================================================================
//
// Deterministic transition rules and next-action calculation.
// NO Gemini dependency — purely algorithmic.
// ============================================================================

import type { ApplicationStatus } from "@/types";

// ---------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------

/**
 * Maps each status to the set of statuses it can transition TO.
 * The server enforces these rules — the client cannot override them.
 */
export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  saved: ["applied", "withdrawn"],
  applied: ["screening", "assessment", "interview", "rejected", "withdrawn"],
  screening: ["assessment", "interview", "rejected", "withdrawn"],
  assessment: ["interview", "rejected", "withdrawn"],
  interview: ["offer", "rejected", "withdrawn"],
  offer: ["accepted", "rejected", "withdrawn"],
  accepted: [], // terminal state
  rejected: [], // terminal state
  withdrawn: [], // terminal state
};

/**
 * Check whether a status transition is valid.
 */
export function isValidTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get human-readable description of a transition.
 */
export function describeTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): string {
  return `${from} → ${to}`;
}

// ---------------------------------------------------------------------------
// Activity type derivation
// ---------------------------------------------------------------------------

/**
 * Derive the activity type from a status transition.
 * The server controls this — the client cannot override it.
 */
export function deriveActivityType(
  from: ApplicationStatus,
  to: ApplicationStatus,
): string {
  if (to === "applied") return "APPLICATION_SUBMITTED";
  if (to === "screening") return "SCREENING_STARTED";
  if (to === "assessment") return "ASSESSMENT_RECEIVED";
  if (to === "interview") return "INTERVIEW_SCHEDULED";
  if (to === "offer") return "OFFER_RECEIVED";
  if (to === "accepted") return "APPLICATION_ACCEPTED";
  if (to === "rejected") return "APPLICATION_REJECTED";
  if (to === "withdrawn") return "APPLICATION_WITHDRAWN";
  return "STATUS_CHANGED";
}

/**
 * Generate a human-readable message for a status change.
 */
export function deriveActivityMessage(
  from: ApplicationStatus,
  to: ApplicationStatus,
): string {
  const messages: Record<string, string> = {
    "saved→applied": "Application submitted",
    "saved→withdrawn": "Application withdrawn before submission",
    "applied→screening": "Moved to screening stage",
    "applied→assessment": "Received assessment/test",
    "applied→interview": "Interview scheduled",
    "applied→rejected": "Application rejected",
    "applied→withdrawn": "Application withdrawn",
    "screening→assessment": "Received assessment/test",
    "screening→interview": "Interview scheduled",
    "screening→rejected": "Rejected after screening",
    "screening→withdrawn": "Application withdrawn during screening",
    "assessment→interview": "Interview scheduled after assessment",
    "assessment→rejected": "Rejected after assessment",
    "assessment→withdrawn": "Application withdrawn during assessment",
    "interview→offer": "Offer received!",
    "interview→rejected": "Rejected after interview",
    "interview→withdrawn": "Application withdrawn after interview",
    "offer→accepted": "Offer accepted!",
    "offer→rejected": "Declined the offer",
    "offer→withdrawn": "Application withdrawn after offer",
  };
  return messages[`${from}→${to}`] ?? `Status changed to ${to}`;
}

// ---------------------------------------------------------------------------
// Next action engine
// ---------------------------------------------------------------------------

export interface NextAction {
  action: string;
  label: string;
  description: string;
  date: string | null;
}

/**
 * Calculate the next recommended action based on application status and context.
 * Deterministic — no Gemini dependency.
 */
export function calculateNextAction(
  status: ApplicationStatus,
  context: {
    deadline?: string | null;
    followUpDate?: string | null;
    interviewDate?: string | null;
    nextActionAt?: string | null;
  } = {},
): NextAction {
  const now = new Date();

  // Coerce optional fields to null
  const deadline = context.deadline ?? null;
  const followUpDate = context.followUpDate ?? null;
  const interviewDate = context.interviewDate ?? null;

  switch (status) {
    case "saved":
      return {
        action: "APPLY_NOW",
        label: "Submit Application",
        description: "Ready to submit your application",
        date: deadline,
      };

    case "applied": {
      // Check if follow-up is due
      if (followUpDate) {
        const followUp = new Date(followUpDate);
        if (followUp <= now) {
          return {
            action: "FOLLOW_UP",
            label: "Follow Up",
            description: "Follow-up date has arrived — check in with the employer",
            date: followUpDate,
          };
        }
        return {
          action: "WAIT",
          label: "Wait for Response",
          description: `Follow-up scheduled for ${new Date(followUpDate).toLocaleDateString()}`,
          date: followUpDate,
        };
      }
      return {
        action: "WAIT",
        label: "Wait for Response",
        description: "Application submitted — await employer response",
        date: null,
      };
    }

    case "screening":
      return {
        action: "PREPARE_INTERVIEW",
        label: "Prepare for Interview",
        description: "In screening — prepare for potential interview",
        date: interviewDate,
      };

    case "assessment":
      return {
        action: "COMPLETE_ASSESSMENT",
        label: "Complete Assessment",
        description: "Complete the assessment or technical test",
        date: deadline,
      };

    case "interview":
      return {
        action: "PREPARE_INTERVIEW",
        label: "Prepare for Interview",
        description: "Interview stage — prepare with the Interview Copilot",
        date: interviewDate,
      };

    case "offer":
      return {
        action: "REVIEW_OFFER",
        label: "Review Offer",
        description: "Review the offer details and make a decision",
        date: deadline,
      };

    case "accepted":
      return {
        action: "ONBOARDING",
        label: "Onboarding",
        description: "Congratulations! Start your onboarding process",
        date: null,
      };

    case "rejected":
      return {
        action: "NONE",
        label: "No Action Needed",
        description: "This application has been rejected",
        date: null,
      };

    case "withdrawn":
      return {
        action: "NONE",
        label: "No Action Needed",
        description: "This application has been withdrawn",
        date: null,
      };

    default:
      return {
        action: "NONE",
        label: "Unknown",
        description: "Unknown application status",
        date: null,
      };
  }
}

// ---------------------------------------------------------------------------
// Pipeline stage order (for display)
// ---------------------------------------------------------------------------

export const PIPELINE_STAGES: ApplicationStatus[] = [
  "saved",
  "applied",
  "screening",
  "assessment",
  "interview",
  "offer",
  "accepted",
];

/**
 * Get the pipeline position index for a status.
 * Returns -1 for terminal non-pipeline statuses (rejected, withdrawn).
 */
export function getPipelineIndex(status: ApplicationStatus): number {
  return PIPELINE_STAGES.indexOf(status);
}

/**
 * Check whether a status is a terminal state (no further transitions).
 */
export function isTerminalStatus(status: ApplicationStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
