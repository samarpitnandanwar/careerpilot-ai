// ============================================================================
// CareerPilot AI — Domain Event Processor
// ============================================================================
//
// Server-side event processor that:
// 1. Decodes Pub/Sub push messages
// 2. Validates the domain event envelope with Zod
// 3. Checks idempotency (event already processed?)
// 4. Processes the event
// 5. Marks the event as processed
//
// Does NOT put business logic directly inside the Pub/Sub HTTP handler.
// ============================================================================

import { DomainEventEnvelopeSchema } from "./schemas";
import { EVENT_VERSION } from "./event-types";
import type {
  DomainEventEnvelope,
  DomainEventType,
  FirestoreEventProcessing,
} from "@/types";
import { getDb } from "@/lib/firestore/db";
import { now } from "@/lib/firestore/db";
import { handleFirestoreError } from "@/lib/api-helpers";

// ---------------------------------------------------------------------------
// Event processing record (idempotency)
// ---------------------------------------------------------------------------

function eventProcessingCol(uid: string) {
  return getDb().collection("users").doc(uid).collection("eventProcessing");
}

/**
 * Check whether an event has already been processed (idempotency check).
 */
export async function isEventProcessed(
  userId: string,
  eventId: string,
): Promise<boolean> {
  return handleFirestoreError(async () => {
    const snap = await eventProcessingCol(userId).doc(eventId).get();
    if (!snap.exists) return false;
    const record = snap.data() as FirestoreEventProcessing;
    return record.status === "completed";
  });
}

/**
 * Record that an event is being processed.
 */
export async function markEventProcessing(
  userId: string,
  eventId: string,
  eventType: DomainEventType,
): Promise<void> {
  await eventProcessingCol(userId).doc(eventId).set({
    eventId,
    eventType,
    userId,
    status: "processing",
    errorCode: null,
    errorMessage: null,
    processedAt: null,
    createdAt: now(),
  } satisfies FirestoreEventProcessing);
}

/**
 * Mark an event as completed.
 */
export async function markEventCompleted(
  userId: string,
  eventId: string,
): Promise<void> {
  await eventProcessingCol(userId).doc(eventId).update({
    status: "completed",
    processedAt: now(),
  });
}

/**
 * Mark an event as permanently failed.
 */
export async function markEventFailed(
  userId: string,
  eventId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  await eventProcessingCol(userId).doc(eventId).update({
    status: "failed",
    errorCode,
    errorMessage,
    processedAt: now(),
  });
}

// ---------------------------------------------------------------------------
// Event decoder
// ---------------------------------------------------------------------------

/**
 * Decode a base64-encoded Pub/Sub message data into a DomainEventEnvelope.
 * Returns null if decoding or validation fails.
 */
