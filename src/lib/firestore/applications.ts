// ============================================================================
// CareerPilot AI — Applications Firestore Service
// ============================================================================
//
// Enhanced application lifecycle management with:
// - Duplicate application prevention
// - Server-controlled status transitions
// - Activity history logging
// - Notes management
//
// The analyses subcollection for versioned AI analysis results is preserved.
// ============================================================================

import {
  getDb,
  applicationsCol,
  analysesCol,
  newId,
  now,
} from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type {
  FirestoreApplication,
  FirestoreAnalysis,
  ApplicationCreateInput,
  ApplicationUpdateInput,
  MatchRecommendation,
  MatchEvidence,
  ApplicationStatus,
} from "@/types";
import {
  isValidTransition,
  deriveActivityType,
  deriveActivityMessage,
  calculateNextAction,
} from "@/lib/applications/state-machine";
import { createActivity } from "@/lib/applications/activity";
import { publishDomainEvent, type EventContext } from "@/lib/events/publisher";
import type { DomainEventType } from "@/types";

// ---------------------------------------------------------------------------
// Application creation (with duplicate protection)
// ---------------------------------------------------------------------------

export async function createApplication(
  uid: string,
  input: ApplicationCreateInput,
): Promise<FirestoreApplication> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const nowStr = now();

    // Check for duplicate application (same user + same job)
    const existingSnap = await applicationsCol(db, uid)
      .where("jobId", "==", input.jobId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      // Return existing application instead of creating a duplicate
      return existingSnap.docs[0].data() as FirestoreApplication;
    }

    const id = newId(db, uid, "applications");
    const initialStatus: ApplicationStatus = input.initialStatus ?? "saved";

    // Calculate initial next action
    const nextAction = calculateNextAction(initialStatus, {
      deadline: input.deadline ?? null,
      followUpDate: null,
      interviewDate: null,
      nextActionAt: null,
    });

    const app: FirestoreApplication = {
      id,
      jobId: input.jobId,
      jobTitle: input.jobTitle,
      company: input.company,
      status: initialStatus,
      resumeId: input.resumeId ?? null,
      appliedAt: initialStatus === "applied" ? nowStr : null,
      deadline: input.deadline ?? null,
      source: input.source ?? "manual",
      applicationUrl: input.applicationUrl ?? null,
      nextAction: nextAction.action,
      nextActionAt: nextAction.date,
      followUpDate: null,
      currentAnalysisId: null,
      matchAnalysisId: null,
      priorityId: null,
      interviewIds: [],
      notes: input.notes ?? "",
      archived: false,
      lastUpdatedAt: nowStr,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await applicationsCol(db, uid).doc(id).set(app);

    // Create activity event
    await createActivity(uid, id, {
      type: "APPLICATION_CREATED",
      previousStatus: null,
      newStatus: initialStatus,
      message: `Application created for ${input.jobTitle} at ${input.company}`,
      metadata: { jobId: input.jobId },
    });

    // Publish domain event (fire-and-forget — don't block on event failure)
    const eventCtx: EventContext = { userId: uid };
    publishDomainEvent(
      eventCtx,
      "APPLICATION_CREATED",
      { type: "application", id },
      {
        applicationId: id,
        jobId: input.jobId,
        newStatus: initialStatus,
        jobTitle: input.jobTitle,
        company: input.company,
      },
    ).catch((err) =>
      console.error("[Applications] Failed to publish APPLICATION_CREATED event:", err),
    );

    // If applied immediately, also log submission and publish event
    if (initialStatus === "applied") {
      await createActivity(uid, id, {
        type: "APPLICATION_SUBMITTED",
        previousStatus: "saved",
        newStatus: "applied",
        message: "Application submitted",
      });

      publishDomainEvent(
        eventCtx,
        "APPLICATION_SUBMITTED",
        { type: "application", id },
        {
          applicationId: id,
          jobId: input.jobId,
          previousStatus: "saved",
          newStatus: "applied",
          jobTitle: input.jobTitle,
          company: input.company,
        },
      ).catch((err) =>
        console.error("[Applications] Failed to publish APPLICATION_SUBMITTED event:", err),
      );
    }

    return app;
  });
}

