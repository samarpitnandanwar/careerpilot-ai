// ============================================================================
// CareerPilot AI — Matching Engine Unit Tests
// ============================================================================
//
// Tests the deterministic matching logic without any GCP dependencies.
// All tests run locally — no Gemini, no Firestore, no Cloud Storage.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  normalizeSkill,
  normalizeSeniority,
  normalizeDegree,
  extractResumeSkills,
  extractJobSkills,
  parseExperienceRequirement,
} from "@/lib/matching/normalizer";
import {
  matchSkills,
  calculateSkillScore,
  calculateExperienceScore,
  calculateEducationScore,
  calculateSeniorityScore,
  calculateScores,
  deriveRecommendation,
  MATCHING_WEIGHTS,
} from "@/lib/matching/scorer";
import { validateMatchInput } from "@/lib/matching/engine";
import type { ParsedResume, FirestoreJob } from "@/types";

// ---------------------------------------------------------------------------
// Normalizer tests
// ---------------------------------------------------------------------------

describe("normalizeSkill", () => {
  it("normalizes React aliases", () => {
    expect(normalizeSkill("React.js").canonical).toBe("React");
    expect(normalizeSkill("ReactJS").canonical).toBe("React");
    expect(normalizeSkill("react").canonical).toBe("React");
  });

  it("normalizes Node.js aliases", () => {
    expect(normalizeSkill("NodeJS").canonical).toBe("Node.js");
    expect(normalizeSkill("node.js").canonical).toBe("Node.js");
    expect(normalizeSkill("Node").canonical).toBe("Node.js");
  });

  it("normalizes PostgreSQL aliases", () => {
    expect(normalizeSkill("PostgreSQL").canonical).toBe("PostgreSQL");
    expect(normalizeSkill("Postgres").canonical).toBe("PostgreSQL");
    expect(normalizeSkill("postgres").canonical).toBe("PostgreSQL");
  });

  it("normalizes cloud aliases", () => {
    expect(normalizeSkill("AWS").canonical).toBe("AWS");
    expect(normalizeSkill("Amazon Web Services").canonical).toBe("AWS");
    expect(normalizeSkill("GCP").canonical).toBe("GCP");
    expect(normalizeSkill("Google Cloud Platform").canonical).toBe("GCP");
  });

  it("preserves unknown skills", () => {
    expect(normalizeSkill("SomeCustomLib").canonical).toBe("SomeCustomLib");
  });

  it("returns empty for empty input", () => {
    expect(normalizeSkill("").canonical).toBe("");
    expect(normalizeSkill("  ").canonical).toBe("");
  });

  it("produces consistent keys", () => {
    const a = normalizeSkill("React.js");
    const b = normalizeSkill("react");
    expect(a.key).toBe(b.key);
  });
});

describe("normalizeSeniority", () => {
  it("detects intern", () => {
    expect(normalizeSeniority("Software Engineering Intern")).toBe("intern");
    expect(normalizeSeniority("intern")).toBe("intern");
  });

  it("detects junior", () => {
    expect(normalizeSeniority("Junior Developer")).toBe("junior");
    expect(normalizeSeniority("Entry Level Engineer")).toBe("junior");
    expect(normalizeSeniority("Associate Software Engineer")).toBe("junior");
  });

  it("detects mid", () => {
    expect(normalizeSeniority("Software Engineer")).toBe("mid");
    expect(normalizeSeniority("Mid-Level Developer")).toBe("mid");
  });

  it("detects senior", () => {
    expect(normalizeSeniority("Senior Software Engineer")).toBe("senior");
    expect(normalizeSeniority("Sr. Backend Developer")).toBe("senior");
  });

  it("detects lead", () => {
    expect(normalizeSeniority("Tech Lead")).toBe("lead");
    expect(normalizeSeniority("Staff Engineer")).toBe("lead");
    expect(normalizeSeniority("Principal Engineer")).toBe("lead");
  });

  it("detects manager", () => {
    expect(normalizeSeniority("Engineering Manager")).toBe("manager");
    expect(normalizeSeniority("VP of Engineering")).toBe("manager");
  });

  it("defaults to mid for ambiguous", () => {
    expect(normalizeSeniority("")).toBe("mid");
    expect(normalizeSeniority("Programmer")).toBe("mid");
  });
});

