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
import { verifySchedulerRequest, isAcceptedSchedulerIdentity } from "@/lib/events/auth";
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

  // Defense-in-depth: for scheduler OIDC tokens (not user tokens or dev bypass),
  // verify the service account is the expected one. This prevents a compromised
  // Google service account from triggering scheduler work.
  // User tokens and dev bypass are still accepted for testing.
  const identityEmail = authResult.identity.email;
  if (
    identityEmail &&
    !identityEmail.startsWith("uid:") &&
    !identityEmail.startsWith("dev-bypass") &&
    !isAcceptedSchedulerIdentity(identityEmail)
  ) {
    console.warn(
      "[Scheduler] Rejected unaccepted service account (not logged for security)",
    );
    return NextResponse.json(
      { success: false, error: "Unauthorized: unaccepted service account" },
      { status: 403 },
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
    // Paginate through all users to avoid unbounded queries.
    // Firestore limits documents per request to ~1MB.
    const PAGE_SIZE = 100;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let hasMore = true;

    while (hasMore) {
    let query = db.collection("users").orderBy("__name__").limit(PAGE_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    const usersSnap = await query.get();

    if (usersSnap.empty) {
      hasMore = false;
      break;
    }

    lastDoc = usersSnap.docs[usersSnap.docs.length - 1];
    if (usersSnap.docs.length < PAGE_SIZE) {
      hasMore = false;
    }

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

        // Load application data for interview context (job title, company)
        const appMap = new Map<string, FirestoreApplication>();
        for (const appDoc of appsSnap.docs) {
          const app = appDoc.data() as FirestoreApplication;
          appMap.set(app.id, app);
        }

        for (const intDoc of interviewsSnap.docs) {
          const interview = intDoc.data() as FirestoreInterview;

          if (interview.scheduledAt) {
            const scheduledDate = new Date(interview.scheduledAt);
            const nowDate = new Date();
            const hoursUntil = (scheduledDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);
            const days = daysUntil(interview.scheduledAt);

            // Interview is upcoming (within 7 days) — generate INTERVIEW_SCHEDULED reminder
            if (days >= 0 && days <= 7) {
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
                // Resolve application context for notification content
                const app = interview.applicationId ? appMap.get(interview.applicationId) : undefined;
                try {
                  await publishDomainEvent(
                    eventCtx,
                    "INTERVIEW_SCHEDULED",
                    { type: "interview", id: interview.id },
                    {
                      interviewId: interview.id,
                      applicationId: interview.applicationId,
                      scheduledAt: interview.scheduledAt,
                      jobTitle: app?.jobTitle,
                      company: app?.company,
                    },
                  );
                  results.interviewUpcoming++;
                } catch {
                  results.errors++;
                }
              }
            }

            // Interview within 24 hours — generate INTERVIEW_REMINDER
            if (hoursUntil > 0 && hoursUntil <= 24) {
              const reminderDateKey = scheduledDate.toISOString().split("T")[0];
              const reminderEventKey = `evt_INTERVIEW_REMINDER_${interview.id}_${reminderDateKey}`;
              const alreadyProcessed = await isEventProcessed(
                userUid,
                reminderEventKey,
              );
              if (!alreadyProcessed) {
                const app = interview.applicationId ? appMap.get(interview.applicationId) : undefined;
                try {
                  await publishDomainEvent(
                    eventCtx,
                    "INTERVIEW_REMINDER",
                    { type: "interview", id: interview.id },
                    {
                      interviewId: interview.id,
                      applicationId: interview.applicationId,
                      scheduledAt: interview.scheduledAt,
                      jobTitle: app?.jobTitle,
                      company: app?.company,
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
    } // end for userDoc
    } // end while hasMore

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
    });
  } catch (error) {
    console.error("[Scheduler] Processing error:", error);
    return NextResponse.json(
      { success: false, error: "Scheduler processing failed" },
      { status: 500 },
    );
  }
}
