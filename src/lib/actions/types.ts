// ============================================================================
// CareerPilot AI — Career Action Types
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

export type ActionType =
  | "INTERVIEW_PREP"
  | "FOLLOW_UP"
  | "APPLICATION_DEADLINE"
  | "ASSESSMENT"
  | "REVIEW_OFFER"
  | "HIGH_PRIORITY_JOB"
  | "APPLICATION_UPDATE"
  | "SYSTEM";

export const ACTION_TYPES: readonly ActionType[] = [
  "INTERVIEW_PREP",
  "FOLLOW_UP",
  "APPLICATION_DEADLINE",
  "ASSESSMENT",
  "REVIEW_OFFER",
  "HIGH_PRIORITY_JOB",
  "APPLICATION_UPDATE",
  "SYSTEM",
] as const;

// ---------------------------------------------------------------------------
// Action Priority
// ---------------------------------------------------------------------------

export type ActionPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export const ACTION_PRIORITIES: readonly ActionPriority[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

// ---------------------------------------------------------------------------
// Action Status
// ---------------------------------------------------------------------------

export type ActionStatus = "OPEN" | "COMPLETED" | "DISMISSED" | "EXPIRED";

export const ACTION_STATUSES: readonly ActionStatus[] = [
  "OPEN",
  "COMPLETED",
  "DISMISSED",
  "EXPIRED",
] as const;

// ---------------------------------------------------------------------------
// Firestore Action Document
// ---------------------------------------------------------------------------

export interface FirestoreAction {
  id: string;
  type: ActionType;
  priority: ActionPriority;
  title: string;
  description: string;
  applicationId: string | null;
  jobId: string | null;
  interviewId: string | null;
  dueAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  completedAt: string | null;
  dismissedAt: string | null;
  status: ActionStatus;
  actionUrl: string;
  sourceEventId: string | null;
  actionKey: string;
}

// ---------------------------------------------------------------------------
// Action Input (for API)
// ---------------------------------------------------------------------------

export interface ActionCreateInput {
  type: ActionType;
  priority: ActionPriority;
  title: string;
  description: string;
  applicationId?: string;
  jobId?: string;
  interviewId?: string;
  dueAt?: string;
  expiresAt?: string;
  actionUrl: string;
  sourceEventId?: string;
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const ActionTypeSchema = z.enum(ACTION_TYPES as unknown as [string, ...string[]]);
export const ActionPrioritySchema = z.enum(ACTION_PRIORITIES as unknown as [string, ...string[]]);
export const ActionStatusSchema = z.enum(ACTION_STATUSES as unknown as [string, ...string[]]);

export const FirestoreActionSchema = z.object({
  id: z.string().min(1),
  type: ActionTypeSchema,
  priority: ActionPrioritySchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  applicationId: z.string().nullable(),
  jobId: z.string().nullable(),
  interviewId: z.string().nullable(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
  status: ActionStatusSchema,
  actionUrl: z.string().min(1),
  sourceEventId: z.string().nullable(),
  actionKey: z.string().min(1),
});

export const ActionCreateInputSchema = z.object({
  type: ActionTypeSchema,
  priority: ActionPrioritySchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  applicationId: z.string().optional(),
  jobId: z.string().optional(),
  interviewId: z.string().optional(),
  dueAt: z.string().optional(),
  expiresAt: z.string().optional(),
  actionUrl: z.string().min(1),
  sourceEventId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Priority Display Helpers
// ---------------------------------------------------------------------------

export const ACTION_PRIORITY_COLORS: Record<ActionPriority, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-slate-100 text-slate-600",
};

export const ACTION_TYPE_ICONS: Record<ActionType, string> = {
  INTERVIEW_PREP: "Mic",
  FOLLOW_UP: "Clock",
  APPLICATION_DEADLINE: "AlertTriangle",
  ASSESSMENT: "FileText",
  REVIEW_OFFER: "Award",
  HIGH_PRIORITY_JOB: "Star",
  APPLICATION_UPDATE: "RefreshCw",
  SYSTEM: "Settings",
};
