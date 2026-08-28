// ============================================================================
// CareerPilot AI — Trend Calculator
// ============================================================================

import type { FirestoreApplication } from "@/types";
import type { TrendMetrics, TrendPoint, AnalyticsRange } from "./types";

// ---------------------------------------------------------------------------
// Group applications by time period
// ---------------------------------------------------------------------------

/**
 * Group applications into time buckets based on the selected range.
 * Returns current and previous period data for comparison.
 */
export function calculateTrends(
  apps: FirestoreApplication[],
  range: AnalyticsRange,
): TrendMetrics {
  const now = new Date();
  const periodMs = getRangeMs(range);
  const currentStart = new Date(now.getTime() - periodMs);
  const previousStart = new Date(currentStart.getTime() - periodMs);

  const current = apps.filter((a) => {
    const d = new Date(a.createdAt);
    return d >= currentStart && d <= now;
  });

  const previous = apps.filter((a) => {
    const d = new Date(a.createdAt);
    return d >= previousStart && d < currentStart;
  });

  const currentPoints = bucketByPeriod(current, range, now);
  const previousPoints = bucketByPeriod(previous, range, currentStart);

  // Only show comparison if both periods have data
  const comparisonAvailable =
    currentPoints.some((p) => p.applications > 0) &&
    previousPoints.some((p) => p.applications > 0);

  return {
    current: currentPoints,
    previous: previousPoints,
    comparisonAvailable,
  };
}

// ---------------------------------------------------------------------------
// Bucket applications by time period
// ---------------------------------------------------------------------------

function bucketByPeriod(
  apps: FirestoreApplication[],
  range: AnalyticsRange,
  endDate: Date,
): TrendPoint[] {
  const buckets: TrendPoint[] = [];

  if (range === "7d") {
    // Last 7 days — one point per day
    for (let i = 6; i >= 0; i--) {
      const day = new Date(endDate);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      const label = day.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const dayApps = apps.filter(
        (a) => a.createdAt && a.createdAt.split("T")[0] === dayStr,
      );
      buckets.push({
        label,
        applications: dayApps.length,
        interviews: dayApps.filter(
          (a) =>
            a.status === "interview" ||
            a.status === "offer" ||
            a.status === "accepted",
        ).length,
        offers: dayApps.filter(
          (a) => a.status === "offer" || a.status === "accepted",
        ).length,
      });
    }
  } else if (range === "30d") {
    // Last 30 days — one point per week
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(endDate);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const label = `Week ${4 - i}`;
      const weekApps = apps.filter((a) => {
        const d = new Date(a.createdAt);
        return d >= weekStart && d < weekEnd;
      });
      buckets.push({
        label,
        applications: weekApps.length,
        interviews: weekApps.filter(
          (a) =>
            a.status === "interview" ||
            a.status === "offer" ||
            a.status === "accepted",
        ).length,
        offers: weekApps.filter(
          (a) => a.status === "offer" || a.status === "accepted",
        ).length,
      });
    }
  } else if (range === "90d") {
    // Last 90 days — one point per month
    for (let i = 2; i >= 0; i--) {
      const monthEnd = new Date(endDate);
      monthEnd.setMonth(monthEnd.getMonth() - i);
      const monthStart = new Date(monthEnd);
      monthStart.setMonth(monthStart.getMonth() - 1);
      const label = monthEnd.toLocaleDateString("en-US", {
        month: "short",
      });
      const monthApps = apps.filter((a) => {
        const d = new Date(a.createdAt);
        return d >= monthStart && d < monthEnd;
      });
      buckets.push({
        label,
        applications: monthApps.length,
        interviews: monthApps.filter(
          (a) =>
            a.status === "interview" ||
            a.status === "offer" ||
            a.status === "accepted",
        ).length,
        offers: monthApps.filter(
          (a) => a.status === "offer" || a.status === "accepted",
        ).length,
      });
    }
  } else {
    // All time — group by month
    const monthMap = new Map<string, FirestoreApplication[]>();
    for (const app of apps) {
      const month = app.createdAt
        ? new Date(app.createdAt).toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          })
        : "Unknown";
      const list = monthMap.get(month) ?? [];
      list.push(app);
      monthMap.set(month, list);
    }

    // Take last 6 months
    const entries = Array.from(monthMap.entries()).slice(-6);
    for (const [label, monthApps] of entries) {
      buckets.push({
        label,
        applications: monthApps.length,
        interviews: monthApps.filter(
          (a) =>
            a.status === "interview" ||
            a.status === "offer" ||
            a.status === "accepted",
        ).length,
        offers: monthApps.filter(
          (a) => a.status === "offer" || a.status === "accepted",
        ).length,
      });
    }
  }

  return buckets;
}

function getRangeMs(range: AnalyticsRange): number {
  switch (range) {
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return 90 * 24 * 60 * 60 * 1000;
    case "all":
      return 365 * 24 * 60 * 60 * 1000; // 1 year for "all"
  }
}
