// ============================================================================
// CareerPilot AI — Notification Types
// ============================================================================

// ---------------------------------------------------------------------------
// Notification Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_REMINDER"
  | "FOLLOW_UP_DUE"
  | "APPLICATION_DEADLINE_APPROACHING"
  | "APPLICATION_DEADLINE_EXPIRED"
  | "APPLICATION_STATUS_CHANGED"
  | "OFFER_RECEIVED"
  | "APPLICATION_REJECTED"
  | "ASSESSMENT_DUE"
  | "HIGH_PRIORITY_JOB"
  | "RESUME_PROCESSED"
  | "RESUME_PROCESSING_FAILED";

export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_REMINDER",
  "FOLLOW_UP_DUE",
  "APPLICATION_DEADLINE_APPROACHING",
  "APPLICATION_DEADLINE_EXPIRED",
  "APPLICATION_STATUS_CHANGED",
  "OFFER_RECEIVED",
  "APPLICATION_REJECTED",
  "ASSESSMENT_DUE",
  "HIGH_PRIORITY_JOB",
  "RESUME_PROCESSED",
  "RESUME_PROCESSING_FAILED",
] as const;

// ---------------------------------------------------------------------------
// Notification Priority
// ---------------------------------------------------------------------------

export type NotificationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// ---------------------------------------------------------------------------
// Firestore Notification Document
// ---------------------------------------------------------------------------

export interface FirestoreNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  applicationId: string | null;
  jobId: string | null;
  interviewId: string | null;
  resumeId: string | null;
  actionId: string | null;
  sourceEventId: string | null;
  notificationKey: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Notification Input (for API)
// ---------------------------------------------------------------------------

export interface NotificationCreateInput {
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
  jobId?: string;
  interviewId?: string;
  resumeId?: string;
  sourceEventId?: string;
}

// ---------------------------------------------------------------------------
// Priority Display Helpers
// ---------------------------------------------------------------------------

export const NOTIFICATION_PRIORITY_COLORS: Record<NotificationPriority, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-slate-100 text-slate-600",
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  INTERVIEW_SCHEDULED: "Mic",
  INTERVIEW_REMINDER: "Bell",
  FOLLOW_UP_DUE: "Clock",
  APPLICATION_DEADLINE_APPROACHING: "AlertTriangle",
  APPLICATION_DEADLINE_EXPIRED: "AlertCircle",
  APPLICATION_STATUS_CHANGED: "RefreshCw",
  OFFER_RECEIVED: "Award",
  APPLICATION_REJECTED: "XCircle",
  ASSESSMENT_DUE: "FileText",
  HIGH_PRIORITY_JOB: "Star",
  RESUME_PROCESSED: "CheckCircle",
  RESUME_PROCESSING_FAILED: "XCircle",
};
