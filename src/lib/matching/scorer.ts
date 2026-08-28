// ============================================================================
// CareerPilot AI — Deterministic Matcher
// ============================================================================
//
// Computes explainable match scores between a structured resume and job.
// NO Gemini dependency for numerical scoring — fully deterministic.
// ============================================================================

import { normalizeSkill, normalizeSeniority, normalizeDegree, parseExperienceRequirement } from "./normalizer";


// ---------------------------------------------------------------------------
// Configuration — single location for all scoring weights
// ---------------------------------------------------------------------------

export const MATCHING_WEIGHTS = {
  overall: {
    skill: 0.50,
    experience: 0.25,
    education: 0.10,
    seniority: 0.15,
  },
  skill: {
    requiredWeight: 0.60,
    preferredWeight: 0.40,
  },
  experience: {
    exactMatchBonus: 10,
    overshootDamping: 0.5, // Diminishing returns above requirement
    noRequirementDefault: 75, // Score when job doesn't specify
  },
  education: {
    exactMatchScore: 100,
    higherDegreeScore: 90,
    lowerDegreePenalty: 30,
    noRequirementScore: 85, // Score when job doesn't specify
  },
  seniority: {
    exactMatchScore: 100,
    oneLevelOffScore: 70,
    twoLevelsOffScore: 40,
    noRequirementScore: 75,
  },
} as const;

// ---------------------------------------------------------------------------
// Score dimensions
// ---------------------------------------------------------------------------

export interface ScoreDimensions {
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  seniorityScore: number;
}

export interface SkillMatchResult {
  matchedRequired: string[];
  missingRequired: string[];
  matchedPreferred: string[];
  missingPreferred: string[];
  evidence: SkillEvidence[];
}

export interface SkillEvidence {
  skill: string;
  resumeEvidence: string;
  jobRequirement: string;
  match: "strong" | "partial" | "missing";
}

// ---------------------------------------------------------------------------
// Skill matching
// ---------------------------------------------------------------------------

/**
 * Deterministic skill matching between resume and job.
 * Returns matched/missing skills with evidence.
 */
export function matchSkills(
  resumeSkills: string[],
  jobRequired: string[],
  jobPreferred: string[],
): SkillMatchResult {
  const resumeKeySet = new Set(resumeSkills.map((s) => normalizeSkill(s).key));

  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  const matchedPreferred: string[] = [];
  const missingPreferred: string[] = [];
  const evidence: SkillEvidence[] = [];

  // Match required skills
  for (const skill of jobRequired) {
    const { canonical, key } = normalizeSkill(skill);
    if (resumeKeySet.has(key)) {
      matchedRequired.push(canonical);
      evidence.push({
        skill: canonical,
        resumeEvidence: `Found in resume skills/experience`,
        jobRequirement: `Required for this role`,
        match: "strong",
      });
    } else {
      missingRequired.push(canonical);
      evidence.push({
        skill: canonical,
        resumeEvidence: "Not found in resume",
        jobRequirement: "Required for this role",
        match: "missing",
      });
    }
  }

  // Match preferred skills
  for (const skill of jobPreferred) {
    const { canonical, key } = normalizeSkill(skill);
    if (resumeKeySet.has(key)) {
      matchedPreferred.push(canonical);
      evidence.push({
        skill: canonical,
        resumeEvidence: `Found in resume skills/experience`,
        jobRequirement: `Preferred for this role`,
        match: "strong",
      });
    } else {
      missingPreferred.push(canonical);
      evidence.push({
        skill: canonical,
        resumeEvidence: "Not found in resume",
        jobRequirement: "Preferred for this role",
        match: "partial",
      });
    }
  }

  return {
    matchedRequired,
    missingRequired,
    matchedPreferred,
    missingPreferred,
    evidence,
  };
}

// ---------------------------------------------------------------------------
// Skill score
// ---------------------------------------------------------------------------

/**
 * Calculate skill score (0-100) based on required + preferred matching.
 * Required skills carry 60% weight, preferred 40%.
 */
