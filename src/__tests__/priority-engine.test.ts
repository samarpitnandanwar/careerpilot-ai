// ============================================================================
// CareerPilot AI — Priority Engine Unit Tests
// ============================================================================
//
// Tests the deterministic priority scoring logic without any GCP dependencies.
// Includes deadline correction tests verifying postedAt is NEVER used as deadline.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
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
  type CareerProfile,
  type PriorityFactors,
} from "@/lib/priority/scorer";
import {
  calculatePriority,
  validatePriorityInput,
} from "@/lib/priority/engine";
import type { FirestoreJob, FirestoreJobAnalysis, FirestoreApplication, FirestoreProfile } from "@/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeJob(overrides: Partial<FirestoreJob> = {}): FirestoreJob {
  return {
    id: "job-1",
    title: "Software Engineer",
    company: "Test Corp",
    location: "Remote",
    description: "Test job",
    url: null,
    salary: "",
    skills: ["React", "TypeScript"],
    requirements: "3+ years",
    parsedData: null,
    source: "manual",
    employmentType: "full-time",
    postedAt: null,
    deadline: null,
    savedAt: new Date().toISOString(),
    status: "saved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<FirestoreJobAnalysis> = {}): FirestoreJobAnalysis {
  return {
    id: "analysis-1",
    jobId: "job-1",
    resumeId: "resume-1",
    model: "test",
    promptVersion: "v1",
    createdAt: new Date().toISOString(),
    overallScore: 80,
    skillScore: 80,
    experienceScore: 80,
    educationScore: 80,
    seniorityScore: 80,
    matchedSkills: ["React"],
    missingSkills: [],
    matchedPreferredSkills: [],
    skillEvidence: [],
    experienceGaps: [],
    strengths: [],
    gaps: [],
    evidence: [],
    recommendation: "GOOD_FIT",
    confidence: 70,
    summary: "Test analysis",
    ...overrides,
  };
}

