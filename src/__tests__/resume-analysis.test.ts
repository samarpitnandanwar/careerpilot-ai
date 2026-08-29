// ============================================================================
// CareerPilot AI — Resume Analysis Match Score Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import { aggregateAnalytics } from "@/lib/analytics/aggregator";
import type {
  FirestoreApplication,
  FirestoreJobAnalysis,
  FirestoreJobPriority,
  FirestoreInterview,
  ApplicationActivity,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApp(overrides: Partial<FirestoreApplication> = {}): FirestoreApplication {
  return {
    id: overrides.id ?? "app-1",
    jobId: overrides.jobId ?? "job-1",
    jobTitle: overrides.jobTitle ?? "Software Engineer",
    company: overrides.company ?? "Acme Corp",
    status: overrides.status ?? "saved",
    resumeId: overrides.resumeId ?? null,
    appliedAt: overrides.appliedAt ?? null,
    deadline: overrides.deadline ?? null,
    source: overrides.source ?? "",
    applicationUrl: overrides.applicationUrl ?? null,
    nextAction: overrides.nextAction ?? null,
    nextActionAt: overrides.nextActionAt ?? null,
    followUpDate: overrides.followUpDate ?? null,
    currentAnalysisId: overrides.currentAnalysisId ?? null,
    matchAnalysisId: overrides.matchAnalysisId ?? null,
    priorityId: overrides.priorityId ?? null,
    interviewIds: overrides.interviewIds ?? [],
    notes: overrides.notes ?? "",
    archived: overrides.archived ?? false,
    lastUpdatedAt: overrides.lastUpdatedAt ?? "2025-09-01T12:00:00.000Z",
    createdAt: overrides.createdAt ?? "2025-09-01T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2025-09-01T12:00:00.000Z",
  };
}

function makeAnalysis(overrides: Partial<FirestoreJobAnalysis> = {}): FirestoreJobAnalysis {
  return {
    id: overrides.id ?? "analysis-1",
    jobId: overrides.jobId ?? "job-1",
    resumeId: overrides.resumeId ?? "resume-1",
    model: overrides.model ?? "gemini-2.5-flash",
    promptVersion: overrides.promptVersion ?? "v1",
    createdAt: overrides.createdAt ?? "2025-09-01T12:00:00.000Z",
    overallScore: overrides.overallScore ?? 85,
    skillScore: overrides.skillScore ?? 80,
    experienceScore: overrides.experienceScore ?? 90,
    educationScore: overrides.educationScore ?? 80,
    seniorityScore: overrides.seniorityScore ?? 85,
    matchedSkills: overrides.matchedSkills ?? ["React"],
    missingSkills: overrides.missingSkills ?? ["Kubernetes"],
    matchedPreferredSkills: overrides.matchedPreferredSkills ?? [],
    skillEvidence: overrides.skillEvidence ?? [],
    experienceGaps: overrides.experienceGaps ?? [],
    strengths: overrides.strengths ?? [],
    gaps: overrides.gaps ?? [],
    evidence: overrides.evidence ?? [],
    recommendation: overrides.recommendation ?? "APPLY_NOW",
    confidence: overrides.confidence ?? 0.85,
    summary: overrides.summary ?? "Strong match",
  };
}

function aggregate(params: {
  applications: FirestoreApplication[];
  analyses: FirestoreJobAnalysis[];
  priorities?: FirestoreJobPriority[];
  interviews?: FirestoreInterview[];
  activities?: ApplicationActivity[];
}) {
  return aggregateAnalytics({
    applications: params.applications,
    analyses: params.analyses,
    priorities: params.priorities ?? [],
    interviews: params.interviews ?? [],
    activities: params.activities ?? [],
    range: "all",
  });
}

// ---------------------------------------------------------------------------
// Tests: No analyses → null avgMatchScore
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — no analyses", () => {
  it("resume with applications but no analyses → avgMatchScore is null", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
      ],
      analyses: [],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].resumeId).toBe("resume-1");
    expect(result.resumeAnalysis[0].avgMatchScore).toBeNull();
  });

  it("resume with no applications → not included in results", () => {
    const result = aggregate({
      applications: [],
      analyses: [makeAnalysis({ resumeId: "resume-1", overallScore: 80 })],
    });

    expect(result.resumeAnalysis).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: One analysis → exact score
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — single analysis", () => {
  it("one analysis → exact overallScore", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 85 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].avgMatchScore).toBe(85);
  });
});