describe("normalizeDegree", () => {
  it("detects doctorate", () => {
    expect(normalizeDegree("PhD in Computer Science").rank).toBe(5);
    expect(normalizeDegree("Doctorate").rank).toBe(5);
  });

  it("detects master", () => {
    expect(normalizeDegree("Master's in CS").rank).toBe(4);
    expect(normalizeDegree("MBA").rank).toBe(4);
    expect(normalizeDegree("MSc Computer Science").rank).toBe(4);
  });

  it("detects bachelor", () => {
    expect(normalizeDegree("Bachelor's in Engineering").rank).toBe(3);
    expect(normalizeDegree("BS Computer Science").rank).toBe(3);
    expect(normalizeDegree("B.Tech IT").rank).toBe(3);
  });

  it("detects associate", () => {
    expect(normalizeDegree("Associate Degree").rank).toBe(2);
  });

  it("returns other for unknown", () => {
    expect(normalizeDegree("Some weird degree").rank).toBe(0);
  });
});

describe("extractResumeSkills", () => {
  const resume = {
    skills: {
      technical: ["TypeScript", "Python", "SQL"],
      tools: ["Git", "Docker"],
      frameworks: ["React", "Next.js"],
    },
    experience: [
      { technologies: ["GraphQL", "PostgreSQL"] },
      { technologies: ["Redis", "AWS"] },
    ],
    projects: [{ technologies: ["Tailwind CSS", "Vercel"] }],
    certifications: ["AWS Solutions Architect"],
  };

  it("extracts skills from all resume sections", () => {
    const skills = extractResumeSkills(resume);
    expect(skills).toContain("TypeScript");
    expect(skills).toContain("Python");
    expect(skills).toContain("Git");
    expect(skills).toContain("Docker");
    expect(skills).toContain("React");
    expect(skills).toContain("Next.js");
    expect(skills).toContain("GraphQL");
    expect(skills).toContain("PostgreSQL");
    expect(skills).toContain("AWS Solutions Architect");
  });

  it("deduplicates skills", () => {
    const skills = extractResumeSkills(resume);
    const unique = new Set(skills.map((s) => s.toLowerCase()));
    expect(skills.length).toBe(unique.size);
  });

  it("normalizes skill names", () => {
    const skills = extractResumeSkills({
      skills: { technical: ["react.js", "nodejs", "typescript"], tools: [], frameworks: [] },
    });
    expect(skills).toContain("React");
    expect(skills).toContain("Node.js");
    expect(skills).toContain("TypeScript");
  });
});

describe("extractJobSkills", () => {
  it("extracts required and preferred skills", () => {
    const result = extractJobSkills({
      skills: ["Python", "SQL"],
      parsedData: {
        requiredSkills: ["React", "TypeScript"],
        preferredSkills: ["GraphQL", "Docker"],
        technologies: ["Node.js"],
      },
    });
    expect(result.required).toContain("React");
    expect(result.required).toContain("TypeScript");
    expect(result.required).toContain("Python");
    expect(result.required).toContain("SQL");
    expect(result.required).toContain("Node.js");
    expect(result.preferred).toContain("GraphQL");
    expect(result.preferred).toContain("Docker");
  });
});

