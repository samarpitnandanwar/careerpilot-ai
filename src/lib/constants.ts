// ============================================================================
// CareerPilot AI — Constants
// ============================================================================

import type { NavItem } from "@/types";

export const APP_NAME = "CareerPilot AI";
export const APP_DESCRIPTION =
  "AI-powered job search decision and preparation platform";

export const GCP_PROJECT_ID = "careerpilot-ai-506813";
export const RESUME_BUCKET = "careerpilot-ai-506813-resumes";
export const PUBSUB_TOPIC = "careerpilot-events";
export const SCHEDULER_TIMEZONE = "Asia/Kolkata";

export const APPLICATION_PIPELINE = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
] as const;

export const SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Profile", href: "/profile", icon: "User" },
  { label: "Resume", href: "/resume", icon: "FileText" },
  { label: "Jobs", href: "/jobs", icon: "Briefcase" },
  { label: "Applications", href: "/applications", icon: "FolderOpen" },
  { label: "Analytics", href: "/analytics", icon: "BarChart3" },
  { label: "Settings", href: "/settings", icon: "Settings" },
];
