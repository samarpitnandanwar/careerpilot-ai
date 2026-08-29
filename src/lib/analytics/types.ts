// ============================================================================
// CareerPilot AI — Analytics Types & Schemas
// ============================================================================

import { z } from "zod";
import type { ApplicationStatus, PriorityLevel } from "@/types";

// ---------------------------------------------------------------------------
// Time Range
// ---------------------------------------------------------------------------

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export const AnalyticsRangeSchema = z.enum(["7d", "30d", "90d", "all"]);

// ---------------------------------------------------------------------------
// Core Metrics
// ---------------------------------------------------------------------------

export interface CoreMetrics {
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  submitted: number;
  screening: number;
  assessment: number;
  interview: number;
  offer: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  responseRate: number; // applications that moved beyond "applied" / total applied
  screeningRate: number;
  interviewRate: number;
  offerRate: number;
  acceptanceRate: number;
  rejectionRate: number;
}

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number; // percentage of first stage
  conversionFromPrevious: number; // percentage from previous stage
}

export interface FunnelMetrics {
  stages: FunnelStage[];
  totalApplied: number;
}

// ---------------------------------------------------------------------------
// Stage Duration
// ---------------------------------------------------------------------------

export interface StageDuration {
  from: ApplicationStatus;
  to: ApplicationStatus;
  averageDays: number;
  medianDays: number;
  sampleSize: number;
}

// ---------------------------------------------------------------------------
// Velocity
// ---------------------------------------------------------------------------

export interface VelocityMetrics {
  applicationsPerWeek: number;
  applicationsPerMonth: number;
  responsesPerWeek: number;
  interviewsPerMonth: number;
  offersPerMonth: number;
}

// ---------------------------------------------------------------------------
// Trend
// ---------------------------------------------------------------------------

export interface TrendPoint {
  label: string;
  applications: number;
  interviews: number;
  offers: number;
}

export interface TrendMetrics {
  current: TrendPoint[];
  previous: TrendPoint[];
  comparisonAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Match Score Analysis
// ---------------------------------------------------------------------------

export interface MatchScoreBucket {
  range: string;
  min: number;
  max: number;
  applications: number;
  interviews: number;
  offers: number;
}

// ---------------------------------------------------------------------------
// Priority Analysis
// ---------------------------------------------------------------------------

export interface PriorityAnalysis {
  level: PriorityLevel;
  applications: number;
  interviews: number;
  offers: number;
  avgScore: number;
}

// ---------------------------------------------------------------------------
// Role / Company / Skill / Resume / Source Analysis
// ---------------------------------------------------------------------------

export interface RoleAnalysis {
  role: string;
  applications: number;
  interviews: number;
  offers: number;
  avgMatchScore: number;
  interviewRate: number;
}

export interface CompanyAnalysis {
  company: string;
  applications: number;
  interviews: number;
  offers: number;
  statuses: Record<string, number>;
}

export interface SkillAnalysis {
  skill: string;
  applications: number;
  interviews: number;
  offers: number;
  isMissing: boolean;
}

export interface ResumeAnalysis {
  resumeId: string;
  fileName: string;
  applications: number;
  interviews: number;
  offers: number;
  avgMatchScore: number | null;
}

export interface SourceAnalysis {
  source: string;
  applications: number;
  interviews: number;
  offers: number;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export type InsightType =
  | "POSITIVE_PATTERN"
  | "WARNING"
  | "OPPORTUNITY"
  | "TREND"
  | "MILESTONE"
  | "ACTION_REQUIRED";

export type InsightSeverity = "positive" | "warning" | "info" | "action";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  evidence: Record<string, unknown>;
  actionLabel?: string;
  actionHref?: string;
}

// ---------------------------------------------------------------------------
// Full Analytics Response
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  range: AnalyticsRange;
  generatedAt: string;
  core: CoreMetrics;
  funnel: FunnelMetrics;
  stageDurations: StageDuration[];
  velocity: VelocityMetrics;
  trends: TrendMetrics;
  matchScoreAnalysis: MatchScoreBucket[];
  priorityAnalysis: PriorityAnalysis[];
  roleAnalysis: RoleAnalysis[];
  companyAnalysis: CompanyAnalysis[];
  skillAnalysis: SkillAnalysis[];
  resumeAnalysis: ResumeAnalysis[];
  sourceAnalysis: SourceAnalysis[];
  insights: Insight[];
  hasEnoughData: boolean;
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const CoreMetricsSchema = z.object({
  totalApplications: z.number().int().min(0),
  applicationsByStatus: z.record(z.string(), z.number().int().min(0)),
  submitted: z.number().int().min(0),
  screening: z.number().int().min(0),
  assessment: z.number().int().min(0),
  interview: z.number().int().min(0),
  offer: z.number().int().min(0),
  accepted: z.number().int().min(0),
  rejected: z.number().int().min(0),
  withdrawn: z.number().int().min(0),
  responseRate: z.number().min(0).max(100),
  screeningRate: z.number().min(0).max(100),
  interviewRate: z.number().min(0).max(100),
  offerRate: z.number().min(0).max(100),
  acceptanceRate: z.number().min(0).max(100),
  rejectionRate: z.number().min(0).max(100),
});

export const InsightSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "POSITIVE_PATTERN",
    "WARNING",
    "OPPORTUNITY",
    "TREND",
    "MILESTONE",
    "ACTION_REQUIRED",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["positive", "warning", "info", "action"]),
  evidence: z.record(z.string(), z.unknown()),
  actionLabel: z.string().optional(),
  actionHref: z.string().optional(),
});

