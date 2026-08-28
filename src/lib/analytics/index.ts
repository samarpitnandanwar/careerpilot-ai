export { aggregateAnalytics } from "./aggregator";
export { calculateCoreMetrics, filterByRange } from "./metrics";
export { calculateFunnel } from "./funnel";
export { calculateStageDurations } from "./duration";
export { calculateTrends } from "./trends";
export { generateInsights } from "./insights";
export { safePct, safeDiv, median, mean, MIN_SAMPLE_SIZE } from "./utils";
export type {
  AnalyticsRange,
  CoreMetrics,
  FunnelMetrics,
  FunnelStage,
  StageDuration,
  VelocityMetrics,
  TrendMetrics,
  TrendPoint,
  MatchScoreBucket,
  PriorityAnalysis,
  RoleAnalysis,
  CompanyAnalysis,
  SkillAnalysis,
  ResumeAnalysis,
  SourceAnalysis,
  Insight,
  InsightType,
  InsightSeverity,
  AnalyticsSummary,
} from "./types";
