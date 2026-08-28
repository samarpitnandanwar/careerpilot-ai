// ============================================================================
// CareerPilot AI — Action Center Unit Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import { generateActionFromEvent, generateActionKey } from "@/lib/actions/generator";
import type { DomainEventEnvelope } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  overrides: Partial<DomainEventEnvelope> = {},
): DomainEventEnvelope {
  return {
    eventId: `evt_${Date.now()}_${Math.random()}`,
    eventType: "APPLICATION_CREATED",
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    userId: "user-123",
    aggregateType: "application",
    aggregateId: "app-123",
    payload: {},
    ...overrides,
  };
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}



// ---------------------------------------------------------------------------
// Test: Action Key Generation
// ---------------------------------------------------------------------------

describe("Action Key Generation", () => {
  it("generates deterministic key", () => {
    const key1 = generateActionKey("FOLLOW_UP", "app-1", "2025-09-01");
    const key2 = generateActionKey("FOLLOW_UP", "app-1", "2025-09-01");
    expect(key1).toBe(key2);
  });

  it("different types produce different keys", () => {
    const key1 = generateActionKey("FOLLOW_UP", "app-1", "2025-09-01");
    const key2 = generateActionKey("INTERVIEW_PREP", "app-1", "2025-09-01");
    expect(key1).not.toBe(key2);
  });

  it("different aggregates produce different keys", () => {
    const key1 = generateActionKey("FOLLOW_UP", "app-1", "2025-09-01");
    const key2 = generateActionKey("FOLLOW_UP", "app-2", "2025-09-01");
    expect(key1).not.toBe(key2);
  });

  it("different dates produce different keys", () => {
    const key1 = generateActionKey("FOLLOW_UP", "app-1", "2025-09-01");
    const key2 = generateActionKey("FOLLOW_UP", "app-1", "2025-09-02");
    expect(key1).not.toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// Test: Event → Action Mapping
// ---------------------------------------------------------------------------

describe("Event → Action Mapping", () => {
  it("INTERVIEW_SCHEDULED → INTERVIEW_PREP", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      aggregateType: "interview",
      aggregateId: "int-1",
      payload: {
        interviewId: "int-1",
        applicationId: "app-1",
        jobId: "job-1",
        jobTitle: "Senior Engineer",
        company: "Acme",
        scheduledAt: futureDate(2),
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("INTERVIEW_PREP");
    expect(action?.priority).toBe("HIGH"); // 2 days out = HIGH
    expect(action?.title).toBe("Prepare for interview");
    expect(action?.description).toContain("Senior Engineer");
    expect(action?.description).toContain("Acme");
    expect(action?.applicationId).toBe("app-1");
    expect(action?.interviewId).toBe("int-1");
    expect(action?.actionUrl).toBe("/interview/app-1");
    expect(action?.dueAt).toBe(event.payload.scheduledAt);
  });

  it("FOLLOW_UP_DUE → FOLLOW_UP", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        jobTitle: "Frontend Dev",
        company: "TechCo",
        followUpDate: futureDate(0),
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("FOLLOW_UP");
    expect(action?.priority).toBe("CRITICAL"); // due today
    expect(action?.title).toBe("Follow-up due");
    expect(action?.description).toContain("Frontend Dev");
    expect(action?.applicationId).toBe("app-1");
    expect(action?.actionUrl).toBe("/applications/app-1");
  });

  it("APPLICATION_DEADLINE_APPROACHING → APPLICATION_DEADLINE", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_APPROACHING",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        jobTitle: "Backend Dev",
        company: "DataCo",
        deadline: futureDate(3),
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("APPLICATION_DEADLINE");
    expect(action?.priority).toBe("HIGH");
    expect(action?.title).toBe("Application deadline approaching");
    expect(action?.description).toContain("Backend Dev");
  });

  it("OFFER_RECEIVED → REVIEW_OFFER", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        jobTitle: "Tech Lead",
        company: "BigCorp",
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("REVIEW_OFFER");
    expect(action?.priority).toBe("CRITICAL");
    expect(action?.title).toBe("Review your offer");
    expect(action?.description).toContain("Tech Lead");
  });

  it("APPLICATION_STATUS_CHANGED to screening → APPLICATION_UPDATE", () => {
    const event = makeEvent({
      eventType: "APPLICATION_STATUS_CHANGED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        jobTitle: "DevOps",
        previousStatus: "applied",
        newStatus: "screening",
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("APPLICATION_UPDATE");
    expect(action?.title).toBe("Application in screening");
  });

  it("APPLICATION_STATUS_CHANGED to assessment → ASSESSMENT", () => {
    const event = makeEvent({
      eventType: "APPLICATION_STATUS_CHANGED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        newStatus: "assessment",
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("ASSESSMENT");
    expect(action?.priority).toBe("HIGH");
    expect(action?.title).toBe("Complete assessment");
  });

  it("APPLICATION_STATUS_CHANGED to rejected → APPLICATION_UPDATE", () => {
    const event = makeEvent({
      eventType: "APPLICATION_STATUS_CHANGED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        newStatus: "rejected",
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("APPLICATION_UPDATE");
    expect(action?.priority).toBe("LOW");
    expect(action?.title).toBe("Application rejected");
  });

  it("APPLICATION_DEADLINE_EXPIRED → APPLICATION_UPDATE", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_EXPIRED",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        jobTitle: "Full Stack",
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("APPLICATION_UPDATE");
    expect(action?.title).toBe("Application deadline expired");
  });

  it("non-actionable events return null", () => {
    const event = makeEvent({
      eventType: "APPLICATION_CREATED",
      payload: { applicationId: "app-1", jobId: "job-1" },
    });

    const action = generateActionFromEvent(event);
    expect(action).toBeNull();
  });

  it("APPLICATION_STATUS_CHANGED to non-actionable status returns null", () => {
    const event = makeEvent({
      eventType: "APPLICATION_STATUS_CHANGED",
      payload: {
        applicationId: "app-1",
        newStatus: "applied",
      },
    });

    const action = generateActionFromEvent(event);
    expect(action).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test: Deterministic Generation
// ---------------------------------------------------------------------------

describe("Deterministic Generation", () => {
  it("same event produces same action", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      occurredAt: "2025-09-01T10:00:00.000Z",
      payload: {
        applicationId: "app-1",
        jobId: "job-1",
        jobTitle: "Engineer",
        followUpDate: "2025-09-05",
      },
    });

    const action1 = generateActionFromEvent(event);
    const action2 = generateActionFromEvent(event);

    expect(action1?.type).toBe(action2?.type);
    expect(action1?.priority).toBe(action2?.priority);
    expect(action1?.title).toBe(action2?.title);
    expect(action1?.description).toBe(action2?.description);
    expect(action1?.actionKey).toBe(action2?.actionKey);
  });

  it("different events produce different actions", () => {
    const event1 = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { applicationId: "app-1", followUpDate: futureDate(1) },
    });
    const event2 = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { applicationId: "app-1" },
    });

    const action1 = generateActionFromEvent(event1);
    const action2 = generateActionFromEvent(event2);

    expect(action1?.type).not.toBe(action2?.type);
  });
});

// ---------------------------------------------------------------------------
// Test: Priority Derivation
// ---------------------------------------------------------------------------

describe("Priority Derivation", () => {
  it("interview scheduled is CRITICAL", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: { interviewId: "int-1", applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.priority).toBe("CRITICAL");
  });

  it("offer received is CRITICAL", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.priority).toBe("CRITICAL");
  });

  it("follow-up due today is CRITICAL", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { applicationId: "app-1", followUpDate: futureDate(0) },
    });
    const action = generateActionFromEvent(event);
    expect(action?.priority).toBe("CRITICAL");
  });

  it("follow-up due in 5 days is HIGH", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { applicationId: "app-1", followUpDate: futureDate(5) },
    });
    const action = generateActionFromEvent(event);
    expect(action?.priority).toBe("HIGH");
  });

  it("deadline approaching in 2 days is HIGH", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_APPROACHING",
      payload: { applicationId: "app-1", deadline: futureDate(2) },
    });
    const action = generateActionFromEvent(event);
    expect(action?.priority).toBe("HIGH");
  });

  it("deadline expired is MEDIUM", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_EXPIRED",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.priority).toBe("MEDIUM");
  });

  it("rejected is LOW", () => {
    const event = makeEvent({
      eventType: "APPLICATION_STATUS_CHANGED",
      payload: { applicationId: "app-1", newStatus: "rejected" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.priority).toBe("LOW");
  });
});

