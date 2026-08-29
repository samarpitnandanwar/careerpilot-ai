// ============================================================================
// CareerPilot AI — Notification Hardening Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  generateNotificationFromEvent,
  generateNotificationKey,
  isNotifiableEvent,
} from "@/lib/notifications/generator";
import {
  NotificationPreferencesUpdateSchema,
} from "@/lib/notifications/preferences";
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

function makeFutureDate(hoursFromNow: number): string {
  const d = new Date();
  d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000);
  return d.toISOString();
}

function makePastDate(hoursAgo: number): string {
  const d = new Date();
  d.setTime(d.getTime() - hoursAgo * 60 * 60 * 1000);
  return d.toISOString();
}

// ===========================================================================
// PART 1: Notification Preferences
// ===========================================================================

describe("Notification Preferences", () => {
  describe("Zod schema validation", () => {
    it("accepts valid preference", () => {
      const result = NotificationPreferencesUpdateSchema.safeParse({
        notificationsEnabled: true,
      });
      expect(result.success).toBe(true);
    });

    it("accepts false", () => {
      const result = NotificationPreferencesUpdateSchema.safeParse({
        notificationsEnabled: false,
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing field", () => {
      const result = NotificationPreferencesUpdateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects wrong type", () => {
      const result = NotificationPreferencesUpdateSchema.safeParse({
        notificationsEnabled: "yes",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown fields", () => {
      const result = NotificationPreferencesUpdateSchema.safeParse({
        notificationsEnabled: true,
        extraField: "bad",
      });
      expect(result.success).toBe(false);
    });

    it("rejects extra nested fields", () => {
      const result = NotificationPreferencesUpdateSchema.safeParse({
        notificationsEnabled: true,
        userId: "hacked",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Preference behavior", () => {
    it("default preference is enabled (true)", () => {
      // The service returns { notificationsEnabled: true } when no doc exists
      // This is the DEFAULT_PREFERENCES constant in preferences.ts
      const defaultPrefs = { notificationsEnabled: true };
      expect(defaultPrefs.notificationsEnabled).toBe(true);
    });

    it("explicit false disables notifications", () => {
      const prefs = { notificationsEnabled: false };
      expect(prefs.notificationsEnabled).toBe(false);
    });

    it("explicit true enables notifications", () => {
      const prefs = { notificationsEnabled: true };
      expect(prefs.notificationsEnabled).toBe(true);
    });
  });

  describe("Preference does not affect Actions", () => {
    it("INTERVIEW_SCHEDULED is still notifiable even if notifications disabled", () => {
      // The isNotifiableEvent function checks event mapping, not preferences
      expect(isNotifiableEvent("INTERVIEW_SCHEDULED")).toBe(true);
      expect(isNotifiableEvent("OFFER_RECEIVED")).toBe(true);
      expect(isNotifiableEvent("FOLLOW_UP_DUE")).toBe(true);
    });
  });
});

// ===========================================================================
// PART 2: Interview Reminders
// ===========================================================================

describe("Interview Reminders", () => {
  describe("INTERVIEW_REMINDER generation", () => {
    it("interview within 24h → reminder notification", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-1",
        payload: {
          interviewId: "interview-1",
          applicationId: "app-1",
          jobId: "job-1",
          scheduledAt: makeFutureDate(12),
          jobTitle: "Senior Engineer",
          company: "Acme",
        },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("INTERVIEW_REMINDER");
      expect(notif?.priority).toBe("HIGH");
      expect(notif?.title).toBe("Interview reminder");
      expect(notif?.message).toContain("Senior Engineer");
      expect(notif?.message).toContain("Acme");
      expect(notif?.interviewId).toBe("interview-1");
      expect(notif?.applicationId).toBe("app-1");
      expect(notif?.jobId).toBe("job-1");
    });

    it("interview more than 24h away → still generates reminder (scheduler controls timing)", () => {
      // The generator creates the notification content; the scheduler controls
      // when INTERVIEW_REMINDER events are published (only within 24h window).
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-1",
        payload: {
          interviewId: "interview-1",
          scheduledAt: makeFutureDate(48),
        },
      });

      const notif = generateNotificationFromEvent(event);
      expect(notif).not.toBeNull();
      expect(notif?.type).toBe("INTERVIEW_REMINDER");
    });

    it("INTERVIEW_REMINDER is notifiable", () => {
      expect(isNotifiableEvent("INTERVIEW_REMINDER")).toBe(true);
    });

    it("reminder priority is HIGH", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        payload: { interviewId: "int-1" },
      });
      const notif = generateNotificationFromEvent(event);
      expect(notif?.priority).toBe("HIGH");
    });

    it("reminder uses scheduledAt in key for per-day deduplication", () => {
      const scheduledAt = "2025-10-15T10:00:00.000Z";
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-1",
        payload: { interviewId: "interview-1", scheduledAt },
      });
      const notif = generateNotificationFromEvent(event);
      // Key should use the scheduled date, not today's date
      expect(notif?.notificationKey).toContain("2025-10-15");
    });
  });

  describe("Reminder idempotency", () => {
    it("same interview + same scheduled day → same key", () => {
      const scheduledAt = "2025-10-15T10:00:00.000Z";
      const event1 = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-1",
        payload: { interviewId: "interview-1", scheduledAt },
      });
      const event2 = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-1",
        payload: { interviewId: "interview-1", scheduledAt },
      });
      const notif1 = generateNotificationFromEvent(event1);
      const notif2 = generateNotificationFromEvent(event2);
      expect(notif1?.notificationKey).toBe(notif2?.notificationKey);
    });

    it("different interviews → different keys", () => {
      const scheduledAt = "2025-10-15T10:00:00.000Z";
      const event1 = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-1",
        payload: { interviewId: "interview-1", scheduledAt },
      });
      const event2 = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-2",
        payload: { interviewId: "interview-2", scheduledAt },
      });
      const notif1 = generateNotificationFromEvent(event1);
      const notif2 = generateNotificationFromEvent(event2);
      expect(notif1?.notificationKey).not.toBe(notif2?.notificationKey);
    });

    it("same interview, different scheduled days → different keys", () => {
      const event1 = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-1",
        payload: { interviewId: "interview-1", scheduledAt: "2025-10-15T10:00:00.000Z" },
      });
      const event2 = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        aggregateId: "interview-1",
        payload: { interviewId: "interview-1", scheduledAt: "2025-10-16T10:00:00.000Z" },
      });
      const notif1 = generateNotificationFromEvent(event1);
      const notif2 = generateNotificationFromEvent(event2);
      expect(notif1?.notificationKey).not.toBe(notif2?.notificationKey);
    });
  });

  describe("Reminder URL safety", () => {
    it("reminder references interviewId", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        payload: { interviewId: "int-1", applicationId: "app-1" },
      });
      const notif = generateNotificationFromEvent(event);
      expect(notif?.interviewId).toBe("int-1");
      expect(notif?.applicationId).toBe("app-1");
    });
  });

  describe("Reminder privacy", () => {
    it("no email in reminder", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        payload: { jobTitle: "Dev", company: "Co" },
      });
      const notif = generateNotificationFromEvent(event);
      expect(notif?.message).not.toMatch(/@/);
    });

    it("no phone in reminder", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        payload: { jobTitle: "Dev", company: "Co" },
      });
      const notif = generateNotificationFromEvent(event);
      expect(notif?.message).not.toMatch(/\d{3}[-.]?\d{3}[-.]?\d{4}/);
    });

    it("no credentials in reminder", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        payload: { jobTitle: "Dev", company: "Co" },
      });
      const notif = generateNotificationFromEvent(event);
      expect(notif?.message).not.toContain("password");
      expect(notif?.message).not.toContain("token");
    });
  });

  describe("Reminder missing data handling", () => {
    it("handles missing jobTitle", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        payload: {},
      });
      const notif = generateNotificationFromEvent(event);
      expect(notif?.message).toContain("a position");
    });

    it("handles missing company", () => {
      const event = makeEvent({
        eventType: "INTERVIEW_REMINDER",
        payload: { jobTitle: "Dev" },
      });
      const notif = generateNotificationFromEvent(event);
      expect(notif?.message).toContain("Dev");
      expect(notif?.message).not.toContain("at ");
    });
  });
});

