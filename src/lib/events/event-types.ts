// ============================================================================
// CareerPilot AI — Domain Event Type Constants
// ============================================================================
//
// Centralized event names — never scatter string literals through the codebase.
// ============================================================================

import type { DomainEventType } from "@/types";

/**
 * All supported domain event types as a constant array.
 * Use this for iteration, validation, and documentation.
 */
export const DOMAIN_EVENT_TYPES: readonly DomainEventType[] = [
  "APPLICATION_CREATED",
  "APPLICATION_SUBMITTED",
  "APPLICATION_STATUS_CHANGED",
  "APPLICATION_DEADLINE_APPROACHING",
  "APPLICATION_DEADLINE_EXPIRED",
  "FOLLOW_UP_DUE",
  "OFFER_RECEIVED",
  "APPLICATION_REJECTED",
  "APPLICATION_WITHDRAWN",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_REMINDER",
  "INTERVIEW_COMPLETED",
  "RESUME_PROCESSED",
  "RESUME_PROCESSING_FAILED",
] as const;

/** Type guard for valid event types */
export function isValidDomainEventType(
  value: string,
): value is DomainEventType {
  return (DOMAIN_EVENT_TYPES as readonly string[]).includes(value);
}

/** Pub/Sub topic name */
export const PUBSUB_TOPIC = "careerpilot-events";

/** Scheduler cron expression — runs daily at 09:00 IST */
export const SCHEDULER_CRON = "0 9 * * *";

/** Scheduler timezone */
export const SCHEDULER_TIMEZONE = "Asia/Kolkata";

/** Current event schema version */
export const EVENT_VERSION = 1;
