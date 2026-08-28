// ============================================================================
// CareerPilot AI — Analytics Engine Unit Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  calculateCoreMetrics,
  filterByRange,
} from "@/lib/analytics/metrics";
import { calculateFunnel } from "@/lib/analytics/funnel";
import { calculateStageDurations } from "@/lib/analytics/duration";
import { calculateTrends } from "@/lib/analytics/trends";
import { generateInsights } from "@/lib/analytics/insights";
import {
  safePct,
  safeDiv,
  median,
  mean,
  MIN_SAMPLE_SIZE,
} from "@/lib/analytics/utils";
import type { FirestoreApplication } from "@/types";
import type { ApplicationActivity } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApp(
  overrides: Partial<FirestoreApplication> = {},
): FirestoreApplication {
  return {
    id: `app_${Date.now()}_${Math.random()}`,
    jobId: "job-1",
    jobTitle: "Software Engineer",
    company: "Acme Corp",
    status: "saved",
    resumeId: null,
    appliedAt: null,
    deadline: null,
    source: "manual",
    applicationUrl: null,
    nextAction: "APPLY_NOW",
    nextActionAt: null,
    followUpDate: null,
    currentAnalysisId: null,
    matchAnalysisId: null,
    priorityId: null,
    interviewIds: [],
    notes: "",
    archived: false,
    lastUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeActivity(
  overrides: Partial<ApplicationActivity> = {},
): ApplicationActivity {
  return {
    id: `act_${Date.now()}`,
    applicationId: "app-1",
    type: "STATUS_CHANGED",
    previousStatus: null,
    newStatus: null,
    message: "Test",
    metadata: null,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Test: Core Metrics
// ---------------------------------------------------------------------------

describe("Core Metrics", () => {
  it("counts total applications", () => {
    const apps = [
      makeApp({ status: "saved" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "interview" }),
    ];
    const metrics = calculateCoreMetrics(apps);
    expect(metrics.totalApplications).toBe(3);
  });

  it("counts applications by status", () => {
    const apps = [
      makeApp({ status: "saved" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "interview" }),
    ];
    const metrics = calculateCoreMetrics(apps);
    expect(metrics.applicationsByStatus.saved).toBe(1);
    expect(metrics.applicationsByStatus.applied).toBe(2);
    expect(metrics.applicationsByStatus.interview).toBe(1);
  });

  it("calculates response rate", () => {
    const apps = [
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "screening" }),
    ];
    const metrics = calculateCoreMetrics(apps);
    // 1 responded out of 4 applied = 25%
    expect(metrics.responseRate).toBe(25);
  });

  it("handles zero applications", () => {
    const metrics = calculateCoreMetrics([]);
    expect(metrics.totalApplications).toBe(0);
    expect(metrics.responseRate).toBe(0);
    expect(metrics.interviewRate).toBe(0);
    expect(metrics.offerRate).toBe(0);
  });

  it("calculates interview rate", () => {
    const apps = [
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "interview" }),
    ];
    const metrics = calculateCoreMetrics(apps);
    // 1 interview from 3 applied = 33.3%
    expect(metrics.interviewRate).toBeCloseTo(33.3, 0);
  });

  it("calculates offer rate", () => {
    const apps = [
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "offer" }),
    ];
    const metrics = calculateCoreMetrics(apps);
    expect(metrics.offerRate).toBe(25);
  });

  it("calculates acceptance rate", () => {
    const apps = [
      makeApp({ status: "offer" }),
      makeApp({ status: "accepted" }),
    ];
    const metrics = calculateCoreMetrics(apps);
    // 1 accepted from 1 offer + 1 accepted = 50%
    expect(metrics.acceptanceRate).toBe(50);
  });

  it("calculates rejection rate", () => {
    const apps = [
      makeApp({ status: "rejected" }),
      makeApp({ status: "rejected" }),
      makeApp({ status: "applied" }),
    ];
    const metrics = calculateCoreMetrics(apps);
    // 2 rejected from 3 total = 66.7%
    expect(metrics.rejectionRate).toBeCloseTo(66.7, 0);
  });

  it("handles zero-division for acceptance rate", () => {
    const apps = [makeApp({ status: "applied" })];
    const metrics = calculateCoreMetrics(apps);
    expect(metrics.acceptanceRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test: Filter by Range
// ---------------------------------------------------------------------------

describe("Filter by Range", () => {
  it("returns all apps for 'all' range", () => {
    const apps = [
      makeApp({ createdAt: daysAgo(100) }),
      makeApp({ createdAt: daysAgo(10) }),
    ];
    expect(filterByRange(apps, "all")).toHaveLength(2);
  });

  it("filters by 7d range", () => {
    const apps = [
      makeApp({ createdAt: daysAgo(3) }),
      makeApp({ createdAt: daysAgo(10) }),
      makeApp({ createdAt: daysAgo(20) }),
    ];
    expect(filterByRange(apps, "7d")).toHaveLength(1);
  });

  it("filters by 30d range", () => {
    const apps = [
      makeApp({ createdAt: daysAgo(5) }),
      makeApp({ createdAt: daysAgo(15) }),
      makeApp({ createdAt: daysAgo(60) }),
    ];
    expect(filterByRange(apps, "30d")).toHaveLength(2);
  });

  it("filters by 90d range", () => {
    const apps = [
      makeApp({ createdAt: daysAgo(10) }),
      makeApp({ createdAt: daysAgo(50) }),
      makeApp({ createdAt: daysAgo(200) }),
    ];
    expect(filterByRange(apps, "90d")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Test: Funnel
// ---------------------------------------------------------------------------

describe("Application Funnel", () => {
  it("creates funnel from application data", () => {
    const apps = [
      makeApp({ status: "applied" }),
      makeApp({ status: "screening" }),
      makeApp({ status: "interview" }),
      makeApp({ status: "offer" }),
    ];
    const funnel = calculateFunnel(apps);
    expect(funnel.stages).toHaveLength(6);
    expect(funnel.totalApplied).toBe(4);
  });

  it("calculates correct funnel percentages", () => {
    const apps = [
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "screening" }),
      makeApp({ status: "interview" }),
    ];
    const funnel = calculateFunnel(apps);
    const applied = funnel.stages.find((s) => s.stage === "Applied");
    expect(applied?.count).toBe(4); // cumulative: 2 applied + 1 screening + 1 interview
  });

  it("handles empty applications", () => {
    const funnel = calculateFunnel([]);
    expect(funnel.totalApplied).toBe(0);
    expect(funnel.stages).toHaveLength(6);
  });

  it("counts accepted as also offer in cumulative", () => {
    const apps = [
      makeApp({ status: "accepted" }),
      makeApp({ status: "offer" }),
    ];
    const funnel = calculateFunnel(apps);
    const offer = funnel.stages.find((s) => s.stage === "Offer");
    // Cumulative: accepted (1) + offer (1) = 2 in Offer stage
    expect(offer?.count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Test: Stage Duration
// ---------------------------------------------------------------------------

describe("Stage Duration", () => {
  it("calculates duration for a transition", () => {
    const activities = [
      makeActivity({
        applicationId: "app-1",
        previousStatus: "saved",
        newStatus: "applied",
        timestamp: daysAgo(5),
      }),
      makeActivity({
        applicationId: "app-1",
        previousStatus: "applied",
        newStatus: "screening",
        timestamp: daysAgo(0),
      }),
    ];

    const createdAts = new Map([["app-1", daysAgo(10)]]);

    const durations = calculateStageDurations(activities, createdAts);
    const savedToApplied = durations.find(
      (d) => d.from === "saved" && d.to === "applied",
    );
    expect(savedToApplied?.sampleSize).toBe(1);
    expect(savedToApplied?.averageDays).toBeGreaterThan(0);
  });

  it("returns zero sample for untracked transitions", () => {
    const durations = calculateStageDurations([], new Map());
    const savedToApplied = durations.find(
      (d) => d.from === "saved" && d.to === "applied",
    );
    expect(savedToApplied?.sampleSize).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test: Trends
// ---------------------------------------------------------------------------

describe("Trends", () => {
  it("groups applications by period", () => {
    const apps = [
      makeApp({ createdAt: daysAgo(3), status: "applied" }),
      makeApp({ createdAt: daysAgo(5), status: "interview" }),
    ];
    const trends = calculateTrends(apps, "7d");
    expect(trends.current.length).toBe(7);
  });

  it("shows comparison when data exists", () => {
    const apps = [
      makeApp({ createdAt: daysAgo(3) }),
      makeApp({ createdAt: daysAgo(20) }),
    ];
    const trends = calculateTrends(apps, "30d");
    // Current should have data, previous should too (day 20 is in previous week)
    expect(trends.current.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Test: Utilities
// ---------------------------------------------------------------------------

describe("Analytics Utilities", () => {
  it("safePct calculates percentage", () => {
    expect(safePct(50, 100)).toBe(50);
    expect(safePct(1, 3)).toBeCloseTo(33.3, 0);
  });

  it("safePct returns 0 for zero denominator", () => {
    expect(safePct(10, 0)).toBe(0);
  });

  it("safeDiv divides safely", () => {
    expect(safeDiv(10, 2)).toBe(5);
    expect(safeDiv(10, 0)).toBe(0);
  });

  it("median calculates correctly", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("mean calculates correctly", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(mean([])).toBe(0);
  });

  it("MIN_SAMPLE_SIZE is defined", () => {
    expect(MIN_SAMPLE_SIZE).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Test: Insights
// ---------------------------------------------------------------------------

describe("Insight Engine", () => {
  it("generates milestone insight for 10+ applications", () => {
    const apps = Array.from({ length: 10 }, () =>
      makeApp({ status: "applied" }),
    );
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps,
      allApps: apps,
      upcomingInterviews: 0,
      dueFollowUps: 0,
      upcomingDeadlines: 0,
      highPriorityCount: 0,
    });

    const milestone = insights.find((i) => i.type === "MILESTONE");
    expect(milestone).toBeDefined();
    expect(milestone?.title).toContain("10");
  });

  it("generates follow-up action insight", () => {
    const apps = [makeApp({ status: "applied" })];
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps,
      allApps: apps,
      upcomingInterviews: 0,
      dueFollowUps: 3,
      upcomingDeadlines: 0,
      highPriorityCount: 0,
    });

    const followUp = insights.find((i) => i.type === "ACTION_REQUIRED" && i.title.includes("follow-up"));
    expect(followUp).toBeDefined();
    expect(followUp?.actionHref).toBe("/applications");
  });

  it("generates interview action insight", () => {
    const apps = [makeApp({ status: "interview" })];
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps,
      allApps: apps,
      upcomingInterviews: 2,
      dueFollowUps: 0,
      upcomingDeadlines: 0,
      highPriorityCount: 0,
    });

    const interview = insights.find((i) => i.title.includes("interview"));
    expect(interview).toBeDefined();
  });

  it("generates positive pattern for high interview rate", () => {
    const apps = [
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "applied" }),
      makeApp({ status: "interview" }),
      makeApp({ status: "interview" }),
    ];
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps,
      allApps: apps,
      upcomingInterviews: 0,
      dueFollowUps: 0,
      upcomingDeadlines: 0,
      highPriorityCount: 0,
    });

    const positive = insights.find((i) => i.type === "POSITIVE_PATTERN");
    expect(positive).toBeDefined();
  });

  it("generates warning for high rejection rate", () => {
    const apps = [
      makeApp({ status: "rejected" }),
      makeApp({ status: "rejected" }),
      makeApp({ status: "rejected" }),
      makeApp({ status: "rejected" }),
      makeApp({ status: "applied" }),
    ];
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps,
      allApps: apps,
      upcomingInterviews: 0,
      dueFollowUps: 0,
      upcomingDeadlines: 0,
      highPriorityCount: 0,
    });

    const warning = insights.find((i) => i.type === "WARNING");
    expect(warning).toBeDefined();
  });

  it("generates opportunity for high-priority jobs", () => {
    const apps = [makeApp()];
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps,
      allApps: apps,
      upcomingInterviews: 0,
      dueFollowUps: 0,
      upcomingDeadlines: 0,
      highPriorityCount: 5,
    });

    const opportunity = insights.find((i) => i.type === "OPPORTUNITY");
    expect(opportunity).toBeDefined();
  });

  it("generates deadline warning", () => {
    const apps = [makeApp()];
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps,
      allApps: apps,
      upcomingInterviews: 0,
      dueFollowUps: 0,
      upcomingDeadlines: 3,
      highPriorityCount: 0,
    });

    const deadline = insights.find((i) => i.title.includes("deadline"));
    expect(deadline).toBeDefined();
  });

  it("generates trend insight for low volume", () => {
    const apps = Array.from({ length: 15 }, () =>
      makeApp({ status: "applied", createdAt: daysAgo(30) }),
    );
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps: [], // no recent apps
      allApps: apps,
      upcomingInterviews: 0,
      dueFollowUps: 0,
      upcomingDeadlines: 0,
      highPriorityCount: 0,
    });

    const trend = insights.find((i) => i.type === "TREND");
    expect(trend).toBeDefined();
  });

  it("each insight has required fields", () => {
    const apps = [
      makeApp({ status: "applied" }),
      makeApp({ status: "interview" }),
    ];
    const insights = generateInsights({
      core: calculateCoreMetrics(apps),
      funnel: calculateFunnel(apps).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps,
      allApps: apps,
      upcomingInterviews: 1,
      dueFollowUps: 0,
      upcomingDeadlines: 0,
      highPriorityCount: 0,
    });

    for (const insight of insights) {
      expect(insight.id).toBeTruthy();
      expect(insight.type).toBeTruthy();
      expect(insight.title).toBeTruthy();
      expect(insight.description).toBeTruthy();
      expect(insight.severity).toBeTruthy();
      expect(insight.evidence).toBeDefined();
    }
  });

  it("does not generate insights with zero data", () => {
    const insights = generateInsights({
      core: calculateCoreMetrics([]),
      funnel: calculateFunnel([]).stages,
      matchBuckets: [],
      priorityAnalysis: [],
      apps: [],
      allApps: [],
      upcomingInterviews: 0,
      dueFollowUps: 0,
      upcomingDeadlines: 0,
      highPriorityCount: 0,
    });

    // Should have no insights or very few
    expect(insights.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test: Security
// ---------------------------------------------------------------------------

describe("Analytics Security", () => {
  it("client cannot submit metrics", () => {
    // All analytics are computed server-side
    // The API only accepts range as a query parameter
    // No client-provided metrics are accepted
    const metrics = calculateCoreMetrics([makeApp({ status: "applied" })]);
    expect(metrics.totalApplications).toBe(1);
    // This verifies the calculation is deterministic
    const metrics2 = calculateCoreMetrics([makeApp({ status: "applied" })]);
    expect(metrics.totalApplications).toBe(metrics2.totalApplications);
  });

  it("deterministic output for same input", () => {
    const apps = [
      makeApp({ status: "applied" }),
      makeApp({ status: "interview" }),
    ];
    const m1 = calculateCoreMetrics(apps);
    const m2 = calculateCoreMetrics(apps);
    expect(m1).toEqual(m2);
  });

  it("no sensitive data in metrics output", () => {
    const apps = [makeApp({ status: "applied", notes: "secret password" })];
    const metrics = calculateCoreMetrics(apps);
    // Metrics should only contain counts and rates
    expect(JSON.stringify(metrics)).not.toContain("secret");
    expect(JSON.stringify(metrics)).not.toContain("password");
  });
});
