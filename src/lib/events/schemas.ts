// ============================================================================
// CareerPilot AI — Event Zod Schemas
// ============================================================================
//
// Strict Zod validation for all domain events.
// Never blindly trust deserialized Pub/Sub payloads.
// ============================================================================

import { z } from "zod";
import { DOMAIN_EVENT_TYPES } from "./event-types";

// ---------------------------------------------------------------------------
// Domain event payload
// ---------------------------------------------------------------------------

export const DomainEventPayloadSchema = z
  .object({
    applicationId: z.string().optional(),
    jobId: z.string().optional(),
    interviewId: z.string().optional(),
    resumeId: z.string().optional(),
    previousStatus: z
      .enum([
        "saved",
        "applied",
        "screening",
        "assessment",
        "interview",
        "offer",
        "accepted",
        "rejected",
        "withdrawn",
      ])
      .nullish(),
    newStatus: z
      .enum([
        "saved",
        "applied",
        "screening",
        "assessment",
        "interview",
        "offer",
        "accepted",
        "rejected",
        "withdrawn",
      ])
      .nullish(),
    scheduledAt: z.string().nullish(),
    deadline: z.string().nullish(),
    followUpDate: z.string().nullish(),
    jobTitle: z.string().max(300).optional(),
    company: z.string().max(200).optional(),
    matchScore: z.number().min(0).max(100).optional(),
    priorityScore: z.number().min(0).max(100).optional(),
  })
  .strict();

export type DomainEventPayloadInput = z.infer<typeof DomainEventPayloadSchema>;

// ---------------------------------------------------------------------------
// Domain event envelope (full event)
// ---------------------------------------------------------------------------

export const DomainEventEnvelopeSchema = z
  .object({
    eventId: z.string().min(1),
    eventType: z.enum(DOMAIN_EVENT_TYPES as unknown as [string, ...string[]]),
    eventVersion: z.number().int().min(1).max(100),
    occurredAt: z.string(),
    userId: z.string().min(1),
    aggregateType: z.enum(["application", "interview", "resume", "job"]),
    aggregateId: z.string().min(1),
    payload: DomainEventPayloadSchema,
  })
  .strict();

export type DomainEventEnvelopeInput = z.infer<typeof DomainEventEnvelopeSchema>;

// ---------------------------------------------------------------------------
// Pub/Sub push notification body
// ---------------------------------------------------------------------------

/**
 * Pub/Sub push delivery sends this envelope.
 * @see https://cloud.google.com/pubsub/docs/push
 *
 * IMPORTANT: Google Pub/Sub sends BOTH camelCase AND snake_case fields
 * simultaneously for backward compatibility:
 *   - messageId AND message_id
 *   - publishTime AND publish_time
 *
 * The schema must accept all legitimate Google Pub/Sub fields while
 * rejecting genuinely unknown fields via .strict().
 */
export const PubSubPushBodySchema = z
  .object({
    message: z
      .object({
        data: z.string().min(1),
        // camelCase (current Pub/Sub format)
        messageId: z.string().optional(),
        publishTime: z.string().optional(),
        // snake_case (still sent by Google for backward compat)
        message_id: z.string().optional(),
        publish_time: z.string().optional(),
        // optional fields
        attributes: z.record(z.string(), z.string()).optional(),
        orderingKey: z.string().optional(),
      })
      .strict(),
    // deliveryAttempt is present on some push messages
    deliveryAttempt: z.number().int().optional(),
    subscription: z.string().optional(),
  })
  .strict();

export type PubSubPushBody = z.infer<typeof PubSubPushBodySchema>;

// ---------------------------------------------------------------------------
// Event processing record validation
// ---------------------------------------------------------------------------

export const EventProcessingStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