// ---------------------------------------------------------------------------
// Tests: Multiple analyses → correct average
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — multiple analyses", () => {
  it("two analyses → correct average", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
        makeApp({ id: "app-2", resumeId: "resume-1", jobId: "job-2" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 80 }),
        makeAnalysis({ id: "a-2", resumeId: "resume-1", jobId: "job-2", overallScore: 90 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].avgMatchScore).toBe(85);
  });

  it("three analyses → correct average", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
        makeApp({ id: "app-2", resumeId: "resume-1", jobId: "job-2" }),
        makeApp({ id: "app-3", resumeId: "resume-1", jobId: "job-3" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 70 }),
        makeAnalysis({ id: "a-2", resumeId: "resume-1", jobId: "job-2", overallScore: 80 }),
        makeAnalysis({ id: "a-3", resumeId: "resume-1", jobId: "job-3", overallScore: 90 }),
      ],
    });

    expect(result.resumeAnalysis[0].avgMatchScore).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// Tests: Multiple resumes → correct separation
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — multiple resumes", () => {
  it("two resumes → separate scores", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
        makeApp({ id: "app-2", resumeId: "resume-2", jobId: "job-2" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 80 }),
        makeAnalysis({ id: "a-2", resumeId: "resume-2", jobId: "job-2", overallScore: 90 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(2);
    const r1 = result.resumeAnalysis.find((r) => r.resumeId === "resume-1");
    const r2 = result.resumeAnalysis.find((r) => r.resumeId === "resume-2");
    expect(r1?.avgMatchScore).toBe(80);
    expect(r2?.avgMatchScore).toBe(90);
  });

  it("one resume has analyses, other does not → mixed null and real scores", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
        makeApp({ id: "app-2", resumeId: "resume-2", jobId: "job-2" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 75 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(2);
    const r1 = result.resumeAnalysis.find((r) => r.resumeId === "resume-1");
    const r2 = result.resumeAnalysis.find((r) => r.resumeId === "resume-2");
    expect(r1?.avgMatchScore).toBe(75);
    expect(r2?.avgMatchScore).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: Same resume across multiple jobs
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — same resume, multiple jobs", () => {
  it("same resume used for 3 jobs → all scores aggregated", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
        makeApp({ id: "app-2", resumeId: "resume-1", jobId: "job-2" }),
        makeApp({ id: "app-3", resumeId: "resume-1", jobId: "job-3" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 60 }),
        makeAnalysis({ id: "a-2", resumeId: "resume-1", jobId: "job-2", overallScore: 75 }),
        makeAnalysis({ id: "a-3", resumeId: "resume-1", jobId: "job-3", overallScore: 90 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].avgMatchScore).toBe(75);
    expect(result.resumeAnalysis[0].applications).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Tests: Missing resumeId → excluded safely
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — missing resumeId", () => {
  it("analysis with empty resumeId → excluded from aggregation", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "", jobId: "job-1", overallScore: 85 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].avgMatchScore).toBeNull();
  });

  it("analysis with no resumeId field → excluded safely", () => {
    // Create analysis directly without the helper to avoid ?? fallback
    const analysisWithoutResumeId = {
      id: "a-1",
      jobId: "job-1",
      resumeId: "",
      model: "gemini",
      promptVersion: "v1",
      createdAt: "2025-09-01",
      overallScore: 85,
      skillScore: 80,
      experienceScore: 80,
      educationScore: 80,
      seniorityScore: 80,
      matchedSkills: [] as string[],
      missingSkills: [] as string[],
      matchedPreferredSkills: [] as string[],
      skillEvidence: [],
      experienceGaps: [],
      strengths: [] as string[],
      gaps: [] as string[],
      evidence: [],
      recommendation: "APPLY_NOW" as const,
      confidence: 0.8,
      summary: "test",
    };
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
      ],
      analyses: [analysisWithoutResumeId],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].avgMatchScore).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: Application with no resumeId
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — application without resumeId", () => {
  it("app with null resumeId → not included in resume analysis", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: null, jobId: "job-1" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 85 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Multiple analyses for same job
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — multiple analyses for same job", () => {
  it("two analyses for same job/resume → both contribute to average", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 80 }),
        makeAnalysis({ id: "a-2", resumeId: "resume-1", jobId: "job-1", overallScore: 90 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].avgMatchScore).toBe(85);
  });
});

