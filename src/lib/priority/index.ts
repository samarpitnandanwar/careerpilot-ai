// ============================================================================
// CareerPilot AI — Priority Engine Barrel Export
// ============================================================================

export {
  calculateMatchQuality,
  calculateUrgency,
  calculateDeadlineScore,
  calculateCareerFit,
  calculateApplicationStateScore,
  calculatePriorityScore,
  derivePriorityLevel,
  deriveRecommendedAction,
  getDaysUntilDeadline,
  isDeadlineExpired,
  isDeadlineActive,
  PRIORITY_WEIGHTS,
  PRIORITY_THRESHOLDS,
  APPLICATION_STATE_SCORES,
  type CareerProfile,
  type PriorityFactors,
} from "./scorer";

export {
  runPriorityAnalysis,
  calculatePriority,
  calculateAllPriorities,
  validatePriorityInput,
  PriorityEngineError,
  PRIORITY_ENGINE_VERSION,
  type PriorityEngineInput,
  type PriorityEngineOutput,
} from "./engine";

export {
  buildFactorExplanations,
  buildSummaryExplanation,
} from "./explanations";
