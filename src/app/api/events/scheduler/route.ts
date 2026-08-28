// ============================================================================
// CareerPilot AI — Scheduler Event Generator
// ============================================================================
//
// Periodic endpoint called by Cloud Scheduler to evaluate:
// - Upcoming application deadlines
// - Follow-up dates that are due
// - Upcoming interview dates
//
// Generates domain events with deterministic keys to prevent duplicates.
//
// POST /api/events/scheduler
//
// Security:
//   - Production: authentication is MANDATORY.
//     Accepts either:
//       1. A valid Identity Platform user token (for testing)
//       2. A Google-signed OIDC service-account token from Cloud Scheduler
//     Rejects all unauthenticated requests with 401.
//
//   - Development: a controlled bypass is available ONLY when
//     EVENT_ENDPOINT_DEV_SECRET is set AND the request carries
//     the matching X-Event-Dev-Secret header. This is NOT activated
//     by NODE_ENV.
// ============================================================================

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firestore/db";
import { now } from "@/lib/firestore/db";
import { publishDomainEvent, type EventContext } from "@/lib/events/publisher";
import { isEventProcessed } from "@/lib/events/processor";
import {
  verifySchedulerRequest,
  isAcceptedSchedulerIdentity,
} from "@/lib/events/auth";
import type {
  FirestoreApplication,
  FirestoreInterview,
  DomainEventType,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate days from now to a given date string */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  // Zero out time components for day-level comparison
  const targetDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil(
    (targetDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** Generate a deterministic event key for deduplication */
function deadlineEventKey(
  eventType: DomainEventType,
  applicationId: string,
  dateStr: string,
): string {
  const dateKey = dateStr.split("T")[0]; // YYYY-MM-DD
  return `evt_${eventType}_${applicationId}_${dateKey}`;
}

// ---------------------------------------------------------------------------
// POST /api/events/scheduler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ---- Authentication ----
  // Production: require valid OIDC service-account token or user token.
  // Development: optional bypass via EVENT_ENDPOINT_DEV_SECRET header.
  const authResult = await verifySchedulerRequest(request);

  if (!authResult.ok) {
    // Production: unauthenticated or invalid identity → 401
    return authResult.response;
  }

  const { identity } = authResult;

  // Defense-in-depth: if the identity is a known scheduler service account,
  // log it. Accept all verified identities (user tokens for testing,
  // scheduler OIDC for production).
  if (!isAcceptedSchedulerIdentity(identity.email)) {
    console.warn(
      `[Scheduler] Request from non-scheduler identity: ${identity.email}`,
    );
  }

  const db = getDb();
  const results = {
    deadlineApproaching: 0,
    deadlineExpired: 0,
    followUpDue: 0,
    interviewUpcoming: 0,
    errors: 0,
    usersProcessed: 0,
  };

  try {
    // Get all users to evaluate their applications/interviews
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      const userUid = userDoc.id;
      const eventCtx: EventContext = { userId: userUid };

      try {
        // ---- 1. Evaluate application deadlines ----
        const appsSnap = await db
          .collection("users")
          .doc(userUid)
          .collection("applications")
          .where("archived", "==", false)
          .get();

        const todayStr = new Date().toISOString().split("T")[0];

        for (const appDoc of appsSnap.docs) {
          const app = appDoc.data() as FirestoreApplication;

          // Evaluate application deadline
          if (app.deadline) {
            const days = daysUntil(app.deadline);

            if (days < 0) {
              // Deadline has expired
              const eventKey = deadlineEventKey(
                "APPLICATION_DEADLINE_EXPIRED",
                app.id,
                todayStr,
              );
              const alreadyProcessed = await isEventProcessed(
                userUid,
                eventKey,
              );
              if (!alreadyProcessed) {
                try {
                  await publishDomainEvent(
                    eventCtx,
                    "APPLICATION_DEADLINE_EXPIRED",
                    { type: "application", id: app.id },
                    {
                      applicationId: app.id,
                      jobId: app.jobId,
                      deadline: app.deadline,
                      jobTitle: app.jobTitle,
                      company: app.company,
                    },
                  );
                  results.deadlineExpired++;
                } catch {
                  results.errors++;
                }
              }
            } else if (days <= 3) {
              // Deadline approaching (within 3 days)
              const eventKey = deadlineEventKey(
                "APPLICATION_DEADLINE_APPROACHING",
                app.id,
                todayStr,
              );
              const alreadyProcessed = await isEventProcessed(
                userUid,
                eventKey,
              );
              if (!alreadyProcessed) {
                try {
                  await publishDomainEvent(
                    eventCtx,
                    "APPLICATION_DEADLINE_APPROACHING",
                    { type: "application", id: app.id },
                    {
                      applicationId: app.id,
                      jobId: app.jobId,
                      deadline: app.deadline,
                      jobTitle: app.jobTitle,
                      company: app.company,
                    },
                  );
                  results.deadlineApproaching++;
                } catch {
                  results.errors++;
                }
              }
            }
          }

          // Evaluate follow-up date
          if (app.followUpDate) {
            const followUp = new Date(app.followUpDate);
            const followUpDay = new Date(
              followUp.getFullYear(),
              followUp.getMonth(),
              followUp.getDate(),
            );
            const nowDay = new Date();
            const todayDay = new Date(
              nowDay.getFullYear(),
              nowDay.getMonth(),
              nowDay.getDate(),
            );

            if (followUpDay.getTime() <= todayDay.getTime()) {
              // Follow-up is due (today or past)
              const eventKey = deadlineEventKey(
                "FOLLOW_UP_DUE",
                app.id,
                todayStr,
              );
              const alreadyProcessed = await isEventProcessed(
                userUid,
                eventKey,
              );
              if (!alreadyProcessed) {
                try {
                  await publishDomainEvent(
                    eventCtx,
                    "FOLLOW_UP_DUE",
                    { type: "application", id: app.id },
                    {
                      applicationId: app.id,
                      jobId: app.jobId,
                      followUpDate: app.followUpDate,
                      jobTitle: app.jobTitle,
                      company: app.company,
                    },
                  );
                  results.followUpDue++;
                } catch {
                  results.errors++;
                }
              }
            }
          }
        }

        // ---- 2. Evaluate upcoming interviews ----
        const interviewsSnap = await db
          .collection("users")
          .doc(userUid)
          .collection("interviews")
          .where("status", "==", "scheduled")
          .get();

        for (const intDoc of interviewsSnap.docs) {
          const interview = intDoc.data() as FirestoreInterview;

          if (interview.scheduledAt) {
            const days = daysUntil(interview.scheduledAt);

            if (days >= 0 && days <= 7) {
              // Interview is upcoming (within 7 days)
              const eventKey = deadlineEventKey(
                "INTERVIEW_SCHEDULED",
                interview.id,
                todayStr,
              );
              const alreadyProcessed = await isEventProcessed(
                userUid,
                eventKey,
              );
              if (!alreadyProcessed) {
                try {
                  await publishDomainEvent(
                    eventCtx,
                    "INTERVIEW_SCHEDULED",
                    { type: "interview", id: interview.id },
                    {
                      interviewId: interview.id,
                      applicationId: interview.applicationId,
                      scheduledAt: interview.scheduledAt,
                    },
                  );
                  results.interviewUpcoming++;
                } catch {
                  results.errors++;
                }
              }
            }
          }
        }

        results.usersProcessed++;
      } catch (userError) {
        console.error(
          `[Scheduler] Error processing user ${userUid}:`,
          userError,
        );
        results.errors++;
      }
    }

    // Log with safe metadata only — no user data, no resume content
    console.log(
      `[Scheduler] Completed: ${results.usersProcessed} users, ` +
        `${results.deadlineApproaching} approaching, ` +
        `${results.deadlineExpired} expired, ` +
        `${results.followUpDue} follow-ups, ` +
        `${results.interviewUpcoming} interviews, ` +
        `${results.errors} errors`,
    );

    return NextResponse.json({
      success: true,
      data: results,
      processedAt: now(),
      verifiedIdentity: identity.email,
    });
  } catch (error) {
    console.error("[Scheduler] Processing error:", error);
    return NextResponse.json(
      { success: false, error: "Scheduler processing failed" },
      { status: 500 },
    );
  }
}
