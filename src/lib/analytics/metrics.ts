// ============================================================================
// CareerPilot AI — Core Analytics Metrics
// ============================================================================

import type { FirestoreApplication, ApplicationStatus } from "@/types";
import type { CoreMetrics, AnalyticsRange } from "./types";
import { safePct } from "./utils";

/** Filter applications by time range */
export function filterByRange(
  apps: FirestoreApplication[],
  range: AnalyticsRange,
): FirestoreApplication[] {
  if (range === "all") return apps;

  const now = new Date();
  const ms = parseRangeMs(range);
  const cutoff = new Date(now.getTime() - ms);

  return apps.filter((app) => {
    const date = app.createdAt || app.updatedAt;
    if (!date) return false;
    return new Date(date) >= cutoff;
  });
}

function parseRangeMs(range: AnalyticsRange): number {
  switch (range) {
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return 90 * 24 * 60 * 60 * 1000;
    case "all":
      return Infinity;
  }
}

// ---------------------------------------------------------------------------
// Core Metrics
// ---------------------------------------------------------------------------

const ALL_STATUSES: ApplicationStatus[] = [
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

export function calculateCoreMetrics(
  apps: FirestoreApplication[],
): CoreMetrics {
  const byStatus: Record<ApplicationStatus, number> = {} as Record<
    ApplicationStatus,
    number
  >;
  for (const s of ALL_STATUSES) {
    byStatus[s] = 0;
  }
  for (const app of apps) {
    byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;
  }

  const total = apps.length;
  const submitted = byStatus.applied;
  const responded =
    byStatus.screening +
    byStatus.assessment +
    byStatus.interview +
    byStatus.offer +
    byStatus.accepted +
    byStatus.rejected;

  return {
    totalApplications: total,
    applicationsByStatus: byStatus,
    submitted,
    screening: byStatus.screening,
    assessment: byStatus.assessment,
    interview: byStatus.interview,
    offer: byStatus.offer,
    accepted: byStatus.accepted,
    rejected: byStatus.rejected,
    withdrawn: byStatus.withdrawn,
    responseRate: safePct(responded, submitted),
    screeningRate: safePct(byStatus.screening, submitted),
    interviewRate: safePct(
      byStatus.interview + byStatus.offer + byStatus.accepted,
      submitted,
    ),
    offerRate: safePct(
      byStatus.offer + byStatus.accepted,
      submitted,
    ),
    acceptanceRate: safePct(byStatus.accepted, byStatus.offer + byStatus.accepted),
    rejectionRate: safePct(byStatus.rejected, total),
  };
}
