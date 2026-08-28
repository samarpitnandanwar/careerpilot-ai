// ============================================================================
// CareerPilot AI — Action Reconciliation Service
// ============================================================================
//
// Self-healing consistency: when the Action Center loads, reconcile any
// currently-actionable items that are missing actions (e.g., historical
// events created before the action system existed).
//
// Reconciliation is:
//   - deterministic (same input → same output)
//   - idempotent (actionKey deduplication)
//   - user-scoped
//   - server-side only
//   - NO Gemini calls
// ============================================================================

import type {
  FirestoreApplication,
  FirestoreInterview,
  FirestoreJobPriority,
} from "@/types";
import type { ApplicationStatus } from "@/types";
import {
  generateActionFromEvent,
  generateHighPriorityJobAction,
  shouldExpirePriorityAction,
} from "./generator";
import { createAction } from "./service";
import { now } from "@/lib/firestore/db";

// ---------------------------------------------------------------------------
// Reconcile inputs
// ---------------------------------------------------------------------------

export interface ReconcileInput {
  uid: string;
  applications: FirestoreApplication[];
  interviews: FirestoreInterview[];
  priorityScores: Map<string, FirestoreJobPriority>;
}

export interface ReconcileResult {
  actionsCreated: number;
  actionsExpired: number;
}

// ---------------------------------------------------------------------------
// Main reconciliation
// ---------------------------------------------------------------------------

/**
 * Reconcile the user's current state to ensure all actionable items have
 * corresponding open actions. This is:
 *   - idempotent (actionKey deduplication prevents duplicates)
 *   - deterministic (same state → same actions)
 *   - user-scoped (only reads/writes under uid)
 *   - NO Gemini calls (purely algorithmic)
 *
 * Returns a count of actions created and expired.
 */
export async function reconcileUserActions(
  input: ReconcileInput,
): Promise<ReconcileResult> {
  const { uid, applications, interviews, priorityScores } = input;
  let actionsCreated = 0;
  let actionsExpired = 0;

  // --- 1. Reconcile upcoming interviews ---
  actionsCreated += await reconcileUpcomingInterviews(uid, interviews, applications);

  // --- 2. Reconcile due follow-ups ---
  actionsCreated += await reconcileDueFollowUps(uid, applications);

  // --- 3. Reconcile approaching deadlines ---
  actionsCreated += await reconcileApproachingDeadlines(uid, applications);

  // --- 4. Reconcile pending assessments ---
  actionsCreated += await reconcileAssessments(uid, applications);

  // --- 5. Reconcile offers requiring review ---
  actionsCreated += await reconcileOffers(uid, applications);

  // --- 6. Reconcile HIGH/CRITICAL priority jobs ---
  actionsCreated += await reconcileHighPriorityJobs(uid, applications, priorityScores);

  // --- 7. Expire priority actions for terminal states ---
  actionsExpired += await expireTerminalStateActions(uid, applications);

  return { actionsCreated, actionsExpired };
}

// ---------------------------------------------------------------------------
// Sub-reconciliation: Upcoming interviews
// ---------------------------------------------------------------------------

