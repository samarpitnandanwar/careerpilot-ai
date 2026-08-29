// ============================================================================
// CareerPilot AI — Zod Validation Schemas
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const ProfileSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(200),
  headline: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
  yearsOfExperience: z.number().int().min(0).max(50).default(0),
  currentRole: z.string().max(200).default(""),
  targetRoles: z.array(z.string().max(100)).max(20).default([]),
  targetCompanies: z.array(z.string().max(100)).max(50).default([]),
  skills: z.array(z.string().max(100)).max(100).default([]),
  education: z.string().max(500).default(""),
  certifications: z.array(z.string().max(200)).max(30).default([]),
  preferredLocations: z.array(z.string().max(200)).max(20).default([]),
  remotePreference: z.string().max(50).default("remote"),
  salaryMin: z.number().int().min(0).nullable().default(null),
  salaryMax: z.number().int().min(0).nullable().default(null),
  noticePeriod: z.string().max(100).default(""),
  workAuthorization: z.string().max(200).default(""),
  careerGoals: z.string().max(2000).default(""),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

export const ResumeCreateSchema = z.object({
  fileName: z.string().min(1, "File name is required").max(255),
  storagePath: z.string().min(1, "Storage path is required"),
  fileType: z.string().min(1),
  fileSize: z.number().int().min(1),
});

export type ResumeCreateInput = z.infer<typeof ResumeCreateSchema>;

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export const JobCreateSchema = z.object({
  title: z.string().min(1, "Job title is required").max(300),
  company: z.string().min(1, "Company is required").max(200),
  location: z.string().max(300).default(""),
  url: z.string().url().nullable().default(null),
  description: z.string().max(50000).default(""),
  source: z.string().max(100).default("manual"),
  employmentType: z.string().max(50).default("full-time"),
  salary: z.string().max(100).default(""),
  skills: z.array(z.string().max(100)).max(50).default([]),
  requirements: z.string().max(10000).default(""),
  postedAt: z.string().nullable().default(null),
  deadline: z.string().nullable().default(null),
});

export const JobUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  company: z.string().min(1).max(200).optional(),
  location: z.string().max(300).optional(),
  url: z.string().url().nullable().optional(),
  description: z.string().max(50000).optional(),
  source: z.string().max(100).optional(),
  employmentType: z.string().max(50).optional(),
  salary: z.string().max(100).optional(),
  skills: z.array(z.string().max(100)).max(50).optional(),
  requirements: z.string().max(10000).optional(),
  deadline: z.string().nullable().optional(),
  // NOTE: status is intentionally excluded — job status must be
  // server-controlled. Clients cannot change it via PATCH.
});

export type JobCreateInput = z.infer<typeof JobCreateSchema>;
export type JobUpdateInput = z.infer<typeof JobUpdateSchema>;

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export const ApplicationCreateSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  jobTitle: z.string().min(1, "Job title is required").max(300),
  company: z.string().min(1, "Company is required").max(200),
  resumeId: z.string().nullable().default(null),
  source: z.string().max(100).default("manual"),
  applicationUrl: z.string().url().nullable().default(null),
  deadline: z.string().nullable().default(null),
  notes: z.string().max(5000).default(""),
  initialStatus: z.enum(["saved", "applied"]).default("saved"),
});

export const ApplicationUpdateSchema = z.object({
  notes: z.string().max(5000).optional(),
  deadline: z.string().nullable().optional(),
  followUpDate: z.string().nullable().optional(),
  applicationUrl: z.string().url().nullable().optional(),
  source: z.string().max(100).optional(),
});

export const ApplicationStatusChangeSchema = z.object({
  status: z.enum([
    "applied", "screening", "assessment", "interview",
    "offer", "accepted", "rejected", "withdrawn",
  ]),
  message: z.string().max(1000).default(""),
});

export const ApplicationNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(5000),
});

export type ApplicationCreateInput = z.infer<typeof ApplicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof ApplicationUpdateSchema>;

// ---------------------------------------------------------------------------
// Interview
// ---------------------------------------------------------------------------

export const InterviewCreateSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  scheduledAt: z.string().nullable().default(null),
  interviewType: z.enum(["technical", "behavioral", "hr", "managerial", "system_design", "case_study", "other"]),
  round: z.number().int().min(1).max(20).default(1),
  notes: z.string().max(5000).default(""),
});

export const InterviewUpdateSchema = z.object({
  scheduledAt: z.string().nullable().optional(),
  interviewType: z.enum(["technical", "behavioral", "hr", "managerial", "system_design", "case_study", "other"]).optional(),
  round: z.number().int().min(1).max(20).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).optional(),
  questions: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
  feedback: z.string().max(10000).optional(),
});

export type InterviewCreateInput = z.infer<typeof InterviewCreateSchema>;
export type InterviewUpdateInput = z.infer<typeof InterviewUpdateSchema>;

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export const NotificationCreateSchema = z.object({
  type: z.string().min(1, "Type is required").max(50),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().max(2000).default(""),
  scheduledFor: z.string().nullable().default(null),
  relatedEntityType: z.string().max(50).nullable().default(null),
  relatedEntityId: z.string().max(100).nullable().default(null),
});

export type NotificationCreateInput = z.infer<typeof NotificationCreateSchema>;
