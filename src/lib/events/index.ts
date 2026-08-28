// ============================================================================
// CareerPilot AI — Events Barrel Export
// ============================================================================

export {
  publishDomainEvent,
  emitInProcessEvent,
  onDomainEvent,
  EventPublishError,
} from "./publisher";

export type { EventContext } from "./publisher";

export {
  decodePubSubMessage,
  processEvent,
  isEventProcessed,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  registerEventHandler,
  registerDefaultHandlers,
} from "./processor";

export type { EventHandler } from "./processor";

export {
  DOMAIN_EVENT_TYPES,
  isValidDomainEventType,
  PUBSUB_TOPIC,
  SCHEDULER_CRON,
  SCHEDULER_TIMEZONE,
  EVENT_VERSION,
} from "./event-types";

export {
  DomainEventEnvelopeSchema,
  DomainEventPayloadSchema,
  PubSubPushBodySchema,
  EventProcessingStatusSchema,
} from "./schemas";

export type {
  DomainEventEnvelopeInput,
  DomainEventPayloadInput,
  PubSubPushBody,
} from "./schemas";