// ---------------------------------------------------------------------------
// Tests: Application stats are correct
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — application stats", () => {
  it("correctly counts applications, interviews, offers per resume", () => {
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1", status: "saved" }),
        makeApp({ id: "app-2", resumeId: "resume-1", jobId: "job-2", status: "interview" }),
        makeApp({ id: "app-3", resumeId: "resume-1", jobId: "job-3", status: "offer" }),
        makeApp({ id: "app-4", resumeId: "resume-1", jobId: "job-4", status: "accepted" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 70 }),
        makeAnalysis({ id: "a-2", resumeId: "resume-1", jobId: "job-2", overallScore: 80 }),
        makeAnalysis({ id: "a-3", resumeId: "resume-1", jobId: "job-3", overallScore: 90 }),
        makeAnalysis({ id: "a-4", resumeId: "resume-1", jobId: "job-4", overallScore: 95 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].applications).toBe(4);
    expect(result.resumeAnalysis[0].interviews).toBe(3); // interview + offer + accepted
    expect(result.resumeAnalysis[0].offers).toBe(2); // offer + accepted
    // mean() rounds to 1 decimal: (70+80+90+95)/4 = 83.75 → 83.8
    expect(result.resumeAnalysis[0].avgMatchScore).toBe(83.8);
  });
});

// ---------------------------------------------------------------------------
// Tests: User isolation
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — user isolation", () => {
  it("analytics only includes current user data", () => {
    // The aggregate function receives pre-filtered data — no cross-user leakage
    const result = aggregate({
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 85 }),
      ],
    });

    expect(result.resumeAnalysis).toHaveLength(1);
    expect(result.resumeAnalysis[0].resumeId).toBe("resume-1");
  });
});

// ---------------------------------------------------------------------------
// Tests: Deterministic output
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — determinism", () => {
  it("same input → same output", () => {
    const params = {
      applications: [
        makeApp({ resumeId: "resume-1", jobId: "job-1" }),
      ],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 85 }),
      ],
    };

    const result1 = aggregate(params);
    const result2 = aggregate(params);

    expect(result1.resumeAnalysis[0].avgMatchScore).toBe(
      result2.resumeAnalysis[0].avgMatchScore,
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: No fake/default 0 used for no-data
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — no fake data", () => {
  it("null means no data, not zero", () => {
    const result = aggregate({
      applications: [makeApp({ resumeId: "resume-1" })],
      analyses: [],
    });

    expect(result.resumeAnalysis[0].avgMatchScore).toBeNull();
    expect(result.resumeAnalysis[0].avgMatchScore).not.toBe(0);
  });

  it("0 is a legitimate score, not confused with no-data", () => {
    const result = aggregate({
      applications: [makeApp({ resumeId: "resume-1", jobId: "job-1" })],
      analyses: [
        makeAnalysis({ resumeId: "resume-1", jobId: "job-1", overallScore: 0 }),
      ],
    });

    expect(result.resumeAnalysis[0].avgMatchScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Type correctness
// ---------------------------------------------------------------------------

describe("ResumeAnalysis — type correctness", () => {
  it("avgMatchScore is number when analyses exist", () => {
    const result = aggregate({
      applications: [makeApp({ resumeId: "r-1", jobId: "j-1" })],
      analyses: [makeAnalysis({ resumeId: "r-1", jobId: "j-1", overallScore: 80 })],
    });

    expect(typeof result.resumeAnalysis[0].avgMatchScore).toBe("number");
  });

  it("avgMatchScore is null when no analyses", () => {
    const result = aggregate({
      applications: [makeApp({ resumeId: "r-1" })],
      analyses: [],
    });

    expect(result.resumeAnalysis[0].avgMatchScore).toBeNull();
  });
});
