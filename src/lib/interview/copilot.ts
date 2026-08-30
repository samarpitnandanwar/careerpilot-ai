// ============================================================================
// CareerPilot AI — Interview Copilot Service
// ============================================================================
//
// Orchestrates the full interview preparation pipeline:
//   Load context → Build prompt → Call Gemini → Validate → Output
//
// Gemini runs server-side ONLY. Never called from browser.
// ============================================================================

import type {
  FirestoreJob,
  FirestoreResume,
  FirestoreJobAnalysis,
  FirestoreInterview,
  FirestoreInterviewPrep,
  InterviewPrepQuestion,
} from "@/types";
import { generateContent } from "@/lib/ai/vertex";
import {
  buildInterviewCopilotPrompt,
  INTERVIEW_COPILOT_PROMPT_VERSION,
  type InterviewCopilotContext,
} from "@/lib/ai/interview-copilot-prompts";
import { validateInterviewPrepOutput } from "@/lib/validation/interview-prep-schema";
import { getDb, interviewPrepCol, newId, now } from "@/lib/firestore/db";
import { handleFirestoreError } from "@/lib/api-helpers";

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface InterviewCopilotInput {
  applicationId: string;
  job: FirestoreJob;
  resume: FirestoreResume;
  matchAnalysis: FirestoreJobAnalysis | null;
  interview: FirestoreInterview | null;
}

// ---------------------------------------------------------------------------
// Build structured context from existing data
// ---------------------------------------------------------------------------

export function buildCopilotContext(input: InterviewCopilotInput): InterviewCopilotContext {
  const { job, resume, matchAnalysis, interview } = input;
  const parsed = resume.parsedData;
  const jobParsed = job.parsedData;

  return {
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
    requiredSkills: jobParsed?.requiredSkills ?? job.skills,
    preferredSkills: jobParsed?.preferredSkills ?? [],
    experienceRequirement: jobParsed?.experienceRequirement ?? job.requirements,
    educationRequirement: jobParsed?.education ?? "",
    seniorityLevel: jobParsed?.seniorityLevel ?? "",
    responsibilities: jobParsed?.responsibilities ?? [],
    candidateName: parsed?.personal.name ?? parsed?.name ?? "Candidate",
    candidateSummary: parsed?.summary ?? "",
    candidateSkills: {
      technical: parsed?.skills.technical ?? parsed?.technologies ?? [],
      tools: parsed?.skills.tools ?? [],
      frameworks: parsed?.skills.frameworks ?? [],
    },
    candidateExperience: (parsed?.experience ?? []).map((exp) => ({
      company: exp.company,
      role: exp.role || exp.title,
      responsibilities: exp.responsibilities ?? [],
      achievements: exp.achievements ?? [],
      technologies: exp.technologies ?? exp.skills ?? [],
    })),
    candidateEducation: (parsed?.education ?? []).map((edu) => ({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
    })),
    candidateProjects: (parsed?.projects ?? []).map((proj) => ({
      name: proj.name,
      description: proj.description,
      technologies: proj.technologies,
    })),
    totalYearsExperience: parsed?.totalYearsExperience ?? 0,
    candidateSeniority: parsed?.seniority ?? "",
    matchedSkills: matchAnalysis?.matchedSkills ?? [],
    missingSkills: matchAnalysis?.missingSkills ?? [],
    matchScore: matchAnalysis?.overallScore ?? 0,
    skillScore: matchAnalysis?.skillScore ?? 0,
    experienceScore: matchAnalysis?.experienceScore ?? 0,
    strengths: matchAnalysis?.strengths ?? [],
    gaps: matchAnalysis?.gaps ?? [],
    experienceGaps: (matchAnalysis?.experienceGaps ?? []).map((g) => ({
      area: g.area,
      detail: g.detail,
      severity: g.severity,
    })),
    interviewType: interview?.interviewType ?? "technical",
    interviewRound: interview?.round ?? 1,
  };
}

// ---------------------------------------------------------------------------
// Generate interview preparation via Gemini
// ---------------------------------------------------------------------------

