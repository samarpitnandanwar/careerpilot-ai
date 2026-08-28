// ============================================================================
// CareerPilot AI — Action Generator
// ============================================================================
//
// Deterministic mapping from domain events to career actions.
// NO Gemini — purely algorithmic. Same input → same output.
// ============================================================================

import type { DomainEventEnvelope, PriorityLevel } from "@/types";
import type { ActionType, ActionPriority } from "./types";

// ---------------------------------------------------------------------------
// Action Key (for idempotency)
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic action key for deduplication.
 * Same event type + aggregate + date → same key.
 */
export function generateActionKey(
  actionType: ActionType,
  aggregateId: string,
  dateKey: string,
): string {
  return `action_${actionType}_${aggregateId}_${dateKey}`;
}

/**
 * Generate a deterministic action key for HIGH_PRIORITY_JOB actions.
 * Uses jobId + priorityDate so repeated priority calculations don't create duplicates.
 */
export function generatePriorityActionKey(
  jobId: string,
  priorityDate: string,
): string {
  const dateKey = priorityDate.split("T")[0];
  return `action_HIGH_PRIORITY_JOB_${jobId}_${dateKey}`;
}

// ---------------------------------------------------------------------------
// Action URL Generation
// ---------------------------------------------------------------------------

function actionUrlForApplication(applicationId: string): string {
  return `/applications/${applicationId}`;
}

function actionUrlForJob(jobId: string): string {
  return `/jobs/${jobId}`;
}

function actionUrlForInterview(applicationId: string): string {
  return `/interview/${applicationId}`;
}

// ---------------------------------------------------------------------------
// Priority Derivation
// ---------------------------------------------------------------------------