describe("parseExperienceRequirement", () => {
  it("parses '5+ years'", () => {
    expect(parseExperienceRequirement("5+ years")).toBe(5);
  });

  it("parses '3 years'", () => {
    expect(parseExperienceRequirement("3 years")).toBe(3);
  });

  it("parses '10+ years of experience'", () => {
    expect(parseExperienceRequirement("10+ years of experience")).toBe(10);
  });

  it("returns null for unparseable", () => {
    expect(parseExperienceRequirement(null)).toBeNull();
    expect(parseExperienceRequirement("senior level")).toBeNull();
    expect(parseExperienceRequirement("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Scorer tests
// ---------------------------------------------------------------------------

describe("matchSkills", () => {
  it("identifies exact skill matches", () => {
    const result = matchSkills(
      ["React", "TypeScript", "Node.js"],
      ["React", "TypeScript", "GraphQL"],
      ["Docker"],
    );
    expect(result.matchedRequired).toContain("React");
    expect(result.matchedRequired).toContain("TypeScript");
    expect(result.missingRequired).toContain("GraphQL");
  });

  it("handles normalized skill matches", () => {
    const result = matchSkills(
      ["React", "node.js", "postgresql"],
      ["ReactJS", "Node", "Postgres"],
      [],
    );
    expect(result.matchedRequired).toContain("React");
    expect(result.matchedRequired).toContain("Node.js");
    expect(result.matchedRequired).toContain("PostgreSQL");
    expect(result.missingRequired).toHaveLength(0);
  });

  it("identifies preferred skill matches", () => {
    const result = matchSkills(
      ["React", "Docker"],
      ["React"],
      ["Docker", "Kubernetes"],
    );
    expect(result.matchedPreferred).toContain("Docker");
    expect(result.missingPreferred).toContain("Kubernetes");
  });

  it("handles empty arrays", () => {
    const result = matchSkills([], [], []);
    expect(result.matchedRequired).toHaveLength(0);
    expect(result.missingRequired).toHaveLength(0);
    expect(result.matchedPreferred).toHaveLength(0);
    expect(result.missingPreferred).toHaveLength(0);
  });

  it("generates evidence for each skill", () => {
    const result = matchSkills(["React"], ["React", "GraphQL"], []);
    expect(result.evidence.length).toBe(2);
    expect(result.evidence.find((e) => e.skill === "React")?.match).toBe("strong");
    expect(result.evidence.find((e) => e.skill === "GraphQL")?.match).toBe("missing");
  });
});

describe("calculateSkillScore", () => {
  it("returns 100 for all required skills matched", () => {
    const score = calculateSkillScore({
      matchedRequired: ["React", "TypeScript"],
      missingRequired: [],
      matchedPreferred: [],
      missingPreferred: [],
      evidence: [],
    });
    expect(score).toBe(100);
  });

  it("returns 0 for no required skills matched", () => {
    const score = calculateSkillScore({
      matchedRequired: [],
      missingRequired: ["React", "TypeScript"],
      matchedPreferred: [],
      missingPreferred: [],
      evidence: [],
    });
    expect(score).toBe(0);
  });

  it("weights required skills 60%, preferred 40%", () => {
    const score = calculateSkillScore({
      matchedRequired: ["React"],
      missingRequired: ["React"],
      matchedPreferred: ["Docker"],
      missingPreferred: ["Docker"],
      evidence: [],
    });
    // Required: 50% * 0.6 = 30
    // Preferred: 50% * 0.4 = 20
    // Total: 50
    expect(score).toBe(50);
  });

  it("returns 50 for empty inputs", () => {
    const score = calculateSkillScore({
      matchedRequired: [],
      missingRequired: [],
      matchedPreferred: [],
      missingPreferred: [],
      evidence: [],
    });
    expect(score).toBe(50);
  });

  it("always returns 0-100", () => {
    const extremes = [
      { matchedRequired: [], missingRequired: ["a", "b", "c", "d", "e"], matchedPreferred: [], missingPreferred: [], evidence: [] },
      { matchedRequired: ["a", "b", "c", "d", "e"], missingRequired: [], matchedPreferred: ["x", "y", "z"], missingPreferred: [], evidence: [] },
    ];
    for (const input of extremes) {
      const score = calculateSkillScore(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("calculateExperienceScore", () => {
  it("returns high score when exceeding requirement", () => {
    const score = calculateExperienceScore(7, "5+ years");
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("returns lower score when below requirement", () => {
    const score = calculateExperienceScore(2, "5+ years");
    expect(score).toBeLessThan(70);
  });

  it("returns neutral when no requirement specified", () => {
    const score = calculateExperienceScore(3, null);
    expect(score).toBe(MATCHING_WEIGHTS.experience.noRequirementDefault);
  });

  it("always returns 0-100", () => {
    for (const years of [0, 1, 3, 5, 10, 20]) {
      const score = calculateExperienceScore(years, "5+ years");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("calculateEducationScore", () => {
  it("returns 100 for exact degree match", () => {
    const score = calculateEducationScore(
      [{ degree: "Bachelor's", field: "CS" }],
      "Bachelor's in CS",
    );
    expect(score).toBe(100);
  });

  it("returns 90 for higher degree", () => {
    const score = calculateEducationScore(
      [{ degree: "Master's", field: "CS" }],
      "Bachelor's in CS",
    );
    expect(score).toBe(90);
  });

  it("returns lower for lower degree", () => {
    const score = calculateEducationScore(
      [{ degree: "Associate", field: "CS" }],
      "Bachelor's in CS",
    );
    expect(score).toBeLessThan(80);
  });

  it("returns neutral when no requirement", () => {
    const score = calculateEducationScore(
      [{ degree: "Bachelor's", field: "CS" }],
      null,
    );
    expect(score).toBe(MATCHING_WEIGHTS.education.noRequirementScore);
  });

  it("returns low for no education", () => {
    const score = calculateEducationScore([], "Bachelor's required");
    expect(score).toBeLessThanOrEqual(30);
  });
});

describe("calculateSeniorityScore", () => {
  it("returns 100 for exact match", () => {
    const score = calculateSeniorityScore("Senior", "Senior");
    expect(score).toBe(100);
  });

  it("returns 70 for one level off", () => {
    const score = calculateSeniorityScore("Mid-Level", "Senior");
    expect(score).toBe(70);
  });

  it("returns lower for two levels off", () => {
    const score = calculateSeniorityScore("Junior", "Senior");
    expect(score).toBe(40);
  });

  it("returns neutral when no requirement", () => {
    const score = calculateSeniorityScore("Senior", null);
    expect(score).toBe(MATCHING_WEIGHTS.seniority.noRequirementScore);
  });
});

describe("calculateScores", () => {
  it("returns combined scores with correct weights", () => {
    const skillResult = {
      matchedRequired: ["React"],
      missingRequired: ["GraphQL"],
      matchedPreferred: [],
      missingPreferred: [],
      evidence: [],
    };
    const scores = calculateScores(
      skillResult,
      5,
      [{ degree: "Bachelor's", field: "CS" }],
      "Senior",
      "5+ years",
      "Bachelor's",
      "Senior",
    );
    expect(scores.overallScore).toBeGreaterThanOrEqual(0);
    expect(scores.overallScore).toBeLessThanOrEqual(100);
    expect(scores.skillScore).toBeGreaterThanOrEqual(0);
    expect(scores.experienceScore).toBeGreaterThanOrEqual(0);
    expect(scores.educationScore).toBeGreaterThanOrEqual(0);
    expect(scores.seniorityScore).toBeGreaterThanOrEqual(0);
  });

  it("always produces overall score 0-100", () => {
    const combos = [
      { years: 0, seniority: "junior", jobSeniority: "senior" },
      { years: 10, seniority: "lead", jobSeniority: "junior" },
      { years: 5, seniority: "mid", jobSeniority: "mid" },
    ];
    for (const { years, seniority, jobSeniority } of combos) {
      const scores = calculateScores(
        { matchedRequired: ["a"], missingRequired: ["b", "c"], matchedPreferred: [], missingPreferred: [], evidence: [] },
        years,
        [{ degree: "BS", field: "CS" }],
        seniority,
        "5+ years",
        "BS",
        jobSeniority,
      );
      expect(scores.overallScore).toBeGreaterThanOrEqual(0);
      expect(scores.overallScore).toBeLessThanOrEqual(100);
    }
  });
});

describe("deriveRecommendation", () => {
  it("returns APPLY_NOW for high scores", () => {
    expect(deriveRecommendation(90, 85)).toBe("APPLY_NOW");
  });

  it("returns STRONG_FIT for good scores", () => {
    expect(deriveRecommendation(78, 70)).toBe("STRONG_FIT");
  });

  it("returns GOOD_FIT for moderate scores", () => {
    expect(deriveRecommendation(65, 60)).toBe("GOOD_FIT");
  });

  it("returns MODERATE_FIT for lower scores", () => {
    expect(deriveRecommendation(50, 45)).toBe("MODERATE_FIT");
  });

  it("returns WEAK_FIT for poor scores", () => {
    expect(deriveRecommendation(35, 30)).toBe("WEAK_FIT");
  });

  it("returns NOT_RECOMMENDED for very low scores", () => {
    expect(deriveRecommendation(20, 15)).toBe("NOT_RECOMMENDED");
  });
});

// ---------------------------------------------------------------------------
// Engine validation tests
// ---------------------------------------------------------------------------

describe("validateMatchInput", () => {
  const validResume: ParsedResume = {
    personal: { name: "Test", email: "test@test.com", phone: null, location: null },
    summary: "Test",
    skills: { technical: ["React"], tools: [], frameworks: [], languages: [] },
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    totalYearsExperience: 3,
    seniority: "mid",
    domains: [],
    strengths: [],
    potentialGaps: [],
    careerSignals: [],
    name: "Test",
    technologies: ["React"],
  };

  const validJob: FirestoreJob = {
    id: "job1",
    title: "Frontend Engineer",
    company: "Test Corp",
    location: "Remote",
    description: "Test",
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
  };

  it("accepts valid input", () => {
    expect(validateMatchInput({ resume: validResume, job: validJob }).valid).toBe(true);
  });

  it("rejects missing resume", () => {
    expect(validateMatchInput({ resume: null as unknown as ParsedResume, job: validJob }).valid).toBe(false);
  });

  it("rejects missing job", () => {
    expect(validateMatchInput({ resume: validResume, job: null as unknown as FirestoreJob }).valid).toBe(false);
  });

  it("rejects job without title", () => {
    expect(
      validateMatchInput({ resume: validResume, job: { ...validJob, title: "" } }).valid,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Score determinism test
// ---------------------------------------------------------------------------

describe("Score determinism", () => {
  it("produces identical scores for identical inputs", () => {
    const skillResult = {
      matchedRequired: ["React", "TypeScript"],
      missingRequired: ["GraphQL"],
      matchedPreferred: ["Docker"],
      missingPreferred: ["Kubernetes"],
      evidence: [],
    };

    const run1 = calculateScores(skillResult, 5, [{ degree: "BS", field: "CS" }], "senior", "5+ years", "BS", "senior");
    const run2 = calculateScores(skillResult, 5, [{ degree: "BS", field: "CS" }], "senior", "5+ years", "BS", "senior");

    expect(run1.overallScore).toBe(run2.overallScore);
    expect(run1.skillScore).toBe(run2.skillScore);
    expect(run1.experienceScore).toBe(run2.experienceScore);
    expect(run1.educationScore).toBe(run2.educationScore);
    expect(run1.seniorityScore).toBe(run2.seniorityScore);
  });
});

// ---------------------------------------------------------------------------
// Weights configuration test
// ---------------------------------------------------------------------------

describe("MATCHING_WEIGHTS", () => {
  it("overall weights sum to 1.0", () => {
    const sum =
      MATCHING_WEIGHTS.overall.skill +
      MATCHING_WEIGHTS.overall.experience +
      MATCHING_WEIGHTS.overall.education +
      MATCHING_WEIGHTS.overall.seniority;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("skill weights sum to 1.0", () => {
    const sum =
      MATCHING_WEIGHTS.skill.requiredWeight +
      MATCHING_WEIGHTS.skill.preferredWeight;
    expect(sum).toBeCloseTo(1.0, 10);
  });
});
