// ============================================================================
// CareerPilot AI — Application Funnel
// ============================================================================

import type { FirestoreApplication, ApplicationStatus } from "@/types";
import type { FunnelMetrics, FunnelStage } from "./types";
import { safePct } from "./utils";

// ---------------------------------------------------------------------------
// Pipeline funnel stages (order matters)
// ---------------------------------------------------------------------------

const FUNNEL_ORDER: ApplicationStatus[] = [
  "applied",
  "screening",
  "assessment",
  "interview",
  "offer",
  "accepted",
];

/**
 * Calculate the conversion funnel from application data.
 *
 * An application that reached "interview" also counts as having
 * reached "applied" and "screening" (if it went through those stages).
 *
 * For simplicity, we count each application at its HIGHEST reached stage.
 * A user at "interview" has implicitly passed through applied → screening → assessment.
 */
export function calculateFunnel(apps: FirestoreApplication[]): FunnelMetrics {
  // Count each app at its highest pipeline stage
  const counts: Record<string, number> = {};
  for (const stage of FUNNEL_ORDER) {
    counts[stage] = 0;
  }

  for (const app of apps) {
    const idx = FUNNEL_ORDER.indexOf(app.status);
    if (idx >= 0) {
      counts[app.status] += 1;
    }
  }

  // Convert to cumulative counts (each stage includes all downstream stages)
  const cumulative: Record<string, number> = {};
  let runningTotal = 0;
  for (let i = FUNNEL_ORDER.length - 1; i >= 0; i--) {
    const stage = FUNNEL_ORDER[i];
    runningTotal += counts[stage];
    cumulative[stage] = runningTotal;
  }

  const totalApplied = cumulative.applied || 1;

  const stages: FunnelStage[] = FUNNEL_ORDER.map((stage, idx) => {
    const count = cumulative[stage];
    const percentage = safePct(count, totalApplied);
    const prevCount = idx === 0 ? totalApplied : cumulative[FUNNEL_ORDER[idx - 1]];
    const conversionFromPrevious = safePct(count, prevCount);

    return {
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      count,
      percentage,
      conversionFromPrevious,
    };
  });

  return {
    stages,
    totalApplied: cumulative.applied ?? 0,
  };
}
