// ============================================================================
// CareerPilot AI — Matching Engine Barrel Export
// ============================================================================

export {
  normalizeSkill,
  normalizeSeniority,
  normalizeDegree,
  normalizeDomain,
  extractResumeSkills,
  extractJobSkills,
  parseExperienceRequirement,
} from "./normalizer";

export {
  matchSkills,
  calculateSkillScore,
  calculateExperienceScore,
  calculateEducationScore,
  calculateSeniorityScore,
  calculateScores,
  deriveRecommendation,
  MATCHING_WEIGHTS,
  type SkillMatchResult,
  type SkillEvidence,
  type ScoreDimensions,
} from "./scorer";

export {
  runMatchAnalysis,
  computeDeterministicMatch,
  validateMatchInput,
  MatchEngineError,
  MATCH_ANALYSIS_PROMPT_V1,
  type MatchEngineInput,
  type MatchEngineOutput,
} from "./engine";
