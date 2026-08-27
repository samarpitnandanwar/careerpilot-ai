// ============================================================================
// CareerPilot AI — Utility Functions
// ============================================================================

import { type ClassValue, clsx } from "clsx";

/**
 * Merge class names with clsx (Tailwind-friendly).
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format a date string into a human-readable form.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a relative time string ("2 days ago", "just now").
 */
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 30) return formatDate(dateStr);
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

/**
 * Days remaining until a deadline, or null if no deadline.
 */
export function daysUntil(dateStr: string): number | null {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get a color class for a score (0-100).
 */
export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

/**
 * Get background color class for a score.
 */
export function scoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-100";
  if (score >= 60) return "bg-yellow-100";
  if (score >= 40) return "bg-orange-100";
  return "bg-red-100";
}

/**
 * Get priority color class.
 */
export function priorityColor(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "LOW":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

/**
 * Get recommendation color class.
 */
export function recommendationColor(rec: string): string {
  switch (rec) {
    case "APPLY_NOW":
    case "STRONG_FIT":
      return "bg-green-100 text-green-700";
    case "GOOD_FIT":
      return "bg-blue-100 text-blue-700";
    case "MODERATE_FIT":
      return "bg-yellow-100 text-yellow-700";
    case "WEAK_FIT":
      return "bg-orange-100 text-orange-700";
    case "NOT_RECOMMENDED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

/**
 * Format a number as a percentage.
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Validate an AI response shape (basic runtime check).
 */
export function validateAiResponse<T extends Record<string, unknown>>(
  data: unknown,
  requiredKeys: (keyof T)[],
): data is T {
  if (typeof data !== "object" || data === null) return false;
  return requiredKeys.every((key) => key in data);
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1).trimEnd() + "…";
}

/**
 * Generate a random ID (client-side placeholder; real IDs come from Firestore).
 */
export function generateTempId(): string {
  return Math.random().toString(36).substring(2, 15);
}