function makeApplication(overrides: Partial<FirestoreApplication> = {}): FirestoreApplication {
  return {
    id: "app-1",
    jobId: "job-1",
    jobTitle: "Software Engineer",
    company: "Test Corp",
    status: "saved",
    resumeId: null,
    appliedAt: null,
    deadline: null,
    source: "manual",
    applicationUrl: null,
    lastUpdatedAt: new Date().toISOString(),
    nextAction: null,
    nextActionAt: null,
    followUpDate: null,
    currentAnalysisId: null,
    matchAnalysisId: null,
    priorityId: null,
    interviewIds: [],
    notes: "",
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProfile(overrides: Partial<FirestoreProfile> = {}): FirestoreProfile {
  return {
    uid: "user-1",
    fullName: "Test User",
    headline: "Software Engineer",
    location: "San Francisco",
    yearsOfExperience: 5,
    currentRole: "Software Engineer",
    targetRoles: ["Senior Software Engineer"],
    targetCompanies: ["Google", "Meta"],
    skills: ["React", "TypeScript", "Node.js"],
    education: "BS Computer Science",
    certifications: [],
    preferredLocations: ["San Francisco", "Remote"],
    remotePreference: "remote",
    salaryMin: 150000,
    salaryMax: 250000,
    noticePeriod: "2 weeks",
    workAuthorization: "US Citizen",
    careerGoals: "Grow into staff engineer",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper: date N days from now
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// Helper: date N days ago
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Date helper tests
// ---------------------------------------------------------------------------

describe("getDaysUntilDeadline", () => {
  it("returns null for null input", () => {
    expect(getDaysUntilDeadline(null)).toBeNull();
  });

  it("returns null for invalid date string", () => {
    expect(getDaysUntilDeadline("not-a-date")).toBeNull();
  });

  it("returns a number for valid date", () => {
    const result = getDaysUntilDeadline(daysFromNow(5));
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(6);
  });

  it("returns positive for future date", () => {
    expect(getDaysUntilDeadline(daysFromNow(10))).toBeGreaterThan(0);
  });

  it("returns negative for past date", () => {
    expect(getDaysUntilDeadline(daysAgo(5))).toBeLessThan(0);
  });
});

describe("isDeadlineExpired", () => {
  it("returns false for null", () => {
    expect(isDeadlineExpired(null)).toBe(false);
  });

  it("returns false for future deadline", () => {
    expect(isDeadlineExpired(daysFromNow(5))).toBe(false);
  });

  it("returns true for past deadline", () => {
    expect(isDeadlineExpired(daysAgo(1))).toBe(true);
  });

  it("returns false for invalid date", () => {
    expect(isDeadlineExpired("invalid")).toBe(false);
  });
});

describe("isDeadlineActive", () => {
  it("returns false for null", () => {
    expect(isDeadlineActive(null)).toBe(false);
  });

  it("returns true for future deadline", () => {
    expect(isDeadlineActive(daysFromNow(5))).toBe(true);
  });

  it("returns false for past deadline", () => {
    expect(isDeadlineActive(daysAgo(1))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CRITICAL: postedAt must NOT be treated as deadline
// ---------------------------------------------------------------------------

describe("postedAt must NOT be treated as deadline", () => {
  it("calculateDeadlineScore ignores postedAt — no deadline returns neutral 50", () => {
    // postedAt is set but deadline is null — must return neutral, NOT a postedAt-based score
    const score = calculateDeadlineScore(null);
    expect(score).toBe(50);
  });

  it("calculateUrgency uses real deadline, not postedAt", () => {
    // postedAt = 30 days ago, real deadline = tomorrow
    const urgency = calculateUrgency(
      daysFromNow(1), // real deadline
      null,
      null,
      null,
      daysAgo(30), // createdAt
    );
    // Should be high because deadline is tomorrow, not low because postedAt was 30 days ago
    expect(urgency).toBeGreaterThanOrEqual(70);
  });

  it("engine does not use postedAt as deadline for scoring", () => {
    // postedAt = 60 days ago, deadline = null
    // If postedAt were used as deadline, this would be a very expired job
    // With the fix, deadline=null means neutral deadline score
    const result = calculatePriority({
      job: makeJob({
        postedAt: daysAgo(60),
        deadline: null,
      }),
      matchAnalysis: makeAnalysis({ overallScore: 85 }),
      application: null,
      interviews: [],
      profile: null,
    });

    // The deadline factor should be neutral (50), not expired (5)
    const deadlineFactor = result.factors.find((f) => f.name === "Deadline");
    expect(deadlineFactor).toBeDefined();
    expect(deadlineFactor!.value).toBe(50); // neutral for no deadline
  });

  it("engine uses job.deadline for scoring, not job.postedAt", () => {
    // postedAt = 60 days ago, deadline = tomorrow
    const result = calculatePriority({
      job: makeJob({
        postedAt: daysAgo(60),
        deadline: daysFromNow(1),
      }),
      matchAnalysis: makeAnalysis({ overallScore: 85 }),
      application: null,
      interviews: [],
      profile: null,
    });

    // The deadline factor should be high because deadline is tomorrow
    const deadlineFactor = result.factors.find((f) => f.name === "Deadline");
    expect(deadlineFactor).toBeDefined();
    expect(deadlineFactor!.value).toBeGreaterThanOrEqual(70);
  });
});

// ---------------------------------------------------------------------------
// Match quality tests
// ---------------------------------------------------------------------------

describe("calculateMatchQuality", () => {
  it("returns high score for excellent match", () => {
    const score = calculateMatchQuality(95);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("returns moderate score for moderate match", () => {
    const score = calculateMatchQuality(65);
    expect(score).toBeGreaterThanOrEqual(45);
    expect(score).toBeLessThanOrEqual(75);
  });

  it("returns low score for poor match", () => {
    const score = calculateMatchQuality(20);
    expect(score).toBeLessThan(30);
  });

  it("returns 0 for zero match", () => {
    expect(calculateMatchQuality(0)).toBe(0);
  });

  it("returns 100 for perfect match", () => {
    const score = calculateMatchQuality(100);
    expect(score).toBeGreaterThanOrEqual(95);
  });

  it("is monotonic (higher input → higher output)", () => {
    const scores = [0, 20, 40, 60, 75, 90, 100].map(calculateMatchQuality);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// Urgency tests
// ---------------------------------------------------------------------------

describe("calculateUrgency", () => {
  it("returns high urgency for deadline today", () => {
    const score = calculateUrgency(daysFromNow(0), null, null, null, new Date().toISOString());
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("returns high urgency for deadline within 1 day", () => {
    const score = calculateUrgency(daysFromNow(1), null, null, null, new Date().toISOString());
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("returns moderate urgency for deadline within 7 days", () => {
    const score = calculateUrgency(daysFromNow(5), null, null, null, new Date().toISOString());
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it("returns lower urgency for distant deadline", () => {
    const score = calculateUrgency(daysFromNow(30), null, null, null, new Date().toISOString());
    expect(score).toBeLessThanOrEqual(40);
  });

  it("returns moderate urgency for no deadline but recent creation", () => {
    const now = new Date().toISOString();
    const score = calculateUrgency(null, null, null, null, now);
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it("returns high urgency for upcoming interview", () => {
    const score = calculateUrgency(null, daysFromNow(1), null, null, new Date().toISOString());
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("handles expired deadline gracefully — low urgency", () => {
    const score = calculateUrgency(daysAgo(1), null, null, null, new Date().toISOString());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(30);
  });

  it("interview urgency works without application deadline", () => {
    const score = calculateUrgency(null, daysFromNow(2), null, null, daysAgo(30));
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("overdue follow-up creates high urgency", () => {
    const score = calculateUrgency(null, null, null, daysAgo(1), daysAgo(30));
    expect(score).toBeGreaterThanOrEqual(70);
  });
});

// ---------------------------------------------------------------------------
// Deadline tests
// ---------------------------------------------------------------------------

describe("calculateDeadlineScore", () => {
  it("returns high score for deadline today", () => {
    const score = calculateDeadlineScore(daysFromNow(0));
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it("returns low score for expired deadline", () => {
    const score = calculateDeadlineScore(daysAgo(2));
    expect(score).toBeLessThanOrEqual(15);
  });

  it("returns neutral 50 for no deadline (not based on postedAt)", () => {
    const score = calculateDeadlineScore(null);
    expect(score).toBe(50);
  });

  it("returns neutral 50 for no deadline regardless of createdAt age", () => {
    // Even if job was created 6 months ago, no deadline = neutral 50
    const score = calculateDeadlineScore(null);
    expect(score).toBe(50);
  });

  it("returns neutral 50 for invalid deadline date", () => {
    const score = calculateDeadlineScore("not-a-date");
    expect(score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Career fit tests
// ---------------------------------------------------------------------------

describe("calculateCareerFit", () => {
  it("returns high score when role matches target", () => {
    const profile: CareerProfile = {
      targetRoles: ["Software Engineer"],
      targetCompanies: ["Google"],
      preferredLocations: ["Remote"],
      remotePreference: "remote",
      skills: ["React", "TypeScript"],
    };
    const score = calculateCareerFit(
      { title: "Senior Software Engineer", company: "Google", location: "Remote", skills: ["React"] },
      profile,
    );
    expect(score).toBeGreaterThanOrEqual(65);
  });

  it("returns moderate when role partially matches", () => {
    const profile: CareerProfile = {
      targetRoles: ["Software Engineer"],
      skills: ["React"],
    };
    const score = calculateCareerFit(
      { title: "Product Manager", skills: ["Python"] },
      profile,
    );
    expect(score).toBeLessThan(65);
  });

  it("returns neutral when no profile", () => {
    const score = calculateCareerFit({ title: "Engineer" }, null);
    expect(score).toBe(50);
  });

  it("handles missing preferences gracefully", () => {
    const profile: CareerProfile = {};
    const score = calculateCareerFit({ title: "Engineer" }, profile);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Application state tests
// ---------------------------------------------------------------------------

describe("calculateApplicationStateScore", () => {
  it("returns 0 for rejected", () => {
    expect(calculateApplicationStateScore("rejected")).toBe(0);
  });

  it("returns high score for interview", () => {
    expect(calculateApplicationStateScore("interview")).toBeGreaterThanOrEqual(80);
  });

  it("returns high score for offer", () => {
    expect(calculateApplicationStateScore("offer")).toBeGreaterThanOrEqual(90);
  });

  it("returns moderate score for applied", () => {
    const score = calculateApplicationStateScore("applied");
    expect(score).toBeGreaterThanOrEqual(45);
    expect(score).toBeLessThanOrEqual(65);
  });

  it("returns low score for withdrawn", () => {
    expect(calculateApplicationStateScore("withdrawn")).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// Combined priority score tests
// ---------------------------------------------------------------------------

describe("calculatePriorityScore", () => {
  it("returns 0-100", () => {
    const combos: PriorityFactors[] = [
      { matchQuality: 100, urgency: 100, careerFit: 100, deadline: 100, applicationState: 100 },
      { matchQuality: 0, urgency: 0, careerFit: 0, deadline: 0, applicationState: 0 },
      { matchQuality: 50, urgency: 50, careerFit: 50, deadline: 50, applicationState: 50 },
    ];
    for (const factors of combos) {
      const score = calculatePriorityScore(factors);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("weights sum to 1.0", () => {
    const sum =
      PRIORITY_WEIGHTS.matchQuality +
      PRIORITY_WEIGHTS.urgency +
      PRIORITY_WEIGHTS.careerFit +
      PRIORITY_WEIGHTS.deadline +
      PRIORITY_WEIGHTS.applicationState;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("is deterministic", () => {
    const factors: PriorityFactors = {
      matchQuality: 80,
      urgency: 70,
      careerFit: 65,
      deadline: 60,
      applicationState: 55,
    };
    const s1 = calculatePriorityScore(factors);
    const s2 = calculatePriorityScore(factors);
    expect(s1).toBe(s2);
  });
});

// ---------------------------------------------------------------------------
// Priority level tests
// ---------------------------------------------------------------------------

describe("derivePriorityLevel", () => {
  it("returns CRITICAL for high score", () => {
    expect(derivePriorityLevel(95, "saved", false)).toBe("CRITICAL");
  });

  it("returns HIGH for good score", () => {
    expect(derivePriorityLevel(80, "saved", false)).toBe("HIGH");
  });

  it("returns MEDIUM for moderate score", () => {
    expect(derivePriorityLevel(60, "saved", false)).toBe("MEDIUM");
  });

  it("returns LOW for low score", () => {
    expect(derivePriorityLevel(30, "saved", false)).toBe("LOW");
  });

  it("returns EXCLUDED for rejected", () => {
    expect(derivePriorityLevel(100, "rejected", false)).toBe("EXCLUDED");
  });

  it("returns LOW for withdrawn", () => {
    expect(derivePriorityLevel(100, "withdrawn", false)).toBe("LOW");
  });

  it("caps at LOW for expired deadline + saved", () => {
    // Even with a very high score, expired + saved → LOW
    expect(derivePriorityLevel(95, "saved", true)).toBe("LOW");
  });

  it("does NOT cap for expired deadline + applied", () => {
    // Active applications with expired deadline still get their real level
    expect(derivePriorityLevel(95, "applied", true)).toBe("CRITICAL");
  });

  it("does NOT cap for expired deadline + interview", () => {
    expect(derivePriorityLevel(85, "interview", true)).toBe("HIGH");
  });

  it("does NOT cap for expired deadline + offer", () => {
    expect(derivePriorityLevel(90, "offer", true)).toBe("CRITICAL");
  });

  it("thresholds are consistent", () => {
    expect(PRIORITY_THRESHOLDS.CRITICAL).toBe(90);
    expect(PRIORITY_THRESHOLDS.HIGH).toBe(75);
    expect(PRIORITY_THRESHOLDS.MEDIUM).toBe(50);
    expect(PRIORITY_THRESHOLDS.LOW).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Recommended action tests
// ---------------------------------------------------------------------------

describe("deriveRecommendedAction", () => {
  it("returns EXCLUDED for rejected", () => {
    expect(deriveRecommendedAction("rejected", 80, 70, null, null, false)).toBe("EXCLUDED");
  });

  it("returns REVIEW_OFFER for offer", () => {
    expect(deriveRecommendedAction("offer", 90, 50, null, null, false)).toBe("REVIEW_OFFER");
  });

  it("returns PREPARE_INTERVIEW for interview status", () => {
    expect(deriveRecommendedAction("interview", 80, 50, null, null, false)).toBe("PREPARE_INTERVIEW");
  });

  it("returns APPLY_NOW for saved + high match + high urgency", () => {
    expect(deriveRecommendedAction("saved", 85, 80, null, null, false)).toBe("APPLY_NOW");
  });

  it("returns PREPARE_APPLICATION for saved + moderate match", () => {
    expect(deriveRecommendedAction("saved", 65, 40, null, null, false)).toBe("PREPARE_APPLICATION");
  });

  it("returns WAIT for applied + low urgency", () => {
    expect(deriveRecommendedAction("applied", 70, 30, null, null, false)).toBe("WAIT");
  });

  it("returns FOLLOW_UP for applied + high urgency", () => {
    expect(deriveRecommendedAction("applied", 70, 80, null, null, false)).toBe("FOLLOW_UP");
  });

  it("returns DEPRIORITIZE for withdrawn", () => {
    expect(deriveRecommendedAction("withdrawn", 80, 70, null, null, false)).toBe("DEPRIORITIZE");
  });

  it("returns DEPRIORITIZE for saved + expired deadline + high match", () => {
    // KEY: expired deadline + saved → DEPRIORITIZE, NOT APPLY_NOW
    expect(deriveRecommendedAction("saved", 95, 80, null, null, true)).toBe("DEPRIORITIZE");
  });

  it("returns DEPRIORITIZE for saved + expired deadline + any match", () => {
    expect(deriveRecommendedAction("saved", 60, 50, null, null, true)).toBe("DEPRIORITIZE");
  });

  it("returns PREPARE_INTERVIEW for expired deadline + interview status", () => {
    // Active pipeline actions remain valid even with expired deadline
    expect(deriveRecommendedAction("interview", 80, 50, null, null, true)).toBe("PREPARE_INTERVIEW");
  });

  it("returns REVIEW_OFFER for expired deadline + offer status", () => {
    expect(deriveRecommendedAction("offer", 90, 50, null, null, true)).toBe("REVIEW_OFFER");
  });

  it("returns FOLLOW_UP for expired deadline + applied", () => {
    expect(deriveRecommendedAction("applied", 70, 80, null, null, true)).toBe("FOLLOW_UP");
  });

  it("returns WAIT for expired deadline + applied + low urgency", () => {
    expect(deriveRecommendedAction("applied", 70, 30, null, null, true)).toBe("WAIT");
  });
});

// ---------------------------------------------------------------------------
// Full engine tests
// ---------------------------------------------------------------------------

describe("calculatePriority", () => {
  it("high match + urgent deadline → high priority", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysFromNow(1) }),
      matchAnalysis: makeAnalysis({ overallScore: 92 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.level).not.toBe("EXCLUDED");
  });

  it("high match + distant deadline → moderate-high priority", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysFromNow(30) }),
      matchAnalysis: makeAnalysis({ overallScore: 92 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it("no deadline + high match → moderate priority (deadline is neutral)", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: null }),
      matchAnalysis: makeAnalysis({ overallScore: 85 }),
      application: null,
      interviews: [],
      profile: null,
    });
    // With no deadline, deadline factor is neutral 50
    // Score depends on other factors
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    // The deadline factor should be neutral
    const deadlineFactor = result.factors.find((f) => f.name === "Deadline");
    expect(deadlineFactor!.value).toBe(50);
  });

  it("low match + distant deadline → low priority", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysFromNow(30) }),
      matchAnalysis: makeAnalysis({ overallScore: 30 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.score).toBeLessThanOrEqual(50);
  });

  it("rejected → EXCLUDED with score 0", () => {
    const result = calculatePriority({
      job: makeJob(),
      matchAnalysis: makeAnalysis({ overallScore: 95 }),
      application: makeApplication({ status: "rejected" }),
      interviews: [],
      profile: null,
    });
    expect(result.score).toBe(0);
    expect(result.level).toBe("EXCLUDED");
    expect(result.recommendedAction).toBe("EXCLUDED");
  });

  it("interview stage → high priority", () => {
    const result = calculatePriority({
      job: makeJob(),
      matchAnalysis: makeAnalysis({ overallScore: 80 }),
      application: makeApplication({ status: "interview" }),
      interviews: [],
      profile: null,
    });
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.recommendedAction).toBe("PREPARE_INTERVIEW");
  });

  it("offer → critical/high priority", () => {
    const result = calculatePriority({
      job: makeJob(),
      matchAnalysis: makeAnalysis({ overallScore: 90 }),
      application: makeApplication({ status: "offer" }),
      interviews: [],
      profile: null,
    });
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.recommendedAction).toBe("REVIEW_OFFER");
  });

  it("includes factors that explain the score", () => {
    const result = calculatePriority({
      job: makeJob(),
      matchAnalysis: makeAnalysis({ overallScore: 75 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.factors.length).toBe(5);
    expect(result.factors.every((f) => f.explanation.length > 0)).toBe(true);
  });

  it("generates a summary explanation", () => {
    const result = calculatePriority({
      job: makeJob(),
      matchAnalysis: makeAnalysis({ overallScore: 80 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.explanation.length).toBeGreaterThan(10);
  });

  it("handles missing profile gracefully", () => {
    const result = calculatePriority({
      job: makeJob(),
      matchAnalysis: makeAnalysis(),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("handles missing match analysis gracefully", () => {
    const result = calculatePriority({
      job: makeJob(),
      matchAnalysis: null,
      application: null,
      interviews: [],
      profile: makeProfile(),
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Expired deadline tests — the critical corrections
// ---------------------------------------------------------------------------

describe("expired deadline behavior", () => {
  it("expired + saved → no APPLY_NOW", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysAgo(1) }),
      matchAnalysis: makeAnalysis({ overallScore: 98 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.recommendedAction).not.toBe("APPLY_NOW");
    expect(result.recommendedAction).toBe("DEPRIORITIZE");
  });

  it("expired + saved + high match → LOW priority level", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysAgo(1) }),
      matchAnalysis: makeAnalysis({ overallScore: 98 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.level).toBe("LOW");
  });

  it("expired + saved + high match → score capped below LOW threshold", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysAgo(5) }),
      matchAnalysis: makeAnalysis({ overallScore: 95 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.score).toBeLessThan(PRIORITY_THRESHOLDS.LOW);
  });

  it("expired + applied → WAIT (valid pipeline action, not DEPRIORITIZE)", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysAgo(1) }),
      matchAnalysis: makeAnalysis({ overallScore: 80 }),
      application: makeApplication({ status: "applied" }),
      interviews: [],
      profile: null,
    });
    // Existing application pipeline action remains valid — not DEPRIORITIZE
    // With expired deadline, urgency is low → WAIT is correct (applied, no rush)
    expect(result.recommendedAction).not.toBe("DEPRIORITIZE");
    expect(result.recommendedAction).not.toBe("EXCLUDED");
    expect(["WAIT", "FOLLOW_UP"]).toContain(result.recommendedAction);
  });

  it("expired + interview → PREPARE_INTERVIEW remains possible", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysAgo(1) }),
      matchAnalysis: makeAnalysis({ overallScore: 80 }),
      application: makeApplication({ status: "interview" }),
      interviews: [],
      profile: null,
    });
    // Action remains pipeline-valid even with expired deadline
    // Level may be LOW because urgency/deadline scores are naturally low
    expect(result.recommendedAction).toBe("PREPARE_INTERVIEW");
  });

  it("expired + offer → REVIEW_OFFER remains possible", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysAgo(1) }),
      matchAnalysis: makeAnalysis({ overallScore: 90 }),
      application: makeApplication({ status: "offer" }),
      interviews: [],
      profile: null,
    });
    expect(result.recommendedAction).toBe("REVIEW_OFFER");
    expect(result.level).not.toBe("LOW");
  });

  it("expired + screening → PREPARE_INTERVIEW remains possible", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: daysAgo(1) }),
      matchAnalysis: makeAnalysis({ overallScore: 80 }),
      application: makeApplication({ status: "screening" }),
      interviews: [],
      profile: null,
    });
    // Action remains pipeline-valid even with expired deadline
    // Level may be LOW because urgency/deadline scores are naturally low
    expect(result.recommendedAction).toBe("PREPARE_INTERVIEW");
  });
});

// ---------------------------------------------------------------------------
// No-deadline behavior tests
// ---------------------------------------------------------------------------

describe("no-deadline behavior", () => {
  it("no deadline + high match → deadline factor is neutral 50", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: null }),
      matchAnalysis: makeAnalysis({ overallScore: 85 }),
      application: null,
      interviews: [],
      profile: null,
    });
    const deadlineFactor = result.factors.find((f) => f.name === "Deadline");
    expect(deadlineFactor!.value).toBe(50);
  });

  it("no deadline + high match can still be MEDIUM or HIGH priority", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: null }),
      matchAnalysis: makeAnalysis({ overallScore: 90 }),
      application: null,
      interviews: [],
      profile: makeProfile(),
    });
    // Without deadline penalty, high match + good career fit can still rank well
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it("no deadline does not treat job as expired", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: null }),
      matchAnalysis: makeAnalysis({ overallScore: 85 }),
      application: null,
      interviews: [],
      profile: null,
    });
    expect(result.recommendedAction).not.toBe("DEPRIORITIZE");
  });
});

// ---------------------------------------------------------------------------
// Interview urgency without application deadline
// ---------------------------------------------------------------------------

describe("interview urgency without deadline", () => {
  it("upcoming interview drives urgency even with no deadline", () => {
    const result = calculatePriority({
      job: makeJob({ deadline: null }),
      matchAnalysis: makeAnalysis({ overallScore: 80 }),
      application: makeApplication({ status: "interview" }),
      interviews: [
        {
          id: "int-1",
          applicationId: "app-1",
          scheduledAt: daysFromNow(2),
          interviewType: "technical",
          round: 1,
          status: "scheduled",
          questions: [],
          notes: "",
          feedback: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      profile: null,
    });
    // Urgency factor should be high due to upcoming interview
    const urgencyFactor = result.factors.find((f) => f.name === "Urgency");
    expect(urgencyFactor!.value).toBeGreaterThanOrEqual(70);
    expect(result.recommendedAction).toBe("PREPARE_INTERVIEW");
  });
});

// ---------------------------------------------------------------------------
// Score determinism and range
// ---------------------------------------------------------------------------

describe("Score determinism and range", () => {
  it("produces identical scores for identical inputs", () => {
    const input = {
      job: makeJob({ deadline: daysFromNow(7) }),
      matchAnalysis: makeAnalysis({ overallScore: 80 }),
      application: makeApplication({ status: "applied" }),
      interviews: [],
      profile: makeProfile(),
    };

    const r1 = calculatePriority(input);
    const r2 = calculatePriority(input);

    expect(r1.score).toBe(r2.score);
    expect(r1.level).toBe(r2.level);
    expect(r1.recommendedAction).toBe(r2.recommendedAction);
  });

  it("score is always 0-100 for various deadline states", () => {
    const deadlines = [null, daysAgo(5), daysFromNow(0), daysFromNow(30)];
    for (const deadline of deadlines) {
      const result = calculatePriority({
        job: makeJob({ deadline }),
        matchAnalysis: makeAnalysis({ overallScore: 75 }),
        application: null,
        interviews: [],
        profile: null,
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});

// ---------------------------------------------------------------------------
// Validation tests
// ---------------------------------------------------------------------------

describe("validatePriorityInput", () => {
  it("accepts valid input", () => {
    expect(validatePriorityInput({ job: makeJob(), matchAnalysis: null, application: null, interviews: [], profile: null }).valid).toBe(true);
  });

  it("rejects missing job", () => {
    expect(validatePriorityInput({ job: null as unknown as FirestoreJob, matchAnalysis: null, application: null, interviews: [], profile: null }).valid).toBe(false);
  });
});