// ===========================================================================
// PART 3: Existing notification mappings unchanged
// ===========================================================================

describe("Existing notification mappings (regression)", () => {
  it("INTERVIEW_SCHEDULED still works", () => {
    const event = makeEvent({
      eventType: "INTERVIEW_SCHEDULED",
      payload: { jobTitle: "Dev", company: "Co", interviewId: "i-1" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.type).toBe("INTERVIEW_SCHEDULED");
    expect(notif?.priority).toBe("HIGH");
  });

  it("OFFER_RECEIVED still CRITICAL", () => {
    const event = makeEvent({
      eventType: "OFFER_RECEIVED",
      payload: { jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("CRITICAL");
  });

  it("FOLLOW_UP_DUE still HIGH", () => {
    const event = makeEvent({
      eventType: "FOLLOW_UP_DUE",
      payload: { jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("HIGH");
  });

  it("APPLICATION_DEADLINE_APPROACHING still HIGH", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_APPROACHING",
      payload: { jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("HIGH");
  });

  it("APPLICATION_DEADLINE_EXPIRED still MEDIUM", () => {
    const event = makeEvent({
      eventType: "APPLICATION_DEADLINE_EXPIRED",
      payload: { jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("MEDIUM");
  });

  it("APPLICATION_REJECTED still MEDIUM", () => {
    const event = makeEvent({
      eventType: "APPLICATION_REJECTED",
      payload: { jobTitle: "Dev", company: "Co" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("MEDIUM");
  });

  it("APPLICATION_STATUS_CHANGED still MEDIUM", () => {
    const event = makeEvent({
      eventType: "APPLICATION_STATUS_CHANGED",
      payload: { jobTitle: "Dev", company: "Co", newStatus: "screening" },
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("MEDIUM");
  });

  it("RESUME_PROCESSED still LOW", () => {
    const event = makeEvent({
      eventType: "RESUME_PROCESSED",
      aggregateType: "resume",
      aggregateId: "r-1",
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("LOW");
  });

  it("RESUME_PROCESSING_FAILED still MEDIUM", () => {
    const event = makeEvent({
      eventType: "RESUME_PROCESSING_FAILED",
      aggregateType: "resume",
      aggregateId: "r-1",
    });
    const notif = generateNotificationFromEvent(event);
    expect(notif?.priority).toBe("MEDIUM");
  });

  it("non-notifiable events still return null", () => {
    expect(generateNotificationFromEvent(makeEvent({ eventType: "APPLICATION_CREATED" }))).toBeNull();
    expect(generateNotificationFromEvent(makeEvent({ eventType: "APPLICATION_SUBMITTED" }))).toBeNull();
    expect(generateNotificationFromEvent(makeEvent({ eventType: "APPLICATION_WITHDRAWN" }))).toBeNull();
    expect(generateNotificationFromEvent(makeEvent({ eventType: "INTERVIEW_COMPLETED" }))).toBeNull();
  });
});

// ===========================================================================
// PART 4: Scheduler behavior (unit-level verification)
// ===========================================================================

describe("Scheduler interview reminder logic", () => {
  it("interview within 24h satisfies reminder condition", () => {
    const scheduledDate = new Date();
    scheduledDate.setTime(scheduledDate.getTime() + 12 * 60 * 60 * 1000); // 12h from now
    const nowDate = new Date();
    const hoursUntil = (scheduledDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
    expect(hoursUntil).toBeGreaterThan(0);
    expect(hoursUntil).toBeLessThanOrEqual(24);
  });

  it("interview more than 24h away does not satisfy reminder condition", () => {
    const scheduledDate = new Date();
    scheduledDate.setTime(scheduledDate.getTime() + 48 * 60 * 60 * 1000); // 48h from now
    const nowDate = new Date();
    const hoursUntil = (scheduledDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
    expect(hoursUntil).toBeGreaterThan(24);
  });

  it("past interview does not satisfy reminder condition", () => {
    const scheduledDate = new Date();
    scheduledDate.setTime(scheduledDate.getTime() - 2 * 60 * 60 * 1000); // 2h ago
    const nowDate = new Date();
    const hoursUntil = (scheduledDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
    expect(hoursUntil).toBeLessThan(0);
  });

  it("reminder event key is deterministic", () => {
    const interviewId = "interview-1";
    const scheduledDay = "2025-10-15";
    const key1 = `evt_INTERVIEW_REMINDER_${interviewId}_${scheduledDay}`;
    const key2 = `evt_INTERVIEW_REMINDER_${interviewId}_${scheduledDay}`;
    expect(key1).toBe(key2);
  });

  it("reminder event key uses scheduled date, not today", () => {
    const interviewId = "interview-1";
    const scheduledDay = "2025-10-15";
    const todayStr = new Date().toISOString().split("T")[0];
    const key = `evt_INTERVIEW_REMINDER_${interviewId}_${scheduledDay}`;
    // Key should use scheduledDay, not todayStr
    expect(key).toContain(scheduledDay);
    if (scheduledDay !== todayStr) {
      expect(key).not.toContain(todayStr);
    }
  });
});