export async function generateInterviewPrep(
  input: InterviewCopilotInput,
): Promise<Omit<FirestoreInterviewPrep, "id" | "createdAt" | "updatedAt">> {
  const context = buildCopilotContext(input);

  // Build the prompt
  const prompt = buildInterviewCopilotPrompt(context);

  // Call Gemini
  let rawResponse: string;
  try {
    rawResponse = await generateContent(prompt);
  } catch (error) {
    throw new InterviewCopilotError(
      `Interview preparation generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "GEMINI_FAILED",
    );
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    // Attempt deterministic JSON recovery
    const recovered = attemptJsonRecovery(rawResponse);
    if (!recovered) {
      throw new InterviewCopilotError(
        "Failed to parse interview preparation response",
        "INVALID_JSON",
      );
    }
    parsed = recovered;
  }

  // Validate with Zod
  const validation = validateInterviewPrepOutput(parsed);
  if (!validation.valid) {
    throw new InterviewCopilotError(
      `Interview preparation validation failed: ${validation.errors.join(", ")}`,
      "VALIDATION_FAILED",
    );
  }

  // Build output
  const output = validation.data;

  // Ensure question IDs are unique
  const questions: InterviewPrepQuestion[] = output.questions.map((q, idx) => ({
    ...q,
    id: q.id || `q-${idx + 1}`,
  }));

  // Handle alternative field names from Gemini (may use different names)
  const strengthsToEmphasize = output.strengthsToEmphasize ??
    (output as unknown as Record<string, unknown>).strengthsToHighlight as string[] ?? [];
  const gapsToPrepare = output.gapsToPrepare ??
    (output as unknown as Record<string, unknown>).areasToPrepare as string[] ?? [];
  const topicsToReview = output.topicsToReview ??
    (output as unknown as Record<string, unknown>).focusAreas as string[] ?? [];
  const finalTips = output.finalTips ??
    (output as unknown as Record<string, unknown>).overallTips as string[] ?? [];

  return {
    applicationId: input.applicationId,
    jobId: input.job.id,
    resumeId: input.resume.id,
    interviewId: input.interview?.id ?? null,
    model: "gemini",
    promptVersion: INTERVIEW_COPILOT_PROMPT_VERSION,
    overview: output.overview,
    questions,
    strengthsToEmphasize: strengthsToEmphasize as string[],
    gapsToPrepare: gapsToPrepare as string[],
    topicsToReview: topicsToReview as string[],
    finalTips: finalTips as string[],
    confidence: output.confidence ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Save to Firestore
// ---------------------------------------------------------------------------

export async function saveInterviewPrep(
  uid: string,
  applicationId: string,
  data: Omit<FirestoreInterviewPrep, "id" | "createdAt" | "updatedAt">,
): Promise<FirestoreInterviewPrep> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "interviewPrep");
    const nowStr = now();

    const prep: FirestoreInterviewPrep = {
      id,
      ...data,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await interviewPrepCol(db, uid, applicationId).doc(id).set(prep);
    return prep;
  });
}

// ---------------------------------------------------------------------------
// Get latest interview prep for an application
// ---------------------------------------------------------------------------

export async function getLatestInterviewPrep(
  uid: string,
  applicationId: string,
): Promise<FirestoreInterviewPrep | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await interviewPrepCol(db, uid, applicationId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    return snap.docs.length > 0
      ? (snap.docs[0].data() as FirestoreInterviewPrep)
      : null;
  });
}

// ---------------------------------------------------------------------------
// Get all interview prep for an application
// ---------------------------------------------------------------------------

export async function getInterviewPreps(
  uid: string,
  applicationId: string,
): Promise<FirestoreInterviewPrep[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await interviewPrepCol(db, uid, applicationId)
      .orderBy("createdAt", "desc")
      .get();

    return snap.docs.map((doc) => doc.data() as FirestoreInterviewPrep);
  });
}

// ---------------------------------------------------------------------------
// JSON recovery helper
// ---------------------------------------------------------------------------

function attemptJsonRecovery(raw: string): unknown | null {
  try {
    // Try to find JSON object in the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Recovery failed
  }
  return null;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class InterviewCopilotError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "InterviewCopilotError";
  }
}
