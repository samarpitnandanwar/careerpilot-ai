// ============================================================================
// CareerPilot AI — Analytics Aggregator
// ============================================================================

import type {
  FirestoreApplication,
  FirestoreJobAnalysis,
  FirestoreJobPriority,
  FirestoreInterview,
  ApplicationActivity,
  PriorityLevel,
} from "@/types";
import type {
  AnalyticsSummary,
  AnalyticsRange,
  MatchScoreBucket,
  PriorityAnalysis,
  RoleAnalysis,
  CompanyAnalysis,
  SkillAnalysis,
  ResumeAnalysis,
  SourceAnalysis,
  VelocityMetrics,
} from "./types";
import { calculateCoreMetrics, filterByRange } from "./metrics";
import { calculateFunnel } from "./funnel";
import { calculateStageDurations } from "./duration";
import { calculateTrends } from "./trends";
import { generateInsights } from "./insights";
import { safePct, safeDiv, mean, MIN_SAMPLE_SIZE } from "./utils";

// ---------------------------------------------------------------------------
// Main Aggregator
// ---------------------------------------------------------------------------

export function aggregateAnalytics(params: {
  applications: FirestoreApplication[];
  analyses: FirestoreJobAnalysis[];
  priorities: FirestoreJobPriority[];
  interviews: FirestoreInterview[];
  activities: ApplicationActivity[];
  range: AnalyticsRange;
}): AnalyticsSummary {
  const { analyses, priorities, interviews, range } = params;

  // Filter by range
  const filteredApps = filterByRange(params.applications, range);

  // Core metrics
  const core = calculateCoreMetrics(filteredApps);

  // Funnel
  const funnel = calculateFunnel(filteredApps);

  // Stage durations (use all activities, not just filtered)
  const createdAtMap = new Map(
    params.applications.map((a) => [a.id, a.createdAt]),
  );
  const stageDurations = calculateStageDurations(params.activities, createdAtMap);

  // Trends
  const trends = calculateTrends(params.applications, range);

  // Match score analysis
  const matchBuckets = calculateMatchScoreAnalysis(filteredApps, analyses);

  // Priority analysis
  const priorityAnalysis = calculatePriorityAnalysis(filteredApps, priorities);

  // Role analysis
  const roleAnalysis = calculateRoleAnalysis(filteredApps, analyses);

  // Company analysis
  const companyAnalysis = calculateCompanyAnalysis(filteredApps);

  // Skill analysis
  const skillAnalysis = calculateSkillAnalysis(filteredApps, analyses);

  // Resume analysis
  const resumeAnalysis = calculateResumeAnalysis(filteredApps);

  // Source analysis
  const sourceAnalysis = calculateSourceAnalysis(filteredApps);

  // Velocity
  const velocity = calculateVelocity(filteredApps, range);

  // Context for insights
  const now = new Date();
  const upcomingInterviews = interviews.filter((i) => {
    if (!i.scheduledAt || i.status !== "scheduled") return false;
    return new Date(i.scheduledAt) >= now;
  }).length;

  const dueFollowUps = filteredApps.filter((a) => {
    if (!a.followUpDate) return false;
    return new Date(a.followUpDate) <= now;
  }).length;

  const upcomingDeadlines = filteredApps.filter((a) => {
    if (!a.deadline) return false;
    const d = new Date(a.deadline);
    return d >= now && d <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }).length;

  const highPriorityCount = priorities.filter(
    (p) => p.level === "HIGH" || p.level === "CRITICAL",
  ).length;

  // Insights
  const insights = generateInsights({
    core,
    funnel: funnel.stages,
    matchBuckets,
    priorityAnalysis,
    apps: filteredApps,
    allApps: params.applications,
    upcomingInterviews,
    dueFollowUps,
    upcomingDeadlines,
    highPriorityCount,
  });

  return {
    range,
    generatedAt: new Date().toISOString(),
    core,
    funnel,
    stageDurations,
    velocity,
    trends,
    matchScoreAnalysis: matchBuckets,
    priorityAnalysis,
    roleAnalysis,
    companyAnalysis,
    skillAnalysis,
    resumeAnalysis,
    sourceAnalysis,
    insights,
    hasEnoughData: filteredApps.length >= MIN_SAMPLE_SIZE,
  };
}

