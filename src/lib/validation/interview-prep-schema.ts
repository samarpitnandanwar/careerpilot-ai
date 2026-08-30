// ============================================================================
// CareerPilot AI — Interview Prep Zod Schema
// ============================================================================
//
// Strict Zod schema for validating Gemini's interview preparation output.
// Never trust raw Gemini output — always validate before storing.
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Question schema
// ---------------------------------------------------------------------------

export const InterviewPrepQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(10).max(2000),
  category: z.string().min(1).max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  whyLikely: z.string().min(5).max(1000),
  whatItEvaluates: z.string().min(5).max(1000),
  answerGuidance: z.string().min(10).max(3000),
  resumeEvidence: z.array(z.string().max(1000)).max(10).default([]),
  followUpQuestions: z.array(z.string().max(500)).max(5).default([]),
});

export type InterviewPrepQuestionInput = z.infer<typeof InterviewPrepQuestionSchema>;

// ---------------------------------------------------------------------------
// Full interview prep schema
// ---------------------------------------------------------------------------

export const InterviewPrepOutputSchema = z.object({
  overview: z.string().min(10).max(3000),
  questions: z.array(InterviewPrepQuestionSchema).min(3).max(20),
  // Gemini may return alternative field names for these:
  strengthsToEmphasize: z.array(z.string().min(5).max(500)).min(1).max(10)
    .or(z.array(z.string().min(5).max(500)).min(1).max(10)),
  strengthsToHighlight: z.array(z.string().min(5).max(500)).min(1).max(10).optional(),
  gapsToPrepare: z.array(z.string().min(5).max(500)).min(0).max(10),
  areasToPrepare: z.array(z.string().min(5).max(500)).min(0).max(10).optional(),
  topicsToReview: z.array(z.string().min(3).max(300)).min(1).max(15)
    .or(z.array(z.string().min(3).max(300)).min(1).max(15)),
  focusAreas: z.array(z.string().min(3).max(300)).min(1).max(15).optional(),
  finalTips: z.array(z.string().min(5).max(500)).min(1).max(10)
    .or(z.array(z.string().min(5).max(500)).min(1).max(10)),
  overallTips: z.array(z.string().min(5).max(500)).min(1).max(10).optional(),
  confidence: z.number().min(0).max(100).nullable().default(null),
});

export type InterviewPrepOutput = z.infer<typeof InterviewPrepOutputSchema>;

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

export function validateInterviewPrepOutput(
  data: unknown,
): { valid: true; data: InterviewPrepOutput } | { valid: false; errors: string[] } {
  const result = InterviewPrepOutputSchema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  return { valid: false, errors };
}