async function reconcileUpcomingInterviews(
  uid: string,
  interviews: FirestoreInterview[],
  applications: FirestoreApplication[],
): Promise<number> {
  let count = 0;
  const nowStr = new Date().toISOString();

  for (const interview of interviews) {
    // Only reconcile future/scheduled interviews
    if (interview.status !== "scheduled") continue;
    if (!interview.scheduledAt) continue;

    const scheduledDate = new Date(interview.scheduledAt);
    if (scheduledDate.getTime() < new Date(nowStr).getTime()) continue;

    // Find the parent application for context
    const application = applications.find((a) => a.id === interview.applicationId);
    const jobTitle = application?.jobTitle ?? "a position";
    const company = application?.company ?? "";

    // Build a synthetic event to reuse the existing generator
    const syntheticEvent = {
      eventId: `reconcile_interview_${interview.id}`,
      eventType: "INTERVIEW_SCHEDULED" as const,
      eventVersion: 1,
      occurredAt: nowStr,
      userId: uid,
      aggregateType: "interview" as const,
      aggregateId: interview.id,
      payload: {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        scheduledAt: interview.scheduledAt,
        jobTitle,
        company,
        jobId: application?.jobId ?? undefined,
      },
    };

    const generated = generateActionFromEvent(syntheticEvent);
    if (generated) {
      await createAction(uid, {
        type: generated.type,
        priority: generated.priority,
        title: generated.title,
        description: generated.description,
        applicationId: generated.applicationId,
        jobId: generated.jobId,
        interviewId: generated.interviewId,
        dueAt: generated.dueAt,
        expiresAt: generated.expiresAt,
        actionUrl: generated.actionUrl,
        sourceEventId: generated.sourceEventId,
        actionKey: generated.actionKey,
      });
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Sub-reconciliation: Due follow-ups
// ---------------------------------------------------------------------------

async function reconcileDueFollowUps(
  uid: string,
  applications: FirestoreApplication[],
): Promise<number> {
  let count = 0;
  const nowStr = new Date().toISOString();
  const nowTime = new Date(nowStr).getTime();

  for (const app of applications) {
    if (!app.followUpDate) continue;

    // Follow-up is due or overdue and hasn't been resolved
    const followUpTime = new Date(app.followUpDate).getTime();
    if (followUpTime > nowTime) continue; // Not yet due

    // Don't reconcile for terminal states
    if (shouldExpirePriorityAction(app.status)) continue;

    const syntheticEvent = {
      eventId: `reconcile_followup_${app.id}_${app.followUpDate}`,
      eventType: "FOLLOW_UP_DUE" as const,
      eventVersion: 1,
      occurredAt: nowStr,
      userId: uid,
      aggregateType: "application" as const,
      aggregateId: app.id,
      payload: {
        applicationId: app.id,
        jobId: app.jobId ?? undefined,
        jobTitle: app.jobTitle,
        company: app.company,
        followUpDate: app.followUpDate ?? undefined,
      },
    };

    const generated = generateActionFromEvent(syntheticEvent);
    if (generated) {
      await createAction(uid, {
        type: generated.type,
        priority: generated.priority,
        title: generated.title,
        description: generated.description,
        applicationId: generated.applicationId,
        jobId: generated.jobId,
        interviewId: generated.interviewId,
        dueAt: generated.dueAt,
        expiresAt: generated.expiresAt,
        actionUrl: generated.actionUrl,
        sourceEventId: generated.sourceEventId,
        actionKey: generated.actionKey,
      });
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Sub-reconciliation: Approaching deadlines
// ---------------------------------------------------------------------------

async function reconcileApproachingDeadlines(
  uid: string,
  applications: FirestoreApplication[],
): Promise<number> {
  let count = 0;
  const nowStr = new Date().toISOString();
  const nowTime = new Date(nowStr).getTime();

  for (const app of applications) {
    if (!app.deadline) continue;

    const deadlineTime = new Date(app.deadline).getTime();
    const daysUntil = Math.ceil((deadlineTime - nowTime) / (1000 * 60 * 60 * 24));

    // Only create action if deadline is within 7 days and not yet expired
    if (daysUntil < 0 || daysUntil > 7) continue;

    // Don't reconcile for terminal states
    if (shouldExpirePriorityAction(app.status)) continue;

    const syntheticEvent = {
      eventId: `reconcile_deadline_${app.id}_${app.deadline}`,
      eventType: "APPLICATION_DEADLINE_APPROACHING" as const,
      eventVersion: 1,
      occurredAt: nowStr,
      userId: uid,
      aggregateType: "application" as const,
      aggregateId: app.id,
      payload: {
        applicationId: app.id,
        jobId: app.jobId ?? undefined,
        jobTitle: app.jobTitle,
        company: app.company,
        deadline: app.deadline ?? undefined,
      },
    };

    const generated = generateActionFromEvent(syntheticEvent);
    if (generated) {
      await createAction(uid, {
        type: generated.type,
        priority: generated.priority,
        title: generated.title,
        description: generated.description,
        applicationId: generated.applicationId,
        jobId: generated.jobId,
        interviewId: generated.interviewId,
        dueAt: generated.dueAt,
        expiresAt: generated.expiresAt,
        actionUrl: generated.actionUrl,
        sourceEventId: generated.sourceEventId,
        actionKey: generated.actionKey,
      });
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Sub-reconciliation: Pending assessments
// ---------------------------------------------------------------------------

async function reconcileAssessments(
  uid: string,
  applications: FirestoreApplication[],
): Promise<number> {
  let count = 0;
  const nowStr = new Date().toISOString();

  for (const app of applications) {
    if (app.status !== "assessment") continue;

    // Don't create duplicate if an ASSESSMENT action already exists
    const syntheticEvent = {
      eventId: `reconcile_assessment_${app.id}`,
      eventType: "APPLICATION_STATUS_CHANGED" as const,
      eventVersion: 1,
      occurredAt: nowStr,
      userId: uid,
      aggregateType: "application" as const,
      aggregateId: app.id,
      payload: {
        applicationId: app.id,
        jobId: app.jobId ?? undefined,
        jobTitle: app.jobTitle,
        company: app.company,
        newStatus: "assessment" as ApplicationStatus,
      },
    };

    const generated = generateActionFromEvent(syntheticEvent);
    if (generated) {
      await createAction(uid, {
        type: generated.type,
        priority: generated.priority,
        title: generated.title,
        description: generated.description,
        applicationId: generated.applicationId,
        jobId: generated.jobId,
        interviewId: generated.interviewId,
        dueAt: generated.dueAt,
        expiresAt: generated.expiresAt,
        actionUrl: generated.actionUrl,
        sourceEventId: generated.sourceEventId,
        actionKey: generated.actionKey,
      });
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Sub-reconciliation: Offers requiring review
// ---------------------------------------------------------------------------

async function reconcileOffers(
  uid: string,
  applications: FirestoreApplication[],
): Promise<number> {
  let count = 0;
  const nowStr = new Date().toISOString();

  for (const app of applications) {
    if (app.status !== "offer") continue;

    const syntheticEvent = {
      eventId: `reconcile_offer_${app.id}`,
      eventType: "OFFER_RECEIVED" as const,
      eventVersion: 1,
      occurredAt: nowStr,
      userId: uid,
      aggregateType: "application" as const,
      aggregateId: app.id,
      payload: {
        applicationId: app.id,
        jobId: app.jobId ?? undefined,
        jobTitle: app.jobTitle,
        company: app.company,
      },
    };

    const generated = generateActionFromEvent(syntheticEvent);
    if (generated) {
      await createAction(uid, {
        type: generated.type,
        priority: generated.priority,
        title: generated.title,
        description: generated.description,
        applicationId: generated.applicationId,
        jobId: generated.jobId,
        interviewId: generated.interviewId,
        dueAt: generated.dueAt,
        expiresAt: generated.expiresAt,
        actionUrl: generated.actionUrl,
        sourceEventId: generated.sourceEventId,
        actionKey: generated.actionKey,
      });
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Sub-reconciliation: HIGH/CRITICAL priority jobs
// ---------------------------------------------------------------------------

async function reconcileHighPriorityJobs(
  uid: string,
  applications: FirestoreApplication[],
  priorityScores: Map<string, FirestoreJobPriority>,
): Promise<number> {
  let count = 0;

  for (const [jobId, priority] of priorityScores) {
    // Only reconcile HIGH or CRITICAL
    if (priority.level !== "CRITICAL" && priority.level !== "HIGH") continue;

    // Find the application for this job
    const application = applications.find((a) => a.jobId === jobId);

    // Don't create for terminal states
    const appStatus: ApplicationStatus = application?.status ?? "saved";
    if (shouldExpirePriorityAction(appStatus)) continue;

    const generated = generateHighPriorityJobAction({
      jobId,
      jobTitle: application?.jobTitle ?? "Unknown Position",
      company: application?.company ?? "",
      applicationId: application?.id ?? null,
      priorityLevel: priority.level,
      priorityDate: priority.createdAt,
    });

    if (generated) {
      await createAction(uid, {
        type: generated.type,
        priority: generated.priority,
        title: generated.title,
        description: generated.description,
        applicationId: generated.applicationId,
        jobId: generated.jobId,
        interviewId: generated.interviewId,
        dueAt: generated.dueAt,
        expiresAt: generated.expiresAt,
        actionUrl: generated.actionUrl,
        sourceEventId: generated.sourceEventId,
        actionKey: generated.actionKey,
      });
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Terminal state lifecycle: expire priority actions for rejected/withdrawn/accepted
// ---------------------------------------------------------------------------

/**
 * When an application reaches a terminal state, expire any open HIGH_PRIORITY_JOB
 * action for that job/application. Uses the action service to update status.
 *
 * This preserves the historical record (no deletion) while removing the action
 * from the actionable queue.
 */
async function expireTerminalStateActions(
  uid: string,
  applications: FirestoreApplication[],
): Promise<number> {
  let count = 0;
  const nowStr = now();

  for (const app of applications) {
    if (!shouldExpirePriorityAction(app.status)) continue;

    // Look for open HIGH_PRIORITY_JOB actions for this application's job
    try {
      const { getActions } = await import("./service");
      const openActions = await getActions(uid, { status: "OPEN", limit: 100 });

      for (const action of openActions) {
        if (
          action.type === "HIGH_PRIORITY_JOB" &&
          action.jobId === app.jobId &&
          action.status === "OPEN"
        ) {
          // Expire the action
          const { getDb } = await import("@/lib/firestore/db");
          const db = getDb();
          await db
            .collection("users")
            .doc(uid)
            .collection("actions")
            .doc(action.id)
            .update({
              status: "EXPIRED",
              completedAt: nowStr,
            });
          count++;
        }
      }
    } catch {
      // Don't fail reconciliation if lifecycle update fails
      console.error(`[Reconcile] Failed to expire actions for application ${app.id}`);
    }
  }

  return count;
}
