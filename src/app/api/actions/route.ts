// ============================================================================
// CareerPilot AI — Actions API
// ============================================================================

import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api-helpers";
import {
  getActions,
  expireActions,
  reconcileUserActions,
  type ReconcileInput,
} from "@/lib/actions";
import type { ActionStatus } from "@/lib/actions";
import { getDb } from "@/lib/firestore/db";
import type {
  FirestoreApplication,
  FirestoreInterview,
  FirestoreJobPriority,
} from "@/types";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const uid = user.uid;
  const url = new URL(request.url);

  // Parse query parameters
  const statusParam = url.searchParams.get("status");
  const status = statusParam && ["OPEN", "COMPLETED", "DISMISSED", "EXPIRED"].includes(statusParam)
    ? (statusParam as ActionStatus)
    : undefined;

  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const orderByParam = url.searchParams.get("orderBy");
  const orderBy = orderByParam && ["priority", "dueAt", "createdAt"].includes(orderByParam)
    ? (orderByParam as "priority" | "dueAt" | "createdAt")
    : "createdAt";

  try {
    const db = getDb();

    // Expire any overdue actions first
    await expireActions(uid);

    // Run reconciliation to ensure all actionable items have actions
    const reconcileInput: ReconcileInput = {
      uid,
      applications: [],
      interviews: [],
      priorityScores: new Map<string, FirestoreJobPriority>(),
    };

    // Load applications
    try {
      const appsSnap = await db
        .collection("users")
        .doc(uid)
        .collection("applications")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      reconcileInput.applications = appsSnap.docs.map(
        (doc) => doc.data() as FirestoreApplication,
      );
    } catch {
      // If applications query fails, continue with empty array
    }

    // Load interviews
    try {
      const intSnap = await db
        .collection("users")
        .doc(uid)
        .collection("interviews")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      reconcileInput.interviews = intSnap.docs.map(
        (doc) => doc.data() as FirestoreInterview,
      );
    } catch {
      // If interviews query fails, continue with empty array
    }

    // Load latest priority scores for each job
    try {
      const jobIds = new Set(reconcileInput.applications.map((a) => a.jobId));
      for (const jobId of jobIds) {
        try {
          const prioritySnap = await db
            .collection("users")
            .doc(uid)
            .collection("jobs")
            .doc(jobId)
            .collection("priority")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          if (!prioritySnap.empty) {
            reconcileInput.priorityScores.set(
              jobId,
              prioritySnap.docs[0].data() as FirestoreJobPriority,
            );
          }
        } catch {
          // Skip individual job priority failures
        }
      }
    } catch {
      // If priority query fails, continue with empty map
    }

    // Reconcile (idempotent — won't create duplicates)
    try {
      await reconcileUserActions(reconcileInput);
    } catch {
      // Don't fail the entire request if reconciliation fails
      // The actions endpoint should still return existing actions
    }

    const actions = await getActions(uid, { status, limit, orderBy });

    return NextResponse.json({ success: true, data: actions });
  } catch (error) {
    console.error("[Actions] Error:", error);
    return jsonError("Failed to load actions", 500);
  }
}