export const AnalyticsSummarySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]),
  generatedAt: z.string(),
  core: CoreMetricsSchema,
  funnel: z.object({
    stages: z.array(
      z.object({
        stage: z.string(),
        count: z.number().int().min(0),
        percentage: z.number().min(0).max(100),
        conversionFromPrevious: z.number().min(0).max(100),
      }),
    ),
    totalApplied: z.number().int().min(0),
  }),
  stageDurations: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      averageDays: z.number().min(0),
      medianDays: z.number().min(0),
      sampleSize: z.number().int().min(0),
    }),
  ),
  velocity: z.object({
    applicationsPerWeek: z.number().min(0),
    applicationsPerMonth: z.number().min(0),
    responsesPerWeek: z.number().min(0),
    interviewsPerMonth: z.number().min(0),
    offersPerMonth: z.number().min(0),
  }),
  trends: z.object({
    current: z.array(
      z.object({
        label: z.string(),
        applications: z.number().int().min(0),
        interviews: z.number().int().min(0),
        offers: z.number().int().min(0),
      }),
    ),
    previous: z.array(
      z.object({
        label: z.string(),
        applications: z.number().int().min(0),
        interviews: z.number().int().min(0),
        offers: z.number().int().min(0),
      }),
    ),
    comparisonAvailable: z.boolean(),
  }),
  matchScoreAnalysis: z.array(
    z.object({
      range: z.string(),
      min: z.number(),
      max: z.number(),
      applications: z.number().int().min(0),
      interviews: z.number().int().min(0),
      offers: z.number().int().min(0),
    }),
  ),
  priorityAnalysis: z.array(
    z.object({
      level: z.string(),
      applications: z.number().int().min(0),
      interviews: z.number().int().min(0),
      offers: z.number().int().min(0),
      avgScore: z.number().min(0).max(100),
    }),
  ),
  roleAnalysis: z.array(z.any()),
  companyAnalysis: z.array(z.any()),
  skillAnalysis: z.array(z.any()),
  resumeAnalysis: z.array(z.any()),
  sourceAnalysis: z.array(z.any()),
  insights: z.array(InsightSchema),
  hasEnoughData: z.boolean(),
});
