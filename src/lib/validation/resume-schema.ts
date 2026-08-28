// ============================================================================
// CareerPilot AI — Resume Parsing Zod Schema
// ============================================================================
//
// Validates the structured JSON output from Gemini before storing in
// Firestore. Every field is validated — malformed AI output is rejected.
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const PersonalInfoSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(50).nullable().default(null),
  location: z.string().max(200).nullable().default(null),
});

const SkillsSchema = z.object({
  technical: z.array(z.string().max(100)).default([]),
  tools: z.array(z.string().max(100)).default([]),
  frameworks: z.array(z.string().max(100)).default([]),
  languages: z.array(z.string().max(100)).default([]),
});

const ExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  location: z.string().max(200).nullable().default(null),
  startDate: z.string().max(50).default(""),
  endDate: z.string().max(50).nullable().default(null),
  current: z.boolean().default(false),
  responsibilities: z.array(z.string().max(500)).default([]),
  achievements: z.array(z.string().max(500)).default([]),
  technologies: z.array(z.string().max(100)).default([]),
});

const EducationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().max(200).default(""),
  field: z.string().max(200).default(""),
  startDate: z.string().max(50).default(""),
  endDate: z.string().max(50).nullable().default(null),
  graduationDate: z.string().max(50).nullable().default(null),
  gpa: z.number().nullable().default(null),
});

const ProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  technologies: z.array(z.string().max(100)).default([]),
  url: z.string().url().nullable().default(null),
});

// ---------------------------------------------------------------------------
// Main resume schema
// ---------------------------------------------------------------------------

export const ParsedResumeSchema = z.object({
  personal: PersonalInfoSchema,
  summary: z.string().max(5000).default(""),
  skills: SkillsSchema,
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(z.string().max(200)).default([]),
  projects: z.array(ProjectSchema).default([]),
  totalYearsExperience: z.number().min(0).max(50).default(0),
  seniority: z.string().max(100).default(""),
  domains: z.array(z.string().max(100)).default([]),
  strengths: z.array(z.string().max(500)).default([]),
  potentialGaps: z.array(z.string().max(500)).default([]),
  careerSignals: z.array(z.string().max(500)).default([]),
});

export type ParsedResumeData = z.infer<typeof ParsedResumeSchema>;

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Validates raw Gemini output against the resume schema.
 * Returns parsed data or throws with a friendly error.
 */
export function validateResumeData(raw: unknown): ParsedResumeData {
  const result = ParsedResumeSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ResumeValidationError(`Invalid resume data: ${issues}`);
  }
  return result.data;
}

export class ResumeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeValidationError";
  }
}
