// ============================================================================
// CareerPilot AI — Notification Generator
// ============================================================================
//
// Deterministic mapping from domain events to user-facing notifications.
// Each event type produces at most one notification.
// Use notificationKey for idempotency — repeated processing creates no duplicates.
// ============================================================================

import type { DomainEventEnvelope, DomainEventType } from "@/types";
import type {
  NotificationType,
  NotificationPriority,
} from "./types";

// ---------------------------------------------------------------------------
// Generated notification (before persistence)
// ---------------------------------------------------------------------------

export interface GeneratedNotification {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  applicationId: string | null;
  jobId: string | null;
  interviewId: string | null;
  resumeId: string | null;
  sourceEventId: string | null;
  notificationKey: string;
  expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Deterministic notification key
// ---------------------------------------------------------------------------

export function generateNotificationKey(
  notificationType: NotificationType,
  aggregateId: string,
  dateKey: string,
): string {
  return `notif_${notificationType}_${aggregateId}_${dateKey}`;
}

// ---------------------------------------------------------------------------
// Event → Notification mapping
// ---------------------------------------------------------------------------

/**
 * Generate a notification from a domain event.
 * Returns null for events that should not create notifications.
 */
export function generateNotificationFromEvent(
  event: DomainEventEnvelope,
): GeneratedNotification | null {
  const { eventType } = event;
  const dateKey = new Date().toISOString().split("T")[0];

  switch (eventType) {
    case "INTERVIEW_SCHEDULED":
      return generateInterviewScheduled(event, dateKey);

    case "INTERVIEW_REMINDER":
      return generateInterviewReminder(event, dateKey);

    case "FOLLOW_UP_DUE":
      return generateFollowUpDue(event, dateKey);

    case "APPLICATION_DEADLINE_APPROACHING":
      return generateDeadlineApproaching(event, dateKey);

    case "APPLICATION_DEADLINE_EXPIRED":
      return generateDeadlineExpired(event, dateKey);

    case "OFFER_RECEIVED":
      return generateOfferReceived(event, dateKey);

    case "APPLICATION_REJECTED":
      return generateApplicationRejected(event, dateKey);

    case "APPLICATION_STATUS_CHANGED":
      return generateStatusChanged(event, dateKey);

    case "RESUME_PROCESSED":
      return generateResumeProcessed(event, dateKey);

    case "RESUME_PROCESSING_FAILED":
      return generateResumeFailed(event, dateKey);

    // These events should NOT create notifications
    case "APPLICATION_CREATED":
    case "APPLICATION_SUBMITTED":
    case "APPLICATION_WITHDRAWN":
    case "INTERVIEW_COMPLETED":
      return null;

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Individual generators
// ---------------------------------------------------------------------------

function generateInterviewScheduled(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  const { payload } = event;
  const jobTitle = payload.jobTitle ?? "a position";
  const company = payload.company ?? "";
  const companySuffix = company ? ` at ${company}` : "";

  return {
    type: "INTERVIEW_SCHEDULED",
    priority: "HIGH",
    title: "Interview scheduled",
    message: `Your interview for ${jobTitle}${companySuffix} has been scheduled`,
    applicationId: payload.applicationId ?? null,
    jobId: payload.jobId ?? null,
    interviewId: payload.interviewId ?? null,
    resumeId: null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "INTERVIEW_SCHEDULED",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null, // Historical — don't expire
  };
}

function generateInterviewReminder(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  const { payload } = event;
  const jobTitle = payload.jobTitle ?? "a position";
  const company = payload.company ?? "";
  const companySuffix = company ? ` at ${company}` : "";

  // Use scheduledAt in the key for deterministic per-day deduplication
  const scheduledDay = payload.scheduledAt?.split("T")[0] ?? dateKey;

  return {
    type: "INTERVIEW_REMINDER",
    priority: "HIGH",
    title: "Interview reminder",
    message: `Your interview for ${jobTitle}${companySuffix} is coming up`,
    applicationId: payload.applicationId ?? null,
    jobId: payload.jobId ?? null,
    interviewId: payload.interviewId ?? null,
    resumeId: null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "INTERVIEW_REMINDER",
      event.aggregateId,
      scheduledDay,
    ),
    expiresAt: null,
  };
}

function generateFollowUpDue(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  const { payload } = event;
  const jobTitle = payload.jobTitle ?? "a position";
  const company = payload.company ?? "";
  const companySuffix = company ? ` at ${company}` : "";

  return {
    type: "FOLLOW_UP_DUE",
    priority: "HIGH",
    title: "Follow-up due",
    message: `Your follow-up for ${jobTitle}${companySuffix} is due`,
    applicationId: payload.applicationId ?? null,
    jobId: payload.jobId ?? null,
    interviewId: null,
    resumeId: null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "FOLLOW_UP_DUE",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null, // Expired follow-ups still visible
  };
}

function generateDeadlineApproaching(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  const { payload } = event;
  const jobTitle = payload.jobTitle ?? "a position";
  const company = payload.company ?? "";
  const companySuffix = company ? ` at ${company}` : "";

  return {
    type: "APPLICATION_DEADLINE_APPROACHING",
    priority: "HIGH",
    title: "Application deadline approaching",
    message: `The application deadline for ${jobTitle}${companySuffix} is approaching`,
    applicationId: payload.applicationId ?? null,
    jobId: payload.jobId ?? null,
    interviewId: null,
    resumeId: null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "APPLICATION_DEADLINE_APPROACHING",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null,
  };
}

function generateDeadlineExpired(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  const { payload } = event;
  const jobTitle = payload.jobTitle ?? "a position";
  const company = payload.company ?? "";
  const companySuffix = company ? ` at ${company}` : "";

  return {
    type: "APPLICATION_DEADLINE_EXPIRED",
    priority: "MEDIUM",
    title: "Application deadline expired",
    message: `The application deadline for ${jobTitle}${companySuffix} has expired`,
    applicationId: payload.applicationId ?? null,
    jobId: payload.jobId ?? null,
    interviewId: null,
    resumeId: null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "APPLICATION_DEADLINE_EXPIRED",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null,
  };
}

function generateOfferReceived(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  const { payload } = event;
  const jobTitle = payload.jobTitle ?? "a position";
  const company = payload.company ?? "";
  const companySuffix = company ? ` at ${company}` : "";

  return {
    type: "OFFER_RECEIVED",
    priority: "CRITICAL",
    title: "You received an offer!",
    message: `Congratulations! You received an offer for ${jobTitle}${companySuffix}`,
    applicationId: payload.applicationId ?? null,
    jobId: payload.jobId ?? null,
    interviewId: null,
    resumeId: null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "OFFER_RECEIVED",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null, // Never expire offers
  };
}

function generateApplicationRejected(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  const { payload } = event;
  const jobTitle = payload.jobTitle ?? "a position";
  const company = payload.company ?? "";
  const companySuffix = company ? ` at ${company}` : "";

  return {
    type: "APPLICATION_REJECTED",
    priority: "MEDIUM",
    title: "Application update",
    message: `Your application for ${jobTitle}${companySuffix} has been updated`,
    applicationId: payload.applicationId ?? null,
    jobId: payload.jobId ?? null,
    interviewId: null,
    resumeId: null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "APPLICATION_REJECTED",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null,
  };
}

function generateStatusChanged(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  const { payload } = event;
  const jobTitle = payload.jobTitle ?? "a position";
  const company = payload.company ?? "";
  const companySuffix = company ? ` at ${company}` : "";
  const newStatus = payload.newStatus ?? "updated";

  return {
    type: "APPLICATION_STATUS_CHANGED",
    priority: "MEDIUM",
    title: "Application status updated",
    message: `Your application for ${jobTitle}${companySuffix} is now: ${newStatus}`,
    applicationId: payload.applicationId ?? null,
    jobId: payload.jobId ?? null,
    interviewId: null,
    resumeId: null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "APPLICATION_STATUS_CHANGED",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null,
  };
}

function generateResumeProcessed(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  return {
    type: "RESUME_PROCESSED",
    priority: "LOW",
    title: "Resume processing completed",
    message: "Your resume has been successfully processed and is ready to use",
    applicationId: null,
    jobId: null,
    interviewId: null,
    resumeId: event.payload.resumeId ?? null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "RESUME_PROCESSED",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null,
  };
}

function generateResumeFailed(
  event: DomainEventEnvelope,
  dateKey: string,
): GeneratedNotification {
  return {
    type: "RESUME_PROCESSING_FAILED",
    priority: "MEDIUM",
    title: "Resume processing failed",
    message: "There was an issue processing your resume. Please try uploading again.",
    applicationId: null,
    jobId: null,
    interviewId: null,
    resumeId: event.payload.resumeId ?? null,
    sourceEventId: event.eventId,
    notificationKey: generateNotificationKey(
      "RESUME_PROCESSING_FAILED",
      event.aggregateId,
      dateKey,
    ),
    expiresAt: null,
  };
}

// ---------------------------------------------------------------------------
// Helper: check if event type should create notification
// ---------------------------------------------------------------------------

export function isNotifiableEvent(eventType: DomainEventType): boolean {
  return generateNotificationFromEvent({
    eventId: "",
    eventType,
    eventVersion: 1,
    occurredAt: "",
    userId: "",
    aggregateType: "application",
    aggregateId: "",
    payload: {},
  }) !== null;
}