export function decodePubSubMessage(
  data: string,
): DomainEventEnvelope | null {
  try {
    const json = Buffer.from(data, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    const validated = DomainEventEnvelopeSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("[EventProcessor] Validation failed:", validated.error.message);
      return null;
    }

    // Verify event version
    if (validated.data.eventVersion !== EVENT_VERSION) {
      console.error(
        `[EventProcessor] Unsupported event version: ${validated.data.eventVersion}`,
      );
      return null;
    }

    return validated.data as DomainEventEnvelope;
  } catch (error) {
    console.error("[EventProcessor] Decode failed:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Event handlers (type-safe dispatch)
// ---------------------------------------------------------------------------

export type EventHandler = (
  event: DomainEventEnvelope,
) => Promise<void>;

const _handlers = new Map<DomainEventType, EventHandler>();

/**
 * Register a handler for a specific event type.
 */
export function registerEventHandler(
  eventType: DomainEventType,
  handler: EventHandler,
): void {
  _handlers.set(eventType, handler);
}

/**
 * Process a domain event: idempotent check → dispatch → mark complete.
 * Returns true if processed successfully.
 */
export async function processEvent(
  event: DomainEventEnvelope,
): Promise<boolean> {
  const { eventId, userId, eventType } = event;

  // 1. Idempotency check
  const alreadyProcessed = await isEventProcessed(userId, eventId);
  if (alreadyProcessed) {
    console.log(
      `[EventProcessor] Event ${eventId} already processed, skipping`,
    );
    return true;
  }

  // 2. Mark as processing
  await markEventProcessing(userId, eventId, eventType);

  // 3. Dispatch to handler
  const handler = _handlers.get(eventType);
  if (!handler) {
    // Unknown event type — mark as completed (no-op) to prevent infinite retries
    console.warn(
      `[EventProcessor] No handler for ${eventType}, marking as completed`,
    );
    await markEventCompleted(userId, eventId);
    return true;
  }

  try {
    await handler(event);
    await markEventCompleted(userId, eventId);
    return true;
  } catch (error) {
    const errorCode = error instanceof Error ? error.name : "UNKNOWN_ERROR";
    const errorMessage =
      error instanceof Error ? error.message : "Unknown processing error";

    // Mark as failed — Pub/Sub will not retry
    await markEventFailed(userId, eventId, errorCode, errorMessage);

    console.error(
      `[EventProcessor] Failed to process ${eventType} (${eventId}):`,
      error,
    );

    return false;
  }
}

// ---------------------------------------------------------------------------
// Built-in handlers: Application lifecycle events
// ---------------------------------------------------------------------------

/**
 * Log-only handler for application events.
 * In the future, this will trigger notifications, AI recommendations, etc.
 */
function createApplicationEventHandler(
  eventType: DomainEventType,
): EventHandler {
  return async (event: DomainEventEnvelope) => {
    const { payload } = event;
    console.log(
      `[EventHandler] ${eventType} — app=${payload.applicationId}, ` +
        `job=${payload.jobId}, user=${event.userId.substring(0, 8)}...`,
    );
    // Future: trigger notifications, analytics aggregation, AI suggestions
  };
}

/**
 * Log-only handler for interview events.
 */
function createInterviewEventHandler(
  eventType: DomainEventType,
): EventHandler {
  return async (event: DomainEventEnvelope) => {
    const { payload } = event;
    console.log(
      `[EventHandler] ${eventType} — interview=${payload.interviewId}, ` +
        `app=${payload.applicationId}, user=${event.userId.substring(0, 8)}...`,
    );
    // Future: trigger interview prep suggestions, calendar integration
  };
}

/**
 * Register all built-in event handlers.
 */
export function registerDefaultHandlers(): void {
  // Application lifecycle
  registerEventHandler("APPLICATION_CREATED", createApplicationEventHandler("APPLICATION_CREATED"));
  registerEventHandler("APPLICATION_SUBMITTED", createApplicationEventHandler("APPLICATION_SUBMITTED"));
  registerEventHandler("APPLICATION_STATUS_CHANGED", createApplicationEventHandler("APPLICATION_STATUS_CHANGED"));
  registerEventHandler("OFFER_RECEIVED", createApplicationEventHandler("OFFER_RECEIVED"));
  registerEventHandler("APPLICATION_REJECTED", createApplicationEventHandler("APPLICATION_REJECTED"));
  registerEventHandler("APPLICATION_WITHDRAWN", createApplicationEventHandler("APPLICATION_WITHDRAWN"));
  registerEventHandler("APPLICATION_DEADLINE_APPROACHING", createApplicationEventHandler("APPLICATION_DEADLINE_APPROACHING"));
  registerEventHandler("APPLICATION_DEADLINE_EXPIRED", createApplicationEventHandler("APPLICATION_DEADLINE_EXPIRED"));
  registerEventHandler("FOLLOW_UP_DUE", createApplicationEventHandler("FOLLOW_UP_DUE"));

  // Interview
  registerEventHandler("INTERVIEW_SCHEDULED", createInterviewEventHandler("INTERVIEW_SCHEDULED"));
  registerEventHandler("INTERVIEW_COMPLETED", createInterviewEventHandler("INTERVIEW_COMPLETED"));

  // Resume
  registerEventHandler("RESUME_PROCESSED", createApplicationEventHandler("RESUME_PROCESSED"));
  registerEventHandler("RESUME_PROCESSING_FAILED", createApplicationEventHandler("RESUME_PROCESSING_FAILED"));
}

// Auto-register default handlers on import
registerDefaultHandlers();
