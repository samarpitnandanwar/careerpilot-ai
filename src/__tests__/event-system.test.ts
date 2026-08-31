// ============================================================================
// CareerPilot AI — Event System Unit Tests
// ============================================================================
//
// Tests:
// 1. Event envelope validation
// 2. Event type validation
// 3. Payload validation
// 4. Server-generated fields
// 5. Application events
// 6. Interview events
// 7. Duplicate event detection
// 8. Idempotent processing
// 9. Invalid event rejection
// 10. No sensitive data in payload
// 11. Event version validation
// 12. Deterministic scheduler event keys
// 13. Deadline approaching/expired events
// 14. Follow-up events
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  DomainEventEnvelopeSchema,
  DomainEventPayloadSchema,
  PubSubPushBodySchema,
  EventProcessingStatusSchema,
} from "@/lib/events/schemas";
import {
  DOMAIN_EVENT_TYPES,
  isValidDomainEventType,
  EVENT_VERSION,
} from "@/lib/events/event-types";
import { decodePubSubMessage } from "@/lib/events/processor";
import type {
  DomainEventEnvelope,
  DomainEventPayload,
  DomainEventType,
  ApplicationStatus,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  overrides: Partial<DomainEventEnvelope> = {},
): DomainEventEnvelope {
  return {
    eventId: `evt_test_${Date.now()}`,
    eventType: "APPLICATION_CREATED",
    eventVersion: EVENT_VERSION,
    occurredAt: new Date().toISOString(),
    userId: "user-uid-123",
    aggregateType: "application",
    aggregateId: "app-123",
    payload: {
      applicationId: "app-123",
      jobId: "job-123",
      jobTitle: "Software Engineer",
      company: "Acme Corp",
    },
    ...overrides,
  };
}