// ---------------------------------------------------------------------------
// Test: Action URL Generation
// ---------------------------------------------------------------------------

describe("Action URL Generation", () => {
  it("interview prep links to interview page", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: { interviewId: "int-1", applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.actionUrl).toBe("/interview/app-1");
  });

  it("follow-up links to application page", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.actionUrl).toBe("/applications/app-1");
  });

  it("deadline links to application page", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_APPROACHING",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.actionUrl).toBe("/applications/app-1");
  });

  it("offer links to application page", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.actionUrl).toBe("/applications/app-1");
  });

  it("deadline without application links to job page", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_APPROACHING",
      payload: { jobId: "job-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.actionUrl).toBe("/jobs/job-1");
  });
});

// ---------------------------------------------------------------------------
// Test: Expiration
// ---------------------------------------------------------------------------

describe("Expiration", () => {
  it("interview action expires 24h after interview", () => {
    const interviewDate = futureDate(5);
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: {
        interviewId: "int-1",
        applicationId: "app-1",
        scheduledAt: interviewDate,
      },
    });
    const action = generateActionFromEvent(event);
    const expectedExpiry = new Date(
      new Date(interviewDate).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(action?.expiresAt).toBe(expectedExpiry);
  });

  it("follow-up action expires 3 days after due date", () => {
    const followUpDate = futureDate(3);
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: {
        applicationId: "app-1",
        followUpDate,
      },
    });
    const action = generateActionFromEvent(event);
    const expectedExpiry = new Date(
      new Date(followUpDate).getTime() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(action?.expiresAt).toBe(expectedExpiry);
  });

  it("offer action has no expiration", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.expiresAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test: Security
// ---------------------------------------------------------------------------

describe("Action Security", () => {
  it("each action has required fields", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { applicationId: "app-1", followUpDate: futureDate(1) },
    });
    const action = generateActionFromEvent(event);
    expect(action?.type).toBeTruthy();
    expect(action?.priority).toBeTruthy();
    expect(action?.title).toBeTruthy();
    expect(action?.description).toBeTruthy();
    expect(action?.actionUrl).toBeTruthy();
    expect(action?.sourceEventId).toBeTruthy();
    expect(action?.actionKey).toBeTruthy();
  });

  it("action does not contain resume text", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    const serialized = JSON.stringify(action);
    expect(serialized).not.toContain("resume");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("token");
  });

  it("action URL is a safe internal path", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.actionUrl).toMatch(/^\//);
    expect(action?.actionUrl).not.toContain("http");
    expect(action?.actionUrl).not.toContain("javascript");
  });

  it("deterministic output for same input", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      occurredAt: "2025-09-01T12:00:00.000Z",
      payload: {
        interviewId: "int-1",
        applicationId: "app-1",
        scheduledAt: "2025-09-10T10:00:00.000Z",
      },
    });
    const a1 = generateActionFromEvent(event);
    const a2 = generateActionFromEvent(event);
    expect(a1).toEqual(a2);
  });
});

// ---------------------------------------------------------------------------
// Test: Edge Cases
// ---------------------------------------------------------------------------

describe("Edge Cases", () => {
  it("handles missing job title gracefully", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action?.description).toBeTruthy();
  });

  it("handles missing application ID", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: {},
    });
    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.actionUrl).toBe("/applications");
  });

  it("handles missing interview ID for interview scheduled", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: { applicationId: "app-1" },
    });
    const action = generateActionFromEvent(event);
    expect(action).not.toBeNull();
    expect(action?.type).toBe("INTERVIEW_PREP");
  });
});