export function calculateSkillScore(skillResult: SkillMatchResult): number {
  const { matchedRequired, missingRequired, matchedPreferred, missingPreferred } = skillResult;

  const totalRequired = matchedRequired.length + missingRequired.length;
  const totalPreferred = matchedPreferred.length + missingPreferred.length;

  // If no skills at all, return neutral
  if (totalRequired === 0 && totalPreferred === 0) return 50;

  let requiredPct = 0;
  if (totalRequired > 0) {
    requiredPct = (matchedRequired.length / totalRequired) * 100;
  }

  let preferredPct = 0;
  if (totalPreferred > 0) {
    preferredPct = (matchedPreferred.length / totalPreferred) * 100;
  }

  // Weighted blend — required gets 60%, preferred gets 40%
  // If no required skills, preferred takes full weight
  let score: number;
  if (totalRequired === 0 && totalPreferred > 0) {
    score = preferredPct;
  } else if (totalPreferred === 0 && totalRequired > 0) {
    score = requiredPct;
  } else {
    score =
      requiredPct * MATCHING_WEIGHTS.skill.requiredWeight +
      preferredPct * MATCHING_WEIGHTS.skill.preferredWeight;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ---------------------------------------------------------------------------
// Experience score
// ---------------------------------------------------------------------------

/**
 * Calculate experience score (0-100).
 * Compares resume years against job requirement.
 */
export function calculateExperienceScore(
  resumeYears: number,
  jobRequirement: string | null | undefined,
): number {
  const requiredYears = parseExperienceRequirement(jobRequirement);

  // No requirement specified — don't penalize
  if (requiredYears === null) {
    return MATCHING_WEIGHTS.experience.noRequirementDefault;
  }

  // Exceeds requirement
  if (resumeYears >= requiredYears) {
    const overshoot = resumeYears - requiredYears;
    const bonus = Math.min(
      MATCHING_WEIGHTS.experience.exactMatchBonus,
      overshoot * MATCHING_WEIGHTS.experience.overshootDamping * 5,
    );
    return Math.min(100, 80 + bonus);
  }

  // Below requirement — penalize proportionally
  const deficit = requiredYears - resumeYears;
  const deficitPct = Math.min(deficit / requiredYears, 1);
  const score = 100 - deficitPct * 60; // Max 60% penalty for being way below
  return Math.round(Math.max(0, Math.min(100, score)));
}

// ---------------------------------------------------------------------------
// Education score
// ---------------------------------------------------------------------------

/**
 * Calculate education score (0-100).
 * Compares resume education against job requirement.
 */
export function calculateEducationScore(
  resumeEducation: { degree: string; field: string }[],
  jobEducation: string | null | undefined,
): number {
  if (!jobEducation) {
    return MATCHING_WEIGHTS.education.noRequirementScore;
  }

  const reqDegree = normalizeDegree(jobEducation);
  if (reqDegree.level === "other" && reqDegree.rank === 0) {
    return MATCHING_WEIGHTS.education.noRequirementScore;
  }

  // Find highest degree from resume
  let maxResumeRank = 0;
  for (const edu of resumeEducation) {
    const d = normalizeDegree(edu.degree);
    if (d.rank > maxResumeRank) maxResumeRank = d.rank;
  }

  if (maxResumeRank === 0) {
    // No education found — return low but not zero
    return 30;
  }

  if (maxResumeRank >= reqDegree.rank) {
    return maxResumeRank > reqDegree.rank
      ? MATCHING_WEIGHTS.education.higherDegreeScore
      : MATCHING_WEIGHTS.education.exactMatchScore;
  }

  // Lower degree than required
  const deficit = reqDegree.rank - maxResumeRank;
  return Math.max(0, MATCHING_WEIGHTS.education.exactMatchScore - deficit * MATCHING_WEIGHTS.education.lowerDegreePenalty);
}

// ---------------------------------------------------------------------------
// Seniority score
// ---------------------------------------------------------------------------

/**
 * Calculate seniority compatibility score (0-100).
 */
export function calculateSeniorityScore(
  resumeSeniority: string,
  jobSeniority: string | null | undefined,
): number {
  if (!jobSeniority) {
    return MATCHING_WEIGHTS.seniority.noRequirementScore;
  }

  const resumeRank = getSeniorityRank(resumeSeniority);
  const jobRank = getSeniorityRank(jobSeniority);

  const diff = Math.abs(resumeRank - jobRank);

  if (diff === 0) return MATCHING_WEIGHTS.seniority.exactMatchScore;
  if (diff === 1) return MATCHING_WEIGHTS.seniority.oneLevelOffScore;
  return MATCHING_WEIGHTS.seniority.twoLevelsOffScore;
}

function getSeniorityRank(seniority: string): number {
  const level = normalizeSeniority(seniority);
  const ranks: Record<string, number> = {
    intern: 0,
    junior: 1,
    mid: 2,
    senior: 3,
    lead: 4,
    manager: 5,
  };
  return ranks[level] ?? 2;
}

// ---------------------------------------------------------------------------
// Combined deterministic score
// ---------------------------------------------------------------------------

/**
 * Calculate all dimension scores and the overall weighted score.
 */
export function calculateScores(
  skillResult: SkillMatchResult,
  resumeYears: number,
  resumeEducation: { degree: string; field: string }[],
  resumeSeniority: string,
  jobRequirement: string | null | undefined,
  jobEducation: string | null | undefined,
  jobSeniority: string | null | undefined,
): ScoreDimensions & { overallScore: number } {
  const skillScore = calculateSkillScore(skillResult);
  const experienceScore = calculateExperienceScore(resumeYears, jobRequirement);
  const educationScore = calculateEducationScore(resumeEducation, jobEducation);
  const seniorityScore = calculateSeniorityScore(resumeSeniority, jobSeniority);

  const overallScore = Math.round(
    skillScore * MATCHING_WEIGHTS.overall.skill +
    experienceScore * MATCHING_WEIGHTS.overall.experience +
    educationScore * MATCHING_WEIGHTS.overall.education +
    seniorityScore * MATCHING_WEIGHTS.overall.seniority
  );

  return {
    skillScore,
    experienceScore,
    educationScore,
    seniorityScore,
    overallScore: Math.min(100, Math.max(0, overallScore)),
  };
}

// ---------------------------------------------------------------------------
// Recommendation derivation
// ---------------------------------------------------------------------------

export function deriveRecommendation(
  overallScore: number,
  skillScore: number,
): "APPLY_NOW" | "STRONG_FIT" | "GOOD_FIT" | "MODERATE_FIT" | "WEAK_FIT" | "NOT_RECOMMENDED" {
  if (overallScore >= 85 && skillScore >= 80) return "APPLY_NOW";
  if (overallScore >= 75) return "STRONG_FIT";
  if (overallScore >= 60) return "GOOD_FIT";
  if (overallScore >= 45) return "MODERATE_FIT";
  if (overallScore >= 30) return "WEAK_FIT";
  return "NOT_RECOMMENDED";
}
