// ============================================================================
// CareerPilot AI — Domain Event Publisher
// ============================================================================
//
// Publishes validated domain events to Google Cloud Pub/Sub.
// Every event is validated, given a server-generated ID and timestamp,
// then serialized and published.
//
// Security:
//   - userId MUST come from verified auth context or server context
//   - eventId is always server-generated
//   - occurredAt is always server-generated
//   - No client-supplied values are trusted for envelope metadata
// ============================================================================

import { PubSub } from "@google-cloud/pubsub";
import { randomUUID } from "crypto";
import { DomainEventEnvelopeSchema } from "./schemas";
import { EVENT_VERSION, PUBSUB_TOPIC } from "./event-types";
import type {
  DomainEventEnvelope,
  DomainEventType,
  EventAggregateType,
  DomainEventPayload,
} from "@/types";

// ---------------------------------------------------------------------------
// Pub/Sub singleton
// ---------------------------------------------------------------------------

let _pubsub: PubSub | null = null;

function getPubSub(): PubSub {
  if (!_pubsub) {
    _pubsub = new PubSub();
  }
  return _pubsub;
}

// ---------------------------------------------------------------------------
// Server-side event context (derived from verified auth or trusted server code)
// ---------------------------------------------------------------------------

export interface EventContext {
  /** Verified user UID — from Identity Platform token or trusted server logic */
  userId: string;
}

// ---------------------------------------------------------------------------
// Publish a domain event
// ---------------------------------------------------------------------------

/**
 * Builds, validates, and publishes a domain event to Pub/Sub.
 *
 * @param ctx       - Trusted server context with verified userId
 * @param eventType - The domain event type
 * @param aggregate - The aggregate type and ID
 * @param payload   - Event-specific payload (only safe structured data)
 * @returns The eventId for reference
 *
 * @throws Error if validation fails or Pub/Sub publish fails
 */
export async function publishDomainEvent(
  ctx: EventContext,
  eventType: DomainEventType,
  aggregate: { type: EventAggregateType; id: string },
  payload: DomainEventPayload,
): Promise<string> {
  const now = new Date().toISOString();
  const eventId = `evt_${randomUUID()}`;

  const envelope: DomainEventEnvelope = {
    eventId,
    eventType,
    eventVersion: EVENT_VERSION,
    occurredAt: now,
    userId: ctx.userId,
    aggregateType: aggregate.type,
    aggregateId: aggregate.id,
    payload,
  };

  // Validate before publishing — never send malformed events
  const validated = DomainEventEnvelopeSchema.parse(envelope) as DomainEventEnvelope;

  // Serialize to base64 JSON for Pub/Sub
  const data = Buffer.from(JSON.stringify(validated)).toString("base64");

  try {
    const pubsub = getPubSub();
    const topic = pubsub.topic(PUBSUB_TOPIC);
    const messageId = await topic.publishMessage({
      data,
      attributes: {
        eventType: validated.eventType,
        userId: validated.userId,
        aggregateType: validated.aggregateType,
      },
    });

    console.log(
      `[EventPublisher] Published ${eventType} (id=${eventId}, msgId=${messageId})`,
    );

    return eventId;
  } catch (error) {
    console.error(
      `[EventPublisher] Failed to publish ${eventType}:`,
      error,
    );
    throw new EventPublishError(
      `Failed to publish event: ${eventType}`,
      eventType,
      error instanceof Error ? error : undefined,
    );
  }
}

// ---------------------------------------------------------------------------
// In-process event bus (for local development without Pub/Sub)
// ---------------------------------------------------------------------------

type EventListener = (event: DomainEventEnvelope) => void | Promise<void>;

const _listeners: EventListener[] = [];

/**
 * Register an in-process event listener.
 * Used for local development and testing when Pub/Sub is unavailable.
 */
export function onDomainEvent(listener: EventListener): () => void {
  _listeners.push(listener);
  return () => {
    const idx = _listeners.indexOf(listener);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

/**
 * Emit an event to in-process listeners.
 * Used for local development and testing.
 */
export async function emitInProcessEvent(
  ctx: EventContext,
  eventType: DomainEventType,
  aggregate: { type: EventAggregateType; id: string },
  payload: DomainEventPayload,
): Promise<string> {
  const now = new Date().toISOString();
  const eventId = `evt_${randomUUID()}`;

  const envelope: DomainEventEnvelope = {
    eventId,
    eventType,
    eventVersion: EVENT_VERSION,
    occurredAt: now,
    userId: ctx.userId,
    aggregateType: aggregate.type,
    aggregateId: aggregate.id,
    payload,
  };

  const validated = DomainEventEnvelopeSchema.parse(envelope) as DomainEventEnvelope;

  // Notify all registered listeners
  for (const listener of _listeners) {
    try {
      await listener(validated);
    } catch (error) {
      console.error(
        `[EventBus] Listener error for ${eventType}:`,
        error,
      );
    }
  }

  return eventId;
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class EventPublishError extends Error {
  constructor(
    message: string,
    public eventType: DomainEventType,
    public cause?: Error,
  ) {
    super(message);
    this.name = "EventPublishError";
  }
}