// ---------------------------------------------------------------------------
// Get applications
// ---------------------------------------------------------------------------

export async function getApplications(uid: string): Promise<FirestoreApplication[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await applicationsCol(db, uid).orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => doc.data() as FirestoreApplication);
  });
}

export async function getApplication(
  uid: string,
  applicationId: string,
): Promise<FirestoreApplication | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await applicationsCol(db, uid).doc(applicationId).get();
    return snap.exists ? (snap.data() as FirestoreApplication) : null;
  });
}

// ---------------------------------------------------------------------------
// Update application (non-status fields only)
// ---------------------------------------------------------------------------

export async function updateApplication(
  uid: string,
  applicationId: string,
  data: ApplicationUpdateInput,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const updateData: Record<string, unknown> = { updatedAt: now() };

    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.deadline !== undefined) updateData.deadline = data.deadline;
    if (data.followUpDate !== undefined) {
      updateData.followUpDate = data.followUpDate;
      // Recalculate next action with new follow-up date
      const appSnap = await applicationsCol(db, uid).doc(applicationId).get();
      if (appSnap.exists) {
        const app = appSnap.data() as FirestoreApplication;
        const nextAction = calculateNextAction(app.status, {
          deadline: app.deadline,
          followUpDate: data.followUpDate,
          interviewDate: null,
          nextActionAt: app.nextActionAt,
        });
        updateData.nextAction = nextAction.action;
        updateData.nextActionAt = nextAction.date;
      }
    }
    if (data.applicationUrl !== undefined) updateData.applicationUrl = data.applicationUrl;
    if (data.source !== undefined) updateData.source = data.source;

    updateData.lastUpdatedAt = now();

    await applicationsCol(db, uid).doc(applicationId).update(updateData);
  });
}

// ---------------------------------------------------------------------------
// Server-controlled status change
// ---------------------------------------------------------------------------

export async function changeApplicationStatus(
  uid: string,
  applicationId: string,
  newStatus: ApplicationStatus,
  message: string = "",
): Promise<FirestoreApplication> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const nowStr = now();

    // Load existing application
    const appSnap = await applicationsCol(db, uid).doc(applicationId).get();
    if (!appSnap.exists) {
      throw new ApplicationError("Application not found", "NOT_FOUND");
    }

    const app = appSnap.data() as FirestoreApplication;
    const previousStatus = app.status;

    // Validate transition
    if (!isValidTransition(previousStatus, newStatus)) {
      throw new ApplicationError(
        `Invalid transition: ${previousStatus} → ${newStatus}`,
        "INVALID_TRANSITION",
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: newStatus,
      lastUpdatedAt: nowStr,
      updatedAt: nowStr,
    };

    // Set appliedAt when transitioning to applied
    if (newStatus === "applied" && !app.appliedAt) {
      updateData.appliedAt = nowStr;
    }

    // Calculate next action
    const nextAction = calculateNextAction(newStatus, {
      deadline: app.deadline,
      followUpDate: app.followUpDate,
      interviewDate: null,
      nextActionAt: app.nextActionAt,
    });
    updateData.nextAction = nextAction.action;
    updateData.nextActionAt = nextAction.date;

    // Update application
    await applicationsCol(db, uid).doc(applicationId).update(updateData);

    // Create activity event (server-controlled timestamps and types)
    const activityType = deriveActivityType(previousStatus, newStatus);
    const activityMessage = message || deriveActivityMessage(previousStatus, newStatus);

    await createActivity(uid, applicationId, {
      type: activityType as Parameters<typeof createActivity>[2]["type"],
      previousStatus,
      newStatus,
      message: activityMessage,
      metadata: { transition: `${previousStatus} → ${newStatus}` },
    });

    // Publish domain events (fire-and-forget)
    const eventCtx: EventContext = { userId: uid };
    publishDomainEvent(
      eventCtx,
      "APPLICATION_STATUS_CHANGED",
      { type: "application", id: applicationId },
      {
        applicationId,
        jobId: app.jobId,
        previousStatus,
        newStatus,
        jobTitle: app.jobTitle,
        company: app.company,
      },
    ).catch((err) =>
      console.error("[Applications] Failed to publish APPLICATION_STATUS_CHANGED event:", err),
    );

    // Publish terminal-state-specific events
    const terminalEvents: Partial<Record<ApplicationStatus, DomainEventType>> = {
      offer: "OFFER_RECEIVED",
      rejected: "APPLICATION_REJECTED",
      withdrawn: "APPLICATION_WITHDRAWN",
    };
    const specificEvent = terminalEvents[newStatus];
    if (specificEvent) {
      publishDomainEvent(
        eventCtx,
        specificEvent,
        { type: "application", id: applicationId },
        {
          applicationId,
          jobId: app.jobId,
          previousStatus,
          newStatus,
          jobTitle: app.jobTitle,
          company: app.company,
        },
      ).catch((err) =>
        console.error(`[Applications] Failed to publish ${specificEvent} event:`, err),
      );
    }

    // Return updated application
    const updatedSnap = await applicationsCol(db, uid).doc(applicationId).get();
    return updatedSnap.data() as FirestoreApplication;
  });
}

