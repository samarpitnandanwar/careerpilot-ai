// ============================================================================
// CareerPilot AI — Stage Duration Calculator
// ============================================================================

import type { ApplicationActivity, ApplicationStatus } from "@/types";
import type { StageDuration } from "./types";
import { daysBetween, median, mean } from "./utils";

// ---------------------------------------------------------------------------
// Stage transitions we track
// ---------------------------------------------------------------------------

const TRACKED_TRANSITIONS: [ApplicationStatus, ApplicationStatus][] = [
  ["saved", "applied"],
  ["applied", "screening"],
  ["screening", "assessment"],
  ["assessment", "interview"],
  ["interview", "offer"],
  ["offer", "accepted"],
];

// ---------------------------------------------------------------------------
// Duration calculation
// ---------------------------------------------------------------------------

/**
 * Calculate stage durations from activity history.
 *
 * For each tracked transition, find all activities where:
 *   previousStatus === from AND newStatus === to
 *
 * Then calculate the time between the creating application's createdAt
 * and the activity timestamp. This gives us an approximation of how long
 * the application spent in the "from" stage.
 */
export function calculateStageDurations(
  allActivities: ApplicationActivity[],
  applicationCreatedAts: Map<string, string>,
): StageDuration[] {
  // Group activities by application
  const activitiesByApp = new Map<string, ApplicationActivity[]>();
  for (const act of allActivities) {
    const list = activitiesByApp.get(act.applicationId) ?? [];
    list.push(act);
    activitiesByApp.set(act.applicationId, list);
  }

  // For each tracked transition, collect durations
  return TRACKED_TRANSITIONS.map(([from, to]) => {
    const durations: number[] = [];

    for (const [, acts] of activitiesByApp) {
      // Find the transition activity
      const transitionAct = acts.find(
        (a) => a.previousStatus === from && a.newStatus === to,
      );
      if (!transitionAct) continue;

      // Find the previous transition activity (when the app entered the "from" stage)
      const entryAct = acts.find(
        (a) => a.newStatus === from,
      );

      let startStr: string | null = null;
      if (entryAct) {
        startStr = entryAct.timestamp;
      } else {
        // Fall back to application createdAt
        startStr = applicationCreatedAts.get(transitionAct.applicationId) ?? null;
      }

      if (startStr) {
        const days = daysBetween(startStr, transitionAct.timestamp);
        durations.push(days);
      }
    }

    return {
      from,
      to,
      averageDays: mean(durations),
      medianDays: median(durations),
      sampleSize: durations.length,
    };
  });
}
