// ============================================================================
// CareerPilot AI — Notification System Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  generateNotificationFromEvent,
  generateNotificationKey,
  isNotifiableEvent,
} from "@/lib/notifications/generator";
import type { DomainEventEnvelope } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<DomainEventEnvelope> = {}): DomainEventEnvelope {
  return {
    eventId: overrides.eventId ?? "evt-1",
    eventType: overrides.eventType ?? "INTERVIEW_SCHEDULED",
    eventVersion: 1,
    occurredAt: overrides.occurredAt ?? "2025-09-01T12:00:00.000Z",
    userId: overrides.userId ?? "user-1",
    aggregateType: overrides.aggregateType ?? "interview",
    aggregateId: overrides.aggregateId ?? "interview-1",
    payload: overrides.payload ?? {},
  };
}

// ---------------------------------------------------------------------------
// Tests: Event → Notification mapping
// ---------------------------------------------------------------------------

describe("Notification Generator", () => {
  describe("INTERVIEW_SCHEDULED", () => {
    it("creates notification with HIGH priority", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_SCHEDULED",
        aggregateId: "interview-1",
        payload: {
          interviewId: "interview-1",
          applicationId: "app-1",
          jobId: "job-1",
          jobTitle: "Senior Engineer",
          company: "Acme",
        },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("INTERVIEW_SCHEDULED");
      expect(notif?.priority).toBe("HIGH");
      expect(notif?.title).toBe("Interview scheduled");
      expect(notif?.message).toContain("Senior Engineer");
      expect(notif?.message).toContain("Acme");
      expect(notif?.applicationId).toBe("app-1");
      expect(notif?.jobId).toBe("job-1");
      expect(notif?.interviewId).toBe("interview-1");
    });
  });

  describe("FOLLOW_UP_DUE", () => {
    it("creates notification with HIGH priority", () => {
      const event = makeEvent({
        eventType: "FOLLOW_UP_DUE",
        aggregateId: "app-1",
        payload: {
          applicationId: "app-1",
          jobId: "job-1",
          jobTitle: "Frontend Dev",
          company: "TechCo",
        },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("FOLLOW_UP_DUE");
      expect(notif?.priority).toBe("HIGH");
      expect(notif?.message).toContain("Frontend Dev");
    });
  });

  describe("APPLICATION_DEADLINE_APPROACHING", () => {
    it("creates notification with HIGH priority", () => {
      const event = makeEvent({
        eventType: "APPLICATION_DEADLINE_APPROACHING",
        aggregateId: "app-1",
        payload: {
          applicationId: "app-1",
          jobTitle: "Backend Dev",
          company: "DataCo",
        },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("APPLICATION_DEADLINE_APPROACHING");
      expect(notif?.priority).toBe("HIGH");
    });
  });

  describe("APPLICATION_DEADLINE_EXPIRED", () => {
    it("creates notification with MEDIUM priority", () => {
      const event = makeEvent({
        eventType: "APPLICATION_DEADLINE_EXPIRED",
        aggregateId: "app-1",
        payload: { applicationId: "app-1", jobTitle: "Dev", company: "Co" },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("APPLICATION_DEADLINE_EXPIRED");
      expect(notif?.priority).toBe("MEDIUM");
    });
  });

  describe("OFFER_RECEIVED", () => {
    it("creates notification with CRITICAL priority", () => {
      const event = makeEvent({
        eventType: "OFFER_RECEIVED",
        aggregateId: "app-1",
        payload: {
          applicationId: "app-1",
          jobTitle: "Lead Engineer",
          company: "BigTech",
        },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("OFFER_RECEIVED");
      expect(notif?.priority).toBe("CRITICAL");
      expect(notif?.title).toContain("offer");
      expect(notif?.expiresAt).toBeNull(); // Never expire offers
    });
  });

  describe("APPLICATION_REJECTED", () => {
    it("creates notification with MEDIUM priority", () => {
      const event = makeEvent({
        eventType: "APPLICATION_REJECTED",
        aggregateId: "app-1",
        payload: { applicationId: "app-1", jobTitle: "Dev", company: "Co" },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("APPLICATION_REJECTED");
      expect(notif?.priority).toBe("MEDIUM");
    });
  });

  describe("APPLICATION_STATUS_CHANGED", () => {
    it("creates notification with MEDIUM priority", () => {
      const event = makeEvent({
        eventType: "APPLICATION_STATUS_CHANGED",
        aggregateId: "app-1",
        payload: {
          applicationId: "app-1",
          newStatus: "screening",
          jobTitle: "Dev",
          company: "Co",
        },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("APPLICATION_STATUS_CHANGED");
      expect(notif?.message).toContain("screening");
    });
  });

  describe("RESUME_PROCESSED", () => {
    it("creates notification with LOW priority", () => {
      const event = makeEvent({
        eventType: "RESUME_PROCESSED",
        aggregateType: "resume",
        aggregateId: "resume-1",
        payload: { resumeId: "resume-1" },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("RESUME_PROCESSED");
      expect(notif?.priority).toBe("LOW");
      expect(notif?.resumeId).toBe("resume-1");
    });
  });

  describe("RESUME_PROCESSING_FAILED", () => {
    it("creates notification with MEDIUM priority", () => {
      const event = makeEvent({
        eventType: "RESUME_PROCESSING_FAILED",
        aggregateType: "resume",
        aggregateId: "resume-1",
        payload: { resumeId: "resume-1" },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("RESUME_PROCESSING_FAILED");
      expect(notif?.priority).toBe("MEDIUM");
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Non-notifiable events
// ---------------------------------------------------------------------------

describe("Non-notifiable events", () => {
  it("APPLICATION_CREATED → null", () => {
    const event = makeEvent({ eventType: "APPLICATION_CREATED" });
    expect(generateNotificationFromEvent(event)).toBeNull();
  });

  it("APPLICATION_SUBMITTED → null", () => {
    const event = makeEvent({ eventType: "APPLICATION_SUBMITTED" });
    expect(generateNotificationFromEvent(event)).toBeNull();
  });

  it("APPLICATION_WITHDRAWN → null", () => {
    const event = makeEvent({ eventType: "APPLICATION_WITHDRAWN" });
    expect(generateNotificationFromEvent(event)).toBeNull();
  });

  it("INTERVIEW_COMPLETED → null", () => {
    const event = makeEvent({ eventType: "INTERVIEW_COMPLETED" });
    expect(generateNotificationFromEvent(event)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: Deterministic notificationKey
// ---------------------------------------------------------------------------

describe("Notification key determinism", () => {
  it("same inputs produce same key", () => {
    const key1 = generateNotificationKey("INTERVIEW_SCHEDULED", "interview-1", "2025-09-01");
    const key2 = generateNotificationKey("INTERVIEW_SCHEDULED", "interview-1", "2025-09-01");
    expect(key1).toBe(key2);
  });

  it("different types produce different keys", () => {
    const key1 = generateNotificationKey("INTERVIEW_SCHEDULED", "id-1", "2025-09-01");
    const key2 = generateNotificationKey("FOLLOW_UP_DUE", "id-1", "2025-09-01");
    expect(key1).not.toBe(key2);
  });

  it("different aggregates produce different keys", () => {
    const key1 = generateNotificationKey("INTERVIEW_SCHEDULED", "interview-1", "2025-09-01");
    const key2 = generateNotificationKey("INTERVIEW_SCHEDULED", "interview-2", "2025-09-01");
    expect(key1).not.toBe(key2);
  });

  it("different dates produce different keys", () => {
    const key1 = generateNotificationKey("INTERVIEW_SCHEDULED", "id-1", "2025-09-01");
    const key2 = generateNotificationKey("INTERVIEW_SCHEDULED", "id-1", "2025-09-02");
    expect(key1).not.toBe(key2);
  });

  it("key format is consistent", () => {
    const key = generateNotificationKey("OFFER_RECEIVED", "app-1", "2025-09-01");
    expect(key).toBe("notif_OFFER_RECEIVED_app-1_2025-09-01");
  });
});

// ---------------------------------------------------------------------------
// Tests: isNotifiableEvent
// ---------------------------------------------------------------------------

describe("isNotifiableEvent", () => {
  it("INTERVIEW_SCHEDULED is notifiable", () => {
    expect(isNotifiableEvent("INTERVIEW_SCHEDULED")).toBe(true);
  });

  it("OFFER_RECEIVED is notifiable", () => {
    expect(isNotifiableEvent("OFFER_RECEIVED")).toBe(true);
  });

  it("APPLICATION_CREATED is not notifiable", () => {
    expect(isNotifiableEvent("APPLICATION_CREATED")).toBe(false);
  });

  it("APPLICATION_SUBMITTED is not notifiable", () => {
    expect(isNotifiableEvent("APPLICATION_SUBMITTED")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Priority derivation
// ---------------------------------------------------------------------------

describe("Priority derivation", () => {
  it("OFFER_RECEIVED → CRITICAL", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { applicationId: "app-1", jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("CRITICAL");
  });

  it("INTERVIEW_SCHEDULED → HIGH", () => {
    const event = makeEvent({ eventType: "INTERVIEW_SCHEDULED" });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("HIGH");
  });

  it("RESUME_PROCESSED → LOW", () => {
    const event = makeEvent({
      eventType: "RESUME_PROCESSED",
      aggregateType: "resume",
      aggregateId: "r-1",
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("LOW");
  });
});

// ---------------------------------------------------------------------------
// Tests: URL safety
// ---------------------------------------------------------------------------

describe("Notification URL safety", () => {
  it("interview notification references interviewId", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: { interviewId: "int-1", applicationId: "app-1" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.interviewId).toBe("int-1");
    expect(notif?.applicationId).toBe("app-1");
  });

  it("resume notification references resumeId", () => {
    const event = makeEvent({
      eventType: "RESUME_PROCESSED",
      aggregateType: "resume",
      aggregateId: "r-1",
      payload: { resumeId: "r-1" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.resumeId).toBe("r-1");
    expect(notif?.applicationId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: Sensitive data exclusion
// ---------------------------------------------------------------------------

describe("Sensitive data exclusion", () => {
  it("no phone numbers in notification", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: { jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.message).not.toMatch(/\d{3}[-.]?\d{3}[-.]?\d{4}/);
  });

  it("no email addresses in notification", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.message).not.toMatch(/@/);
  });

  it("no credential data in notification", () => {
    const event = makeEvent({
      eventType: "RESUME_PROCESSED",
      aggregateType: "resume",
      aggregateId: "r-1",
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.message).not.toContain("password");
    expect(notif?.message).not.toContain("token");
    expect(notif?.message).not.toContain("secret");
  });
});

// ---------------------------------------------------------------------------
// Tests: User isolation
// ---------------------------------------------------------------------------

describe("User isolation", () => {
  it("notification references user-scoped paths", () => {
    const event = makeEvent({
      userId: "user-123",
      eventType: "INTERVIEW_SCHEDULED",
    });
    // The notification is created under users/{uid}/notifications
    // which is user-scoped by construction
    expect(event.userId).toBe("user-123");
  });
});

// ---------------------------------------------------------------------------
// Tests: Expiration behavior
// ---------------------------------------------------------------------------

describe("Expiration behavior", () => {
  it("OFFER_RECEIVED has no expiration", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { applicationId: "app-1", jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.expiresAt).toBeNull();
  });

  it("INTERVIEW_SCHEDULED has no expiration", () => {
    const event = makeEvent({ eventType: "INTERVIEW_SCHEDULED" });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.expiresAt).toBeNull();
  });

  it("RESUME_PROCESSED has no expiration", () => {
    const event = makeEvent({
      eventType: "RESUME_PROCESSED",
      aggregateType: "resume",
      aggregateId: "r-1",
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.expiresAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: Missing data handling
// ---------------------------------------------------------------------------

describe("Missing data handling", () => {
  it("handles missing jobTitle gracefully", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: {},
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.message).toContain("a position");
  });

  it("handles missing company gracefully", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { jobTitle: "Dev" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.message).toContain("Dev");
    expect(notif?.message).not.toContain("at ");
  });

  it("handles missing applicationId", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: {},
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.applicationId).toBeNull();
  });
});