// ---------------------------------------------------------------------------
// Add note
// ---------------------------------------------------------------------------

export async function addNote(
  uid: string,
  applicationId: string,
  note: string,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const nowStr = now();

    // Append note to existing notes
    const appSnap = await applicationsCol(db, uid).doc(applicationId).get();
    if (!appSnap.exists) {
      throw new ApplicationError("Application not found", "NOT_FOUND");
    }

    const app = appSnap.data() as FirestoreApplication;
    const timestamp = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const newNotes = app.notes
      ? `${app.notes}\n\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;

    await applicationsCol(db, uid).doc(applicationId).update({
      notes: newNotes,
      lastUpdatedAt: nowStr,
      updatedAt: nowStr,
    });

    // Create note activity
    await createActivity(uid, applicationId, {
      type: "NOTE_ADDED",
      previousStatus: null,
      newStatus: null,
      message: note,
    });
  });
}

// ---------------------------------------------------------------------------
// Delete application
// ---------------------------------------------------------------------------

export async function deleteApplication(
  uid: string,
  applicationId: string,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await applicationsCol(db, uid).doc(applicationId).delete();
  });
}

// ---------------------------------------------------------------------------
// Analyses (subcollection under application) — preserved from original
// ---------------------------------------------------------------------------

export async function createAnalysis(
  uid: string,
  applicationId: string,
  data: {
    model: string;
    promptVersion: string;
    overallScore: number;
    skillScore: number;
    experienceScore: number;
    educationScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    evidence: MatchEvidence[];
    recommendation: MatchRecommendation;
  },
): Promise<FirestoreAnalysis> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "analyses");
    const nowStr = now();

    const analysis: FirestoreAnalysis = {
      id,
      ...data,
      createdAt: nowStr,
    };

    await analysesCol(db, uid, applicationId).doc(id).set(analysis);

    await applicationsCol(db, uid).doc(applicationId).update({
      currentAnalysisId: id,
      matchAnalysisId: id,
      updatedAt: nowStr,
    });

    return analysis;
  });
}

export async function getAnalyses(
  uid: string,
  applicationId: string,
): Promise<FirestoreAnalysis[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await analysesCol(db, uid, applicationId)
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((doc) => doc.data() as FirestoreAnalysis);
  });
}

export async function getAnalysis(
  uid: string,
  applicationId: string,
  analysisId: string,
): Promise<FirestoreAnalysis | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await analysesCol(db, uid, applicationId).doc(analysisId).get();
    return snap.exists ? (snap.data() as FirestoreAnalysis) : null;
  });
}

export async function getCurrentAnalysis(
  uid: string,
  applicationId: string,
): Promise<FirestoreAnalysis | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const appSnap = await applicationsCol(db, uid).doc(applicationId).get();
    if (!appSnap.exists) return null;

    const appData = appSnap.data() as FirestoreApplication;
    if (!appData.currentAnalysisId) return null;

    const analysisSnap = await analysesCol(db, uid, applicationId)
      .doc(appData.currentAnalysisId)
      .get();

    return analysisSnap.exists
      ? (analysisSnap.data() as FirestoreAnalysis)
      : null;
  });
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
