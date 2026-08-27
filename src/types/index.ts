// ============================================================================
// CareerPilot AI — Core Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// User & Authentication
// ---------------------------------------------------------------------------

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Career Profile
// ---------------------------------------------------------------------------

export interface CareerProfile {
  id: string;
  userId: string;
  headline: string;
  summary: string;
  targetRoles: string[];
  targetCompanies: string[];
  preferredLocations: string[];
  workPreferences: WorkPreferences;
  salaryExpectation: SalaryRange | null;
  yearsOfExperience: number;
  educationLevel: EducationLevel;
  createdAt: string;
  updatedAt: string;
}

export interface WorkPreferences {
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  fullTime: boolean;
  partTime: boolean;
  contract: boolean;
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
}

export type EducationLevel =
  | "high_school"
  | "associate"
  | "bachelor"
  | "master"
  | "doctorate"
  | "other";

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  parsedAt: string | null;
  status: ResumeStatus;
  parsedData: ParsedResume | null;
}

export type ResumeStatus = "uploaded" | "parsing" | "parsed" | "error";

export interface ParsedResume {
  name: string;
  email: string;
  phone: string | null;
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  certifications: string[];
  projects: ResumeProject[];
  yearsOfExperience: number;
  technologies: string[];
}

export interface ResumeExperience {
  company: string;
  title: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string;
  skills: string[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  field: string;
  graduationDate: string | null;
  gpa: number | null;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url: string | null;
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export interface Job {
  id: string;
  userId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string | null;
  salaryRange: SalaryRange | null;
  status: JobStatus;
  deadline: string | null;
  parsedData: ParsedJob | null;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus =
  | "saved"
  | "analyzing"
  | "analyzed"
  | "error";

export interface ParsedJob {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirement: string;
  education: string;
  responsibilities: string[];
  keywords: string[];
  employmentType: string;
  seniorityLevel: string;
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  job: Job | null;
  status: ApplicationStatus;
  matchAnalysis: MatchAnalysis | null;
  priorityScore: PriorityScore | null;
  appliedAt: string | null;
  deadline: string | null;
  followUpDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  saved: "bg-slate-100 text-slate-700",
  applied: "bg-blue-100 text-blue-700",
  screening: "bg-yellow-100 text-yellow-700",
  interview: "bg-purple-100 text-purple-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

// ---------------------------------------------------------------------------
// AI: Match Analysis (explainable)
// ---------------------------------------------------------------------------

export interface MatchAnalysis {
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  responsibilityAlignment: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedPreferredSkills: string[];
  experienceGaps: ExperienceGap[];
  evidence: MatchEvidence[];
  recommendation: MatchRecommendation;
  summary: string;
}

export type MatchRecommendation =
  | "APPLY_NOW"
  | "STRONG_FIT"
  | "GOOD_FIT"
  | "MODERATE_FIT"
  | "WEAK_FIT"
  | "NOT_RECOMMENDED";

export interface ExperienceGap {
  area: string;
  detail: string;
  severity: "critical" | "moderate" | "minor";
}

export interface MatchEvidence {
  dimension: string;
  score: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// AI: Priority Score
// ---------------------------------------------------------------------------

export interface PriorityScore {
  score: number;
  level: PriorityLevel;
  recommendation: string;
  explanation: string;
  factors: PriorityFactor[];
}

export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface PriorityFactor {
  name: string;
  weight: number;
  value: number;
  impact: string;
}

// ---------------------------------------------------------------------------
// AI: Interview Preparation
// ---------------------------------------------------------------------------

export interface InterviewPrep {
  id: string;
  applicationId: string;
  userId: string;
  technicalQuestions: InterviewQuestion[];
  behavioralQuestions: InterviewQuestion[];
  roleSpecificQuestions: InterviewQuestion[];
  weakAreas: string[];
  improvementSuggestions: string[];
  generatedAt: string;
}

export interface InterviewQuestion {
  question: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  expectedTopics: string[];
  userAnswer: string | null;
  aiFeedback: string | null;
  score: number | null;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsData {
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  interviewRate: number;
  offerRate: number;
  averageMatchScore: number;
  highestPerformingSkills: SkillStat[];
  commonSkillGaps: SkillStat[];
  applicationActivity: ActivityPoint[];
  monthlyTrends: MonthlyTrend[];
}

export interface SkillStat {
  skill: string;
  count: number;
  averageScore: number;
}

export interface ActivityPoint {
  date: string;
  applications: number;
  interviews: number;
}

export interface MonthlyTrend {
  month: string;
  applications: number;
  interviews: number;
  offers: number;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardData {
  applicationCount: number;
  interviewCount: number;
  offerCount: number;
  averageMatchScore: number;
  upcomingDeadlines: UpcomingDeadline[];
  highPriorityJobs: HighPriorityJob[];
  skillGaps: string[];
  recentActivity: RecentActivity[];
}

export interface UpcomingDeadline {
  jobId: string;
  title: string;
  company: string;
  deadline: string;
  daysUntil: number;
}

export interface HighPriorityJob {
  jobId: string;
  title: string;
  company: string;
  priorityScore: number;
  matchScore: number;
}

export interface RecentActivity {
  id: string;
  type: "application" | "job" | "resume" | "interview";
  title: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// API Responses
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Firestore Document Types
// ---------------------------------------------------------------------------

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
}

export interface FirestoreProfile {
  uid: string;
  fullName: string;
  headline: string;
  location: string;
  yearsOfExperience: number;
  currentRole: string;
  targetRoles: string[];
  targetCompanies: string[];
  skills: string[];
  education: string;
  certifications: string[];
  preferredLocations: string[];
  remotePreference: string;
  salaryMin: number | null;
  salaryMax: number | null;
  noticePeriod: string;
  workAuthorization: string;
  careerGoals: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreResume {
  id: string;
  fileName: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  updatedAt: string;
  status: FirestoreResumeStatus;
  parsedData: ParsedResume | null;
  active: boolean;
}

export type FirestoreResumeStatus =
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

export interface FirestoreJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string | null;
  description: string;
  source: string;
  employmentType: string;
  salary: string;
  skills: string[];
  requirements: string;
  postedAt: string | null;
  savedAt: string;
  status: FirestoreJobStatus;
  createdAt: string;
  updatedAt: string;
}

export type FirestoreJobStatus =
  | "saved"
  | "interested"
  | "applied"
  | "closed";

export interface FirestoreApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  lastUpdatedAt: string;
  nextAction: string | null;
  nextActionDate: string | null;
  currentAnalysisId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreAnalysis {
  id: string;
  model: string;
  promptVersion: string;
  createdAt: string;
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  evidence: MatchEvidence[];
  recommendation: MatchRecommendation;
}

export interface FirestoreInterview {
  id: string;
  applicationId: string;
  scheduledAt: string | null;
  interviewType: InterviewType;
  round: number;
  status: string;
  questions: string[];
  notes: string;
  feedback: string;
  createdAt: string;
  updatedAt: string;
}

export type InterviewType =
  | "technical"
  | "behavioral"
  | "hr"
  | "managerial"
  | "other";

export interface FirestoreNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  scheduledFor: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

export interface FirestoreActivity {
  id: string;
  type: string;
  message: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// UI Component Props
// ---------------------------------------------------------------------------

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

// ---------------------------------------------------------------------------
// Zod Input Types (re-exported from validation schemas)
// ---------------------------------------------------------------------------
// These are the runtime-validated input shapes for API requests.
// Import from @/types to keep a single source of truth.

export type {
  ProfileInput,
  ResumeCreateInput,
  JobCreateInput,
  JobUpdateInput,
  ApplicationCreateInput,
  ApplicationUpdateInput,
  InterviewCreateInput,
  InterviewUpdateInput,
  NotificationCreateInput,
} from "@/lib/validation/schemas";