function derivePriority(eventType: string, dueAt?: string | null): ActionPriority {
  // If due today or tomorrow, escalate
  if (dueAt) {
    const daysUntil = Math.ceil(
      (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil <= 0) return "CRITICAL";
    if (daysUntil <= 1) return "CRITICAL";
    if (daysUntil <= 3) return "HIGH";
  }

  switch (eventType) {
    case "INTERVIEW_SCHEDULED":
      // Interviews are always at least HIGH priority
      return dueAt ? "HIGH" : "CRITICAL";
    case "OFFER_RECEIVED":
      return "CRITICAL";
    case "FOLLOW_UP_DUE":
      return "HIGH";
    case "APPLICATION_DEADLINE_APPROACHING":
      return "HIGH";
    case "APPLICATION_DEADLINE_EXPIRED":
      return "MEDIUM";
    case "APPLICATION_STATUS_CHANGED":
      return "MEDIUM";
    case "APPLICATION_SUBMITTED":
      return "LOW";
    default:
      return "LOW";
  }
}

// ---------------------------------------------------------------------------
// Expiration Derivation
// ---------------------------------------------------------------------------

function deriveExpiresAt(eventType: string, dueAt?: string | null): string | null {
  if (!dueAt) return null;

  const due = new Date(dueAt);

  switch (eventType) {
    case "INTERVIEW_SCHEDULED":
      // Expire 24 hours after interview
      return new Date(due.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case "FOLLOW_UP_DUE":
      // Expire 3 days after due date
      return new Date(due.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    case "APPLICATION_DEADLINE_APPROACHING":
      // Expire 1 day after deadline
      return new Date(due.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Terminal Status → Active Priority Action Lifecycle
// ---------------------------------------------------------------------------

/**
 * Determine whether a priority action should be expired for a terminal status.
 * Terminal statuses: rejected, withdrawn, accepted.
 * These should not have active HIGH_PRIORITY_JOB actions.
 */
export function shouldExpirePriorityAction(
  applicationStatus: string,
): boolean {
  return (
    applicationStatus === "rejected" ||
    applicationStatus === "withdrawn" ||
    applicationStatus === "accepted"
  );
}

// ---------------------------------------------------------------------------
// Map PriorityLevel → ActionPriority
// ---------------------------------------------------------------------------

/**
 * Map a PriorityLevel from the Priority Engine to an ActionPriority.
 * CRITICAL → CRITICAL, HIGH → HIGH, everything else → MEDIUM.
 */
export function mapPriorityLevelToActionPriority(
  level: PriorityLevel,
): ActionPriority {
  switch (level) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "HIGH";
    case "EXCLUDED":
      return "LOW";
    case "MEDIUM":
    case "LOW":
    default:
      return "MEDIUM";
  }
}

// ---------------------------------------------------------------------------
// Generate HIGH_PRIORITY_JOB Action from Priority Data
// ---------------------------------------------------------------------------

export interface PriorityActionInput {
  jobId: string;
  jobTitle: string;
  company: string;
  applicationId: string | null;
  priorityLevel: PriorityLevel;
  priorityDate: string;
}

export interface GeneratedAction {
  type: ActionType;
  priority: ActionPriority;
  title: string;
  description: string;
  applicationId: string | null;
  jobId: string | null;
  interviewId: string | null;
  dueAt: string | null;
  expiresAt: string | null;
  actionUrl: string;
  sourceEventId: string;
  actionKey: string;
}

/**
 * Generate a HIGH_PRIORITY_JOB action from priority engine data.
 * Returns null if the priority level doesn't warrant an action (LOW, EXCLUDED).
 */
export function generateHighPriorityJobAction(
  input: PriorityActionInput,
): GeneratedAction | null {
  // Only create actions for CRITICAL and HIGH priority
  if (input.priorityLevel !== "CRITICAL" && input.priorityLevel !== "HIGH") {
    return null;
  }

  const actionPriority = mapPriorityLevelToActionPriority(input.priorityLevel);
  const dateKey = input.priorityDate.split("T")[0];

  return {
    type: "HIGH_PRIORITY_JOB",
    priority: actionPriority,
    title: "High-priority opportunity",
    description: input.company
      ? `${input.jobTitle} at ${input.company} is currently one of your highest-priority opportunities.`
      : `${input.jobTitle} is currently one of your highest-priority opportunities.`,
    applicationId: input.applicationId,
    jobId: input.jobId,
    interviewId: null,
    dueAt: null,
    expiresAt: null,
    actionUrl: actionUrlForJob(input.jobId),
    sourceEventId: `priority_${input.jobId}_${dateKey}`,
    actionKey: generatePriorityActionKey(input.jobId, input.priorityDate),
  };
}

// ---------------------------------------------------------------------------
// Event → Action Mapping
// ---------------------------------------------------------------------------

/**
 * Generate a career action from a domain event.
 * Returns null if the event does not produce an actionable item.
 */
export function generateActionFromEvent(
  event: DomainEventEnvelope,
): GeneratedAction | null {
  const { eventType, eventId, payload } = event;
  const dateKey = new Date(event.occurredAt).toISOString().split("T")[0];

  switch (eventType) {
    case "INTERVIEW_SCHEDULED": {
      const applicationId = payload.applicationId ?? null;
      const interviewId = payload.interviewId ?? null;
      const dueAt = payload.scheduledAt ?? null;

      return {
        type: "INTERVIEW_PREP",
        priority: derivePriority(eventType, dueAt),
        title: "Prepare for interview",
        description: payload.jobTitle
          ? `You have an upcoming interview for ${payload.jobTitle}${payload.company ? ` at ${payload.company}` : ""}.`
          : "You have an upcoming interview. Prepare using the Interview Copilot.",
        applicationId,
        jobId: payload.jobId ?? null,
        interviewId,
        dueAt,
        expiresAt: deriveExpiresAt(eventType, dueAt),
        actionUrl: applicationId
          ? actionUrlForInterview(applicationId)
          : "/applications",
        sourceEventId: eventId,
        actionKey: generateActionKey("INTERVIEW_PREP", interviewId ?? applicationId ?? eventId, dateKey),
      };
    }

    case "FOLLOW_UP_DUE": {
      const applicationId = payload.applicationId ?? null;

      return {
        type: "FOLLOW_UP",
        priority: derivePriority(eventType, payload.followUpDate),
        title: "Follow-up due",
        description: payload.jobTitle
          ? `Your follow-up for ${payload.jobTitle}${payload.company ? ` at ${payload.company}` : ""} is due.`
          : "You have a follow-up that is due.",
        applicationId,
        jobId: payload.jobId ?? null,
        interviewId: null,
        dueAt: payload.followUpDate ?? null,
        expiresAt: deriveExpiresAt(eventType, payload.followUpDate),
        actionUrl: applicationId
          ? actionUrlForApplication(applicationId)
          : "/applications",
        sourceEventId: eventId,
        actionKey: generateActionKey("FOLLOW_UP", applicationId ?? eventId, dateKey),
      };
    }

    case "APPLICATION_DEADLINE_APPROACHING": {
      const applicationId = payload.applicationId ?? null;

      return {
        type: "APPLICATION_DEADLINE",
        priority: derivePriority(eventType, payload.deadline),
        title: "Application deadline approaching",
        description: payload.jobTitle
          ? `The application deadline for ${payload.jobTitle}${payload.company ? ` at ${payload.company}` : ""} is approaching.`
          : "An application deadline is approaching.",
        applicationId,
        jobId: payload.jobId ?? null,
        interviewId: null,
        dueAt: payload.deadline ?? null,
        expiresAt: deriveExpiresAt(eventType, payload.deadline),
        actionUrl: applicationId
          ? actionUrlForApplication(applicationId)
          : payload.jobId
            ? actionUrlForJob(payload.jobId)
            : "/applications",
        sourceEventId: eventId,
        actionKey: generateActionKey("APPLICATION_DEADLINE", applicationId ?? payload.jobId ?? eventId, dateKey),
      };
    }

    case "APPLICATION_DEADLINE_EXPIRED": {
      const applicationId = payload.applicationId ?? null;

      return {
        type: "APPLICATION_UPDATE",
        priority: "MEDIUM",
        title: "Application deadline expired",
        description: payload.jobTitle
          ? `The deadline for ${payload.jobTitle}${payload.company ? ` at ${payload.company}` : ""} has passed.`
          : "An application deadline has passed.",
        applicationId,
        jobId: payload.jobId ?? null,
        interviewId: null,
        dueAt: null,
        expiresAt: null,
        actionUrl: applicationId
          ? actionUrlForApplication(applicationId)
          : "/applications",
        sourceEventId: eventId,
        actionKey: generateActionKey("APPLICATION_UPDATE", applicationId ?? eventId, `expired_${dateKey}`),
      };
    }

    case "OFFER_RECEIVED": {
      const applicationId = payload.applicationId ?? null;

      return {
        type: "REVIEW_OFFER",
        priority: derivePriority(eventType),
        title: "Review your offer",
        description: payload.jobTitle
          ? `You received an offer for ${payload.jobTitle}${payload.company ? ` at ${payload.company}` : ""}.`
          : "You received a job offer. Review the details.",
        applicationId,
        jobId: payload.jobId ?? null,
        interviewId: null,
        dueAt: null,
        expiresAt: null,
        actionUrl: applicationId
          ? actionUrlForApplication(applicationId)
          : "/applications",
        sourceEventId: eventId,
        actionKey: generateActionKey("REVIEW_OFFER", applicationId ?? eventId, dateKey),
      };
    }

    case "APPLICATION_STATUS_CHANGED": {
      const applicationId = payload.applicationId ?? null;
      const newStatus = payload.newStatus;

      // Only create actions for actionable status changes
      if (newStatus === "screening") {
        return {
          type: "APPLICATION_UPDATE",
          priority: "MEDIUM",
          title: "Application in screening",
          description: payload.jobTitle
            ? `Your application for ${payload.jobTitle} has moved to screening.`
            : "Your application has moved to screening.",
          applicationId,
          jobId: payload.jobId ?? null,
          interviewId: null,
          dueAt: null,
          expiresAt: null,
          actionUrl: applicationId
            ? actionUrlForApplication(applicationId)
            : "/applications",
          sourceEventId: eventId,
          actionKey: generateActionKey("APPLICATION_UPDATE", applicationId ?? eventId, `screening_${dateKey}`),
        };
      }

      if (newStatus === "assessment") {
        return {
          type: "ASSESSMENT",
          priority: "HIGH",
          title: "Complete assessment",
          description: payload.jobTitle
            ? `You have an assessment for ${payload.jobTitle}${payload.company ? ` at ${payload.company}` : ""}.`
            : "You have an assessment to complete.",
          applicationId,
          jobId: payload.jobId ?? null,
          interviewId: null,
          dueAt: null,
          expiresAt: null,
          actionUrl: applicationId
            ? actionUrlForApplication(applicationId)
            : "/applications",
          sourceEventId: eventId,
          actionKey: generateActionKey("ASSESSMENT", applicationId ?? eventId, dateKey),
        };
      }

      if (newStatus === "rejected") {
        return {
          type: "APPLICATION_UPDATE",
          priority: "LOW",
          title: "Application rejected",
          description: payload.jobTitle
            ? `Your application for ${payload.jobTitle} was not successful.`
            : "An application was not successful.",
          applicationId,
          jobId: payload.jobId ?? null,
          interviewId: null,
          dueAt: null,
          expiresAt: null,
          actionUrl: applicationId
            ? actionUrlForApplication(applicationId)
            : "/applications",
          sourceEventId: eventId,
          actionKey: generateActionKey("APPLICATION_UPDATE", applicationId ?? eventId, `rejected_${dateKey}`),
        };
      }

      // For other status changes, no action needed
      return null;
    }

    default:
      return null;
  }
}