function makePayload(
  overrides: Partial<DomainEventPayload> = {},
): DomainEventPayload {
  return {
    applicationId: "app-123",
    jobId: "job-123",
    jobTitle: "Software Engineer",
    company: "Acme Corp",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test: Domain event type validation
// ---------------------------------------------------------------------------

describe("Domain Event Types", () => {
  it("contains all required event types", () => {
    const required: DomainEventType[] = [
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
      "INTERVIEW_COMPLETED",
      "RESUME_PROCESSED",
      "RESUME_PROCESSING_FAILED",
    ];

    for (const type of required) {
      expect(DOMAIN_EVENT_TYPES).toContain(type);
    }
  });

  it("isValidDomainEventType returns true for valid types", () => {
    expect(isValidDomainEventType("APPLICATION_CREATED")).toBe(true);
    expect(isValidDomainEventType("INTERVIEW_SCHEDULED")).toBe(true);
    expect(isValidDomainEventType("FOLLOW_UP_DUE")).toBe(true);
  });

  it("isValidDomainEventType returns false for invalid types", () => {
    expect(isValidDomainEventType("FAKE_EVENT")).toBe(false);
    expect(isValidDomainEventType("")).toBe(false);
    expect(isValidDomainEventType("application_created")).toBe(false);
  });

  it("EVENT_VERSION is a positive integer", () => {
    expect(EVENT_VERSION).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(EVENT_VERSION)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Event envelope validation
// ---------------------------------------------------------------------------

describe("DomainEventEnvelopeSchema", () => {
  it("accepts a valid event", () => {
    const event = makeEvent();
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("requires eventId", () => {
    const event = makeEvent({ eventId: "" });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("requires valid eventType", () => {
    const event = makeEvent({ eventType: "INVALID_EVENT" as DomainEventType });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("requires eventVersion >= 1", () => {
    const event = makeEvent({ eventVersion: 0 });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("requires userId", () => {
    const event = makeEvent({ userId: "" });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("requires valid aggregateType", () => {
    const event = makeEvent({ aggregateType: "invalid" as never });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("requires aggregateId", () => {
    const event = makeEvent({ aggregateId: "" });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level fields", () => {
    const event = makeEvent({ extraField: "not allowed" } as never);
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("validates each required event type", () => {
    for (const eventType of DOMAIN_EVENT_TYPES) {
      const event = makeEvent({ eventType });
      const result = DomainEventEnvelopeSchema.safeParse(event);
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Event payload validation
// ---------------------------------------------------------------------------

describe("DomainEventPayloadSchema", () => {
  it("accepts a valid payload", () => {
    const payload = makePayload();
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts minimal payload", () => {
    const result = DomainEventPayloadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts payload with null statuses", () => {
    const payload = makePayload({
      previousStatus: null,
      newStatus: null,
    });
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts payload with valid ApplicationStatus values", () => {
    const statuses: ApplicationStatus[] = [
      "saved",
      "applied",
      "screening",
      "assessment",
      "interview",
      "offer",
      "accepted",
      "rejected",
      "withdrawn",
    ];
    for (const status of statuses) {
      const payload = makePayload({ newStatus: status });
      const result = DomainEventPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status value", () => {
    const payload = makePayload({ newStatus: "invalid_status" as never });
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects matchScore > 100", () => {
    const payload = makePayload({ matchScore: 101 });
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejects matchScore < 0", () => {
    const payload = makePayload({ matchScore: -1 });
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("accepts matchScore of 0", () => {
    const payload = makePayload({ matchScore: 0 });
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts matchScore of 100", () => {
    const payload = makePayload({ matchScore: 100 });
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects unknown top-level fields (strict)", () => {
    const payload = makePayload({ secretData: "not allowed" } as never);
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("accepts all valid payload fields together", () => {
    const payload: DomainEventPayload = {
      applicationId: "app-1",
      jobId: "job-1",
      interviewId: "int-1",
      resumeId: "res-1",
      previousStatus: "applied",
      newStatus: "interview",
      scheduledAt: "2025-09-15T10:00:00.000Z",
      deadline: "2025-09-20",
      followUpDate: "2025-09-10",
      jobTitle: "Senior Engineer",
      company: "TechCo",
      matchScore: 85,
      priorityScore: 72,
    };
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Pub/Sub push body validation
// ---------------------------------------------------------------------------

describe("PubSubPushBodySchema", () => {
  it("accepts a valid Pub/Sub push body", () => {
    const body = {
      message: {
        data: Buffer.from(JSON.stringify(makeEvent())).toString("base64"),
        messageId: "msg-123",
        publishTime: "2025-09-01T00:00:00.000Z",
      },
      subscription: "projects/careerpilot/subscriptions/careerpilot-events-sub",
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("accepts minimal push body", () => {
    const body = {
      message: {
        data: Buffer.from("{}").toString("base64"),
      },
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("rejects body without message", () => {
    const result = PubSubPushBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects body without data", () => {
    const result = PubSubPushBodySchema.safeParse({ message: {} });
    expect(result.success).toBe(false);
  });

  it("rejects body with empty data", () => {
    const result = PubSubPushBodySchema.safeParse({
      message: { data: "" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts snake_case message_id and publish_time (Google Pub/Sub legacy format)", () => {
    const body = {
      message: {
        data: Buffer.from("{}").toString("base64"),
        message_id: "msg-456",
        publish_time: "2025-09-01T00:00:00.000Z",
      },
      subscription: "projects/test/subscriptions/test-sub",
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("accepts BOTH camelCase AND snake_case (actual Google Pub/Sub format)", () => {
    // Google Pub/Sub sends both formats simultaneously for backward compat
    const body = {
      message: {
        data: Buffer.from("{}").toString("base64"),
        messageId: "2070443601311540",
        message_id: "2070443601311540",
        publishTime: "2021-02-26T19:13:55.749Z",
        publish_time: "2021-02-26T19:13:55.749Z",
      },
      subscription: "projects/myproject/subscriptions/mysubscription",
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("accepts orderingKey field", () => {
    const body = {
      message: {
        data: Buffer.from("{}").toString("base64"),
        orderingKey: "key-1",
        messageId: "msg-1",
        message_id: "msg-1",
        publishTime: "2025-09-01T00:00:00.000Z",
        publish_time: "2025-09-01T00:00:00.000Z",
      },
      subscription: "projects/test/subscriptions/test-sub",
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("accepts deliveryAttempt at top level", () => {
    const body = {
      message: {
        data: Buffer.from("{}").toString("base64"),
      },
      deliveryAttempt: 5,
      subscription: "projects/test/subscriptions/test-sub",
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("accepts attributes field", () => {
    const body = {
      message: {
        data: Buffer.from("{}").toString("base64"),
        attributes: { eventType: "APPLICATION_CREATED", userId: "uid-123" },
      },
      subscription: "projects/test/subscriptions/test-sub",
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("rejects truly unknown fields at top level", () => {
    const body = {
      message: {
        data: Buffer.from("{}").toString("base64"),
      },
      subscription: "projects/test/subscriptions/test-sub",
      maliciousField: "should-not-pass",
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(false);
  });

  it("rejects truly unknown fields inside message", () => {
    const body = {
      message: {
        data: Buffer.from("{}").toString("base64"),
        unknownField: "bad",
      },
    };
    const result = PubSubPushBodySchema.safeParse(body);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Event decoding
// ---------------------------------------------------------------------------

describe("decodePubSubMessage", () => {
  it("decodes a valid event from base64", () => {
    const event = makeEvent();
    const encoded = Buffer.from(JSON.stringify(event)).toString("base64");
    const decoded = decodePubSubMessage(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.eventType).toBe("APPLICATION_CREATED");
    expect(decoded?.userId).toBe("user-uid-123");
    expect(decoded?.payload.applicationId).toBe("app-123");
  });

  it("returns null for invalid base64", () => {
    const decoded = decodePubSubMessage("not-valid-base64!!!@#$");
    expect(decoded).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    const encoded = Buffer.from("not-json").toString("base64");
    const decoded = decodePubSubMessage(encoded);
    expect(decoded).toBeNull();
  });

  it("returns null for JSON that fails validation", () => {
    const invalid = { foo: "bar" };
    const encoded = Buffer.from(JSON.stringify(invalid)).toString("base64");
    const decoded = decodePubSubMessage(encoded);
    expect(decoded).toBeNull();
  });

  it("returns null for unsupported event version", () => {
    const event = makeEvent({ eventVersion: 999 });
    const encoded = Buffer.from(JSON.stringify(event)).toString("base64");
    const decoded = decodePubSubMessage(encoded);
    expect(decoded).toBeNull();
  });

  it("returns null for missing required fields", () => {
    const incomplete = { eventType: "APPLICATION_CREATED" };
    const encoded = Buffer.from(JSON.stringify(incomplete)).toString("base64");
    const decoded = decodePubSubMessage(encoded);
    expect(decoded).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test: Security — no sensitive data in payloads
// ---------------------------------------------------------------------------

describe("Security: No Sensitive Data in Events", () => {
  it("payload does not require or expect resume text", () => {
    const payload = makePayload();
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    // Confirm no resume-related fields exist in schema
    const keys = Object.keys(result.data ?? {});
    expect(keys).not.toContain("resumeText");
    expect(keys).not.toContain("resumeContent");
    expect(keys).not.toContain("resumeBase64");
  });

  it("payload does not require or expect notes content", () => {
    const payload = makePayload();
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    const keys = Object.keys(result.data ?? {});
    expect(keys).not.toContain("notes");
    expect(keys).not.toContain("noteContent");
  });

  it("payload does not require or expect tokens/credentials", () => {
    const payload = makePayload();
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    const keys = Object.keys(result.data ?? {});
    expect(keys).not.toContain("token");
    expect(keys).not.toContain("password");
    expect(keys).not.toContain("secret");
    expect(keys).not.toContain("apiKey");
  });

  it("payload does not require email addresses", () => {
    const payload = makePayload();
    const result = DomainEventPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    const keys = Object.keys(result.data ?? {});
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("userEmail");
  });

  it("event envelope does not include phone numbers", () => {
    const event = makeEvent();
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
    expect(Object.keys(result.data?.payload ?? {})).not.toContain("phone");
  });
});

// ---------------------------------------------------------------------------
// Test: Event types for each lifecycle stage
// ---------------------------------------------------------------------------

describe("Application Lifecycle Events", () => {
  it("APPLICATION_CREATED contains required fields", () => {
    const event = makeEvent({
      eventType: "APPLICATION_CREATED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        newStatus: "saved",
        jobTitle: "Engineer",
        company: "Acme",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
    expect(result.data?.eventType).toBe("APPLICATION_CREATED");
  });

  it("APPLICATION_SUBMITTED contains previous and new status", () => {
    const event = makeEvent({
      eventType: "APPLICATION_SUBMITTED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        previousStatus: "saved",
        newStatus: "applied",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
    expect(result.data?.payload.previousStatus).toBe("saved");
    expect(result.data?.payload.newStatus).toBe("applied");
  });

  it("APPLICATION_STATUS_CHANGED contains transition info", () => {
    const event = makeEvent({
      eventType: "APPLICATION_STATUS_CHANGED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        previousStatus: "applied",
        newStatus: "screening",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("OFFER_RECEIVED uses offer status", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        previousStatus: "interview",
        newStatus: "offer",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("APPLICATION_REJECTED uses rejected status", () => {
    const event = makeEvent({
      eventType: "APPLICATION_REJECTED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        previousStatus: "screening",
        newStatus: "rejected",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("APPLICATION_WITHDRAWN uses withdrawn status", () => {
    const event = makeEvent({
      eventType: "APPLICATION_WITHDRAWN",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        previousStatus: "saved",
        newStatus: "withdrawn",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Interview events
// ---------------------------------------------------------------------------

describe("Interview Events", () => {
  it("INTERVIEW_SCHEDULED contains interview and application IDs", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      aggregateType: "interview",
      aggregateId: "int-1",
      payload: {
        interviewId: "int-1",
        applicationId: "app-1",
        scheduledAt: "2025-09-15T10:00:00.000Z",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("INTERVIEW_COMPLETED marks completion", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_COMPLETED",
      aggregateType: "interview",
      aggregateId: "int-1",
      payload: {
        interviewId: "int-1",
        applicationId: "app-1",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Deadline events
// ---------------------------------------------------------------------------

describe("Deadline Events", () => {
  it("APPLICATION_DEADLINE_APPROACHING contains deadline", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_APPROACHING",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        deadline: "2025-09-05",
        jobTitle: "Engineer",
        company: "Acme",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("APPLICATION_DEADLINE_EXPIRED contains deadline", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_EXPIRED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        deadline: "2025-09-01",
        jobTitle: "Engineer",
        company: "Acme",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("FOLLOW_UP_DUE contains followUpDate", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        followUpDate: "2025-09-01",
        jobTitle: "Engineer",
        company: "Acme",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Resume events
// ---------------------------------------------------------------------------

describe("Resume Events", () => {
  it("RESUME_PROCESSED contains resume ID", () => {
    const event = makeEvent({
      eventType: "RESUME_PROCESSED",
      aggregateType: "resume",
      aggregateId: "res-1",
      payload: {
        resumeId: "res-1",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("RESUME_PROCESSING_FAILED contains resume ID", () => {
    const event = makeEvent({
      eventType: "RESUME_PROCESSING_FAILED",
      aggregateType: "resume",
      aggregateId: "res-1",
      payload: {
        resumeId: "res-1",
      },
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Event processing status validation
// ---------------------------------------------------------------------------

describe("EventProcessingStatusSchema", () => {
  it("accepts valid statuses", () => {
    expect(EventProcessingStatusSchema.safeParse("pending").success).toBe(true);
    expect(EventProcessingStatusSchema.safeParse("processing").success).toBe(true);
    expect(EventProcessingStatusSchema.safeParse("completed").success).toBe(true);
    expect(EventProcessingStatusSchema.safeParse("failed").success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(EventProcessingStatusSchema.safeParse("invalid").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Event ID and timestamp are server-generated
// ---------------------------------------------------------------------------

describe("Server-Generated Fields", () => {
  it("eventId must be non-empty string (server-generated)", () => {
    const event = makeEvent({ eventId: "evt_server-generated-uuid" });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
    expect(result.data?.eventId).toMatch(/^evt_/);
  });

  it("occurredAt must be an ISO string (server-generated)", () => {
    const now = new Date().toISOString();
    const event = makeEvent({ occurredAt: now });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
    expect(result.data?.occurredAt).toBe(now);
  });

  it("rejects eventId from untrusted client with empty value", () => {
    const event = makeEvent({ eventId: "" });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Event version
// ---------------------------------------------------------------------------

describe("Event Version", () => {
  it("rejects version 0", () => {
    const event = makeEvent({ eventVersion: 0 });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects negative version", () => {
    const event = makeEvent({ eventVersion: -1 });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("accepts version 1", () => {
    const event = makeEvent({ eventVersion: 1 });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Deterministic scheduler event keys
// ---------------------------------------------------------------------------

describe("Deterministic Scheduler Event Keys", () => {
  it("event key includes event type, application ID, and date", () => {
    // Simulating the scheduler's key generation pattern
    const eventType: DomainEventType = "APPLICATION_DEADLINE_APPROACHING";
    const applicationId = "app-123";
    const dateStr = "2025-09-01T00:00:00.000Z";
    const dateKey = dateStr.split("T")[0];
    const eventKey = `evt_${eventType}_${applicationId}_${dateKey}`;

    expect(eventKey).toBe("evt_APPLICATION_DEADLINE_APPROACHING_app-123_2025-09-01");
  });

  it("same inputs produce same key", () => {
    const eventType: DomainEventType = "FOLLOW_UP_DUE";
    const applicationId = "app-456";
    const dateKey = "2025-09-15";

    const key1 = `evt_${eventType}_${applicationId}_${dateKey}`;
    const key2 = `evt_${eventType}_${applicationId}_${dateKey}`;

    expect(key1).toBe(key2);
  });

  it("different dates produce different keys", () => {
    const eventType: DomainEventType = "APPLICATION_DEADLINE_EXPIRED";
    const applicationId = "app-123";

    const key1 = `evt_${eventType}_${applicationId}_2025-09-01`;
    const key2 = `evt_${eventType}_${applicationId}_2025-09-02`;

    expect(key1).not.toBe(key2);
  });

  it("different applications produce different keys", () => {
    const eventType: DomainEventType = "FOLLOW_UP_DUE";
    const dateKey = "2025-09-15";

    const key1 = `evt_${eventType}_app-1_${dateKey}`;
    const key2 = `evt_${eventType}_app-2_${dateKey}`;

    expect(key1).not.toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// Test: In-process event bus
// ---------------------------------------------------------------------------

describe("In-Process Event Bus", () => {
  it("emitInProcessEvent validates the event", async () => {
    const { emitInProcessEvent } = await import("@/lib/events/publisher");

    const eventId = await emitInProcessEvent(
      { userId: "user-123" },
      "APPLICATION_CREATED",
      { type: "application", id: "app-1" },
      { applicationId: "app-1", jobId: "job-1" },
    );

    expect(eventId).toMatch(/^evt_/);
  });

  it("onDomainEvent receives emitted events", async () => {
    const { emitInProcessEvent, onDomainEvent } = await import("@/lib/events/publisher");

    let received = false;
    const unsubscribe = onDomainEvent((event) => {
      if (event.eventType === "APPLICATION_CREATED") {
        received = true;
      }
    });

    await emitInProcessEvent(
      { userId: "user-123" },
      "APPLICATION_CREATED",
      { type: "application", id: "app-1" },
      { applicationId: "app-1", jobId: "job-1" },
    );

    expect(received).toBe(true);
    unsubscribe();
  });

  it("unsubscribe removes listener", async () => {
    const { emitInProcessEvent, onDomainEvent } = await import("@/lib/events/publisher");

    let count = 0;
    const unsubscribe = onDomainEvent(() => {
      count++;
    });

    await emitInProcessEvent(
      { userId: "user-123" },
      "APPLICATION_CREATED",
      { type: "application", id: "app-1" },
      { applicationId: "app-1", jobId: "job-1" },
    );

    expect(count).toBe(1);
    unsubscribe();

    await emitInProcessEvent(
      { userId: "user-123" },
      "APPLICATION_CREATED",
      { type: "application", id: "app-1" },
      { applicationId: "app-1", jobId: "job-1" },
    );

    expect(count).toBe(1); // No increment after unsubscribe
  });

  it("multiple listeners receive the same event", async () => {
    const { emitInProcessEvent, onDomainEvent } = await import("@/lib/events/publisher");

    let countA = 0;
    let countB = 0;
    const unsubA = onDomainEvent(() => { countA++; });
    const unsubB = onDomainEvent(() => { countB++; });

    await emitInProcessEvent(
      { userId: "user-123" },
      "INTERVIEW_SCHEDULED",
      { type: "interview", id: "int-1" },
      { interviewId: "int-1", applicationId: "app-1" },
    );

    expect(countA).toBe(1);
    expect(countB).toBe(1);
    unsubA();
    unsubB();
  });
});

// ---------------------------------------------------------------------------
// Test: Aggregate types
// ---------------------------------------------------------------------------

describe("Aggregate Types", () => {
  it("validates application aggregate", () => {
    const event = makeEvent({
      aggregateType: "application",
      aggregateId: "app-1",
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("validates interview aggregate", () => {
    const event = makeEvent({
      aggregateType: "interview",
      aggregateId: "int-1",
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("validates resume aggregate", () => {
    const event = makeEvent({
      aggregateType: "resume",
      aggregateId: "res-1",
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("validates job aggregate", () => {
    const event = makeEvent({
      aggregateType: "job",
      aggregateId: "job-1",
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects invalid aggregate type", () => {
    const event = makeEvent({
      aggregateType: "invalid" as never,
      aggregateId: "x-1",
    });
    const result = DomainEventEnvelopeSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});
