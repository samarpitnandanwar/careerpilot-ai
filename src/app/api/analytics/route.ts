// ============================================================================
// CareerPilot AI — Analytics API
// ============================================================================

import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api-helpers";
import { getDb } from "@/lib/firestore/db";
import { getApplications } from "@/lib/firestore/applications";
import { getInterviews } from "@/lib/firestore/interviews";
import { aggregateAnalytics } from "@/lib/analytics";
import { AnalyticsRangeSchema } from "@/lib/analytics/types";
import type {
  FirestoreJobAnalysis,
  FirestoreJobPriority,
  ApplicationActivity,
} from "@/types";

export async function GET(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const uid = user.uid;
  const db = getDb();

  // Parse range query parameter
  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range") ?? "all";
  const rangeResult = AnalyticsRangeSchema.safeParse(rangeParam);
  if (!rangeResult.success) {
    return jsonError("Invalid range. Use: 7d, 30d, 90d, or all", 400);
  }
  const range = rangeResult.data;

  try {
    // Load all user data in parallel
    const [applications, interviews] = await Promise.all([
      getApplications(uid),
      getInterviews(uid),
    ]);

    // Load analyses from all jobs
    const analyses: FirestoreJobAnalysis[] = [];
    const jobIds = [...new Set(applications.map((a) => a.jobId))];
    for (const jobId of jobIds) {
      const analysesSnap = await db
        .collection("users")
        .doc(uid)
        .collection("jobs")
        .doc(jobId)
        .collection("analyses")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      for (const doc of analysesSnap.docs) {
        analyses.push(doc.data() as FirestoreJobAnalysis);
      }
    }

    // Load priorities from all jobs
    const priorities: FirestoreJobPriority[] = [];
    for (const jobId of jobIds) {
      const prioSnap = await db
        .collection("users")
        .doc(uid)
        .collection("jobs")
        .doc(jobId)
        .collection("priority")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      for (const doc of prioSnap.docs) {
        priorities.push(doc.data() as FirestoreJobPriority);
      }
    }

    // Load activities from all applications
    const activities: ApplicationActivity[] = [];
    for (const app of applications) {
      const actSnap = await db
        .collection("users")
        .doc(uid)
        .collection("applications")
        .doc(app.id)
        .collection("activities")
        .orderBy("timestamp", "asc")
        .get();
      for (const doc of actSnap.docs) {
        activities.push(doc.data() as ApplicationActivity);
      }
    }

    // Aggregate analytics
    const summary = aggregateAnalytics({
      applications,
      analyses,
      priorities,
      interviews,
      activities,
      range,
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return jsonError("Failed to generate analytics", 500);
  }
}
