// ============================================================================
// CareerPilot AI — Analytics Utilities
// ============================================================================

/** Safe percentage division — returns 0 when denominator is 0 */
export function safePct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** Safe division — returns 0 when denominator is 0 */
export function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/** Calculate days between two ISO date strings */
export function daysBetween(a: string, b: string): number {
  const dateA = new Date(a);
  const dateB = new Date(b);
  const diffMs = Math.abs(dateB.getTime() - dateA.getTime());
  return diffMs / (1000 * 60 * 60 * 24);
}

/** Median of a numeric array */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/** Mean of a numeric array */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/** Minimum sample size for statistically meaningful insights */
export const MIN_SAMPLE_SIZE = 5;
