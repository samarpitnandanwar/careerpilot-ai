// ============================================================================
// CareerPilot AI — Insight Engine
// ============================================================================

import type { FirestoreApplication } from "@/types";
import type {
  Insight,
  CoreMetrics,
  MatchScoreBucket,
  PriorityAnalysis,
  FunnelStage,
} from "./types";
import { MIN_SAMPLE_SIZE } from "./utils";

// ---------------------------------------------------------------------------
// Insight Generator
// ---------------------------------------------------------------------------

let _insightCounter = 0;
function insightId(): string {
  _insightCounter++;
  return `insight_${_insightCounter}`;
}

/**
 * Generate deterministic insights from analytics data.
 * No Gemini — purely algorithmic.
 */
export function generateInsights(params: {
  core: CoreMetrics;
  funnel: FunnelStage[];
  matchBuckets: MatchScoreBucket[];
  priorityAnalysis: PriorityAnalysis[];
  apps: FirestoreApplication[];
  allApps: FirestoreApplication[];
  upcomingInterviews: number;
  dueFollowUps: number;
  upcomingDeadlines: number;
  highPriorityCount: number;
}): Insight[] {
  const insights: Insight[] = [];
  _insightCounter = 0;

  const {
    core,
    funnel,
    matchBuckets,
    priorityAnalysis,
    apps,
    upcomingInterviews,
    dueFollowUps,
    upcomingDeadlines,
    highPriorityCount,
  } = params;

  // --- Milestone insights ---
  if (core.totalApplications >= 10) {
    insights.push({
      id: insightId(),
      type: "MILESTONE",
      title: `${core.totalApplications} applications submitted`,
      description: `You've submitted ${core.totalApplications} applications. Keep the momentum going.`,
      severity: "positive",
      evidence: { total: core.totalApplications },
    });
  }

  if (core.interview > 0) {
    insights.push({
      id: insightId(),
      type: "MILESTONE",
      title: `${core.interview} interview${core.interview > 1 ? "s" : ""} secured`,
      description: `You've secured ${core.interview} interview${core.interview > 1 ? "s" : ""} from ${core.totalApplications} applications.`,
      severity: "positive",
      evidence: { interviews: core.interview, total: core.totalApplications },
    });
  }

  if (core.offer > 0 || core.accepted > 0) {
    const offers = core.offer + core.accepted;
    insights.push({
      id: insightId(),
      type: "MILESTONE",
      title: `${offers} offer${offers > 1 ? "s" : ""} received`,
      description: `Congratulations! You've received ${offers} offer${offers > 1 ? "s" : ""}.`,
      severity: "positive",
      evidence: { offers },
    });
  }

  // --- Positive patterns ---
  if (core.interviewRate >= 30 && core.totalApplications >= MIN_SAMPLE_SIZE) {
    insights.push({
      id: insightId(),
      type: "POSITIVE_PATTERN",
      title: "Strong interview conversion rate",
      description: `Your interview rate of ${core.interviewRate}% is above the typical 15-25% range. Your application strategy appears effective.`,
      severity: "positive",
      evidence: {
        interviewRate: core.interviewRate,
        applications: core.totalApplications,
      },
    });
  }

  // Match score pattern
  const highMatchBucket = matchBuckets.find((b) => b.min >= 85);
  if (
    highMatchBucket &&
    highMatchBucket.interviews > 0 &&
    highMatchBucket.applications >= 3
  ) {
    const rate = Math.round(
      (highMatchBucket.interviews / highMatchBucket.applications) * 100,
    );
    insights.push({
      id: insightId(),
      type: "POSITIVE_PATTERN",
      title: "Higher-match jobs are converting better",
      description: `Jobs with 85+ match scores produced ${highMatchBucket.interviews} interviews from ${highMatchBucket.applications} applications (${rate}% rate).`,
      severity: "positive",
      evidence: {
        matchThreshold: 85,
        applications: highMatchBucket.applications,
        interviews: highMatchBucket.interviews,
      },
    });
  }

  // Priority pattern
  const highPriority = priorityAnalysis.find((p) => p.level === "HIGH");
  if (
    highPriority &&
    highPriority.interviews > 0 &&
    highPriority.applications >= 3
  ) {
    insights.push({
      id: insightId(),
      type: "POSITIVE_PATTERN",
      title: "High-priority jobs are performing well",
      description: `HIGH priority applications have produced ${highPriority.interviews} interviews from ${highPriority.applications} applications.`,
      severity: "positive",
      evidence: {
        level: "HIGH",
        applications: highPriority.applications,
        interviews: highPriority.interviews,
      },
    });
  }

  // --- Warnings ---
  if (core.rejectionRate > 60 && core.totalApplications >= MIN_SAMPLE_SIZE) {
    insights.push({
      id: insightId(),
      type: "WARNING",
      title: "High rejection rate",
      description: `${core.rejectionRate}% of your applications have been rejected. Consider reviewing match scores before applying.`,
      severity: "warning",
      evidence: {
        rejectionRate: core.rejectionRate,
        rejected: core.rejected,
        total: core.totalApplications,
      },
    });
  }

  if (
    core.responseRate < 20 &&
    core.submitted >= MIN_SAMPLE_SIZE
  ) {
    insights.push({
      id: insightId(),
      type: "WARNING",
      title: "Low response rate",
      description: `Only ${core.responseRate}% of submitted applications have received a response. Consider improving your resume or targeting better-match roles.`,
      severity: "warning",
      evidence: {
        responseRate: core.responseRate,
        submitted: core.submitted,
      },
    });
  }

  // --- Action required ---
  if (dueFollowUps > 0) {
    insights.push({
      id: insightId(),
      type: "ACTION_REQUIRED",
      title: `${dueFollowUps} follow-up${dueFollowUps > 1 ? "s" : ""} due`,
      description: `You have ${dueFollowUps} application${dueFollowUps > 1 ? "s" : ""} with follow-up dates that have arrived.`,
      severity: "action",
      evidence: { count: dueFollowUps },
      actionLabel: "View Applications",
      actionHref: "/applications",
    });
  }

  if (upcomingInterviews > 0) {
    insights.push({
      id: insightId(),
      type: "ACTION_REQUIRED",
      title: `${upcomingInterviews} interview${upcomingInterviews > 1 ? "s" : ""} upcoming`,
      description: `You have ${upcomingInterviews} interview${upcomingInterviews > 1 ? "s" : ""} scheduled. Time to prepare.`,
      severity: "action",
      evidence: { count: upcomingInterviews },
      actionLabel: "Prepare Interview",
      actionHref: "/interview",
    });
  }

  if (upcomingDeadlines > 0) {
    insights.push({
      id: insightId(),
      type: "ACTION_REQUIRED",
      title: `${upcomingDeadlines} deadline${upcomingDeadlines > 1 ? "s" : ""} approaching`,
      description: `You have ${upcomingDeadlines} application deadline${upcomingDeadlines > 1 ? "s" : ""} coming up soon.`,
      severity: "warning",
      evidence: { count: upcomingDeadlines },
      actionLabel: "View Applications",
      actionHref: "/applications",
    });
  }

  if (highPriorityCount > 0) {
    insights.push({
      id: insightId(),
      type: "OPPORTUNITY",
      title: `${highPriorityCount} high-priority application${highPriorityCount > 1 ? "s" : ""}`,
      description: `You have ${highPriorityCount} HIGH or CRITICAL priority jobs that deserve attention.`,
      severity: "info",
      evidence: { count: highPriorityCount },
      actionLabel: "View Priority Jobs",
      actionHref: "/jobs",
    });
  }

  // --- Trend insights ---
  if (core.totalApplications >= 10) {
    const recentApps = apps.filter((a) => {
      const d = new Date(a.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    });

    if (recentApps.length === 0 && core.totalApplications > 0) {
      insights.push({
        id: insightId(),
        type: "TREND",
        title: "Application volume has dropped",
        description:
          "No applications submitted in the last 7 days. Consider applying to new opportunities.",
        severity: "warning",
        evidence: { recentCount: 0, totalApps: core.totalApplications },
        actionLabel: "Browse Jobs",
        actionHref: "/jobs",
      });
    }
  }

  // Funnel insight
  const screeningStage = funnel.find((s) => s.stage === "Screening");
  if (
    screeningStage &&
    screeningStage.conversionFromPrevious < 30 &&
    screeningStage.count >= 3
  ) {
    insights.push({
      id: insightId(),
      type: "WARNING",
      title: "Low screening conversion",
      description: `Only ${screeningStage.conversionFromPrevious}% of applied applications move to screening. Your resume or targeting may need adjustment.`,
      severity: "warning",
      evidence: {
        screeningConversion: screeningStage.conversionFromPrevious,
        applied: screeningStage.count,
      },
    });
  }

  return insights;
}
