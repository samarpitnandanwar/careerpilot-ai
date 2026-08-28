// ============================================================================
// CareerPilot AI — Application Intelligence Barrel Export
// ============================================================================

export {
  isValidTransition,
  deriveActivityType,
  deriveActivityMessage,
  calculateNextAction,
  getPipelineIndex,
  isTerminalStatus,
  VALID_TRANSITIONS,
  PIPELINE_STAGES,
  type NextAction,
} from "./state-machine";

export {
  createActivity,
  getActivities,
  addNoteActivity,
} from "./activity";