// ---------------------------------------------------------------------------
// Match Score Analysis
// ---------------------------------------------------------------------------

function calculateMatchScoreAnalysis(
  apps: FirestoreApplication[],
  analyses: FirestoreJobAnalysis[],
): MatchScoreBucket[] {
  const buckets: MatchScoreBucket[] = [
    { range: "0–49", min: 0, max: 49, applications: 0, interviews: 0, offers: 0 },
    { range: "50–64", min: 50, max: 64, applications: 0, interviews: 0, offers: 0 },
    { range: "65–74", min: 65, max: 74, applications: 0, interviews: 0, offers: 0 },
    { range: "75–84", min: 75, max: 84, applications: 0, interviews: 0, offers: 0 },
    { range: "85–94", min: 85, max: 94, applications: 0, interviews: 0, offers: 0 },
    { range: "95–100", min: 95, max: 100, applications: 0, interviews: 0, offers: 0 },
  ];

  // Build a map of jobId → latest analysis score
  const analysisByJob = new Map<string, number>();
  for (const analysis of analyses) {
    const existing = analysisByJob.get(analysis.jobId);
    if (!existing || new Date(analysis.createdAt) > new Date(analysisByJob.get(analysis.jobId) ?? "")) {
      analysisByJob.set(analysis.jobId, analysis.overallScore);
    }
  }

  for (const app of apps) {
    const score = analysisByJob.get(app.jobId);
    if (score === undefined) continue;

    const bucket = buckets.find((b) => score >= b.min && score <= b.max);
    if (bucket) {
      bucket.applications++;
      if (["interview", "offer", "accepted"].includes(app.status)) {
        bucket.interviews++;
      }
      if (["offer", "accepted"].includes(app.status)) {
        bucket.offers++;
      }
    }
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Priority Analysis
// ---------------------------------------------------------------------------

function calculatePriorityAnalysis(
  apps: FirestoreApplication[],
  priorities: FirestoreJobPriority[],
): PriorityAnalysis[] {
  const levels: PriorityLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "EXCLUDED"];

  // Map jobId → priority level
  const priorityByJob = new Map<string, { level: PriorityLevel; score: number }>();
  for (const p of priorities) {
    const existing = priorityByJob.get(p.jobId);
    if (!existing || new Date(p.createdAt) > new Date(existing.score.toString())) {
      priorityByJob.set(p.jobId, { level: p.level, score: p.score });
    }
  }

  return levels
    .map((level) => {
      const jobIds = Array.from(priorityByJob.entries())
        .filter(([, v]) => v.level === level)
        .map(([k]) => k);

      const levelApps = apps.filter((a) => jobIds.includes(a.jobId));
      const scores = jobIds
        .map((jid) => priorityByJob.get(jid)?.score ?? 0)
        .filter((s) => s > 0);

      return {
        level,
        applications: levelApps.length,
        interviews: levelApps.filter((a) =>
          ["interview", "offer", "accepted"].includes(a.status),
        ).length,
        offers: levelApps.filter((a) =>
          ["offer", "accepted"].includes(a.status),
        ).length,
        avgScore: scores.length > 0 ? mean(scores) : 0,
      };
    })
    .filter((r) => r.applications > 0);
}

// ---------------------------------------------------------------------------
// Role Analysis
// ---------------------------------------------------------------------------

function calculateRoleAnalysis(
  apps: FirestoreApplication[],
  analyses: FirestoreJobAnalysis[],
): RoleAnalysis[] {
  const roleMap = new Map<
    string,
    { apps: FirestoreApplication[]; scores: number[] }
  >();

  for (const app of apps) {
    const role = app.jobTitle || "Unknown";
    const existing = roleMap.get(role) ?? { apps: [], scores: [] };
    existing.apps.push(app);
    roleMap.set(role, existing);
  }

  // Add scores from analyses
  const scoreByJob = new Map<string, number>();
  for (const a of analyses) {
    scoreByJob.set(a.jobId, a.overallScore);
  }

  const results: RoleAnalysis[] = [];
  for (const [role, data] of roleMap) {
    const scores = data.apps
      .map((a) => scoreByJob.get(a.jobId))
      .filter((s): s is number => s !== undefined);

    const interviewCount = data.apps.filter((a) =>
      ["interview", "offer", "accepted"].includes(a.status),
    ).length;

    results.push({
      role,
      applications: data.apps.length,
      interviews: interviewCount,
      offers: data.apps.filter((a) =>
        ["offer", "accepted"].includes(a.status),
      ).length,
      avgMatchScore: scores.length > 0 ? mean(scores) : 0,
      interviewRate: safePct(interviewCount, data.apps.length),
    });
  }

  return results.sort((a, b) => b.applications - a.applications);
}

// ---------------------------------------------------------------------------
// Company Analysis
// ---------------------------------------------------------------------------

function calculateCompanyAnalysis(apps: FirestoreApplication[]): CompanyAnalysis[] {
  const companyMap = new Map<string, FirestoreApplication[]>();

  for (const app of apps) {
    const company = app.company || "Unknown";
    const list = companyMap.get(company) ?? [];
    list.push(app);
    companyMap.set(company, list);
  }

  const results: CompanyAnalysis[] = [];
  for (const [company, companyApps] of companyMap) {
    const statuses: Record<string, number> = {};
    for (const a of companyApps) {
      statuses[a.status] = (statuses[a.status] ?? 0) + 1;
    }

    results.push({
      company,
      applications: companyApps.length,
      interviews: companyApps.filter((a) =>
        ["interview", "offer", "accepted"].includes(a.status),
      ).length,
      offers: companyApps.filter((a) =>
        ["offer", "accepted"].includes(a.status),
      ).length,
      statuses,
    });
  }

  return results.sort((a, b) => b.applications - a.applications);
}

// ---------------------------------------------------------------------------
// Skill Analysis
// ---------------------------------------------------------------------------

function calculateSkillAnalysis(
  apps: FirestoreApplication[],
  analyses: FirestoreJobAnalysis[],
): SkillAnalysis[] {
  const skillMap = new Map<
    string,
    { applications: number; interviews: number; offers: number; isMissing: boolean }
  >();

  for (const app of apps) {
    const analysis = analyses.find((a) => a.jobId === app.jobId);
    if (!analysis) continue;

    const isInterview = ["interview", "offer", "accepted"].includes(app.status);
    const isOffer = ["offer", "accepted"].includes(app.status);

    // Matched skills
    for (const skill of analysis.matchedSkills) {
      const existing = skillMap.get(skill) ?? {
        applications: 0,
        interviews: 0,
        offers: 0,
        isMissing: false,
      };
      existing.applications++;
      if (isInterview) existing.interviews++;
      if (isOffer) existing.offers++;
      skillMap.set(skill, existing);
    }

    // Missing skills
    for (const skill of analysis.missingSkills) {
      const existing = skillMap.get(skill) ?? {
        applications: 0,
        interviews: 0,
        offers: 0,
        isMissing: true,
      };
      existing.applications++;
      if (isInterview) existing.interviews++;
      if (isOffer) existing.offers++;
      existing.isMissing = true;
      skillMap.set(skill, existing);
    }
  }

  const results: SkillAnalysis[] = Array.from(skillMap.entries()).map(
    ([skill, data]) => ({
      skill,
      ...data,
    }),
  );

  return results.sort((a, b) => b.applications - a.applications);
}

// ---------------------------------------------------------------------------
// Resume Analysis
// ---------------------------------------------------------------------------

function calculateResumeAnalysis(apps: FirestoreApplication[]): ResumeAnalysis[] {
  const resumeMap = new Map<
    string,
    { fileName: string; apps: FirestoreApplication[]; scores: number[] }
  >();

  for (const app of apps) {
    if (!app.resumeId) continue;
    const existing = resumeMap.get(app.resumeId) ?? {
      fileName: app.resumeId,
      apps: [],
      scores: [],
    };
    existing.apps.push(app);
    resumeMap.set(app.resumeId, existing);
  }

  return Array.from(resumeMap.entries()).map(([resumeId, data]) => ({
    resumeId,
    fileName: data.fileName,
    applications: data.apps.length,
    interviews: data.apps.filter((a) =>
      ["interview", "offer", "accepted"].includes(a.status),
    ).length,
    offers: data.apps.filter((a) =>
      ["offer", "accepted"].includes(a.status),
    ).length,
    avgMatchScore: data.scores.length > 0 ? mean(data.scores) : 0,
  }));
}

// ---------------------------------------------------------------------------
// Source Analysis
// ---------------------------------------------------------------------------

function calculateSourceAnalysis(apps: FirestoreApplication[]): SourceAnalysis[] {
  const sourceMap = new Map<string, FirestoreApplication[]>();

  for (const app of apps) {
    const source = app.source || "Unknown";
    const list = sourceMap.get(source) ?? [];
    list.push(app);
    sourceMap.set(source, list);
  }

  return Array.from(sourceMap.entries())
    .map(([source, sourceApps]) => ({
      source,
      applications: sourceApps.length,
      interviews: sourceApps.filter((a) =>
        ["interview", "offer", "accepted"].includes(a.status),
      ).length,
      offers: sourceApps.filter((a) =>
        ["offer", "accepted"].includes(a.status),
      ).length,
    }))
    .sort((a, b) => b.applications - a.applications);
}

// ---------------------------------------------------------------------------
// Velocity
// ---------------------------------------------------------------------------

function calculateVelocity(
  apps: FirestoreApplication[],
  range: AnalyticsRange,
): VelocityMetrics {
  const now = new Date();

  // Calculate based on range
  let denominatorWeeks: number;
  let denominatorMonths: number;

  switch (range) {
    case "7d":
      denominatorWeeks = 1;
      denominatorMonths = 1 / 4;
      break;
    case "30d":
      denominatorWeeks = 4.3;
      denominatorMonths = 1;
      break;
    case "90d":
      denominatorWeeks = 13;
      denominatorMonths = 3;
      break;
    case "all":
      // Use the span of the data
      if (apps.length === 0) {
        denominatorWeeks = 1;
        denominatorMonths = 1;
      } else {
        const dates = apps
          .map((a) => new Date(a.createdAt).getTime())
          .filter((t) => !isNaN(t));
        if (dates.length === 0) {
          denominatorWeeks = 1;
          denominatorMonths = 1;
        } else {
          const spanMs = now.getTime() - Math.min(...dates);
          denominatorWeeks = Math.max(1, spanMs / (7 * 24 * 60 * 60 * 1000));
          denominatorMonths = Math.max(1, spanMs / (30 * 24 * 60 * 60 * 1000));
        }
      }
      break;
  }

  const responded = apps.filter((a) =>
    ["screening", "assessment", "interview", "offer", "accepted", "rejected"].includes(
      a.status,
    ),
  );
  const interviewed = apps.filter((a) =>
    ["interview", "offer", "accepted"].includes(a.status),
  );
  const offered = apps.filter((a) =>
    ["offer", "accepted"].includes(a.status),
  );

  return {
    applicationsPerWeek: Math.round(safeDiv(apps.length, denominatorWeeks) * 10) / 10,
    applicationsPerMonth: Math.round(safeDiv(apps.length, denominatorMonths) * 10) / 10,
    responsesPerWeek: Math.round(safeDiv(responded.length, denominatorWeeks) * 10) / 10,
    interviewsPerMonth: Math.round(safeDiv(interviewed.length, denominatorMonths) * 10) / 10,
    offersPerMonth: Math.round(safeDiv(offered.length, denominatorMonths) * 10) / 10,
  };
}
