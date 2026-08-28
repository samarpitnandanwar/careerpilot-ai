// ============================================================================
// CareerPilot AI — Application Tracker Unit Tests
// ============================================================================
//
// Tests the deterministic state machine, transition rules, and next-action
// engine without any GCP dependencies.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  deriveActivityType,
  deriveActivityMessage,
  calculateNextAction,
  getPipelineIndex,
  isTerminalStatus,
  VALID_TRANSITIONS,
  PIPELINE_STAGES,
} from "@/lib/applications/state-machine";
import type { ApplicationStatus } from "@/types";

// ---------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------

describe("isValidTransition", () => {
  it("allows saved → applied", () => {
    expect(isValidTransition("saved", "applied")).toBe(true);
  });

  it("allows saved → withdrawn", () => {
    expect(isValidTransition("saved", "withdrawn")).toBe(true);
  });

  it("allows applied → screening", () => {
    expect(isValidTransition("applied", "screening")).toBe(true);
  });

  it("allows applied → assessment", () => {
    expect(isValidTransition("applied", "assessment")).toBe(true);
  });

  it("allows applied → interview", () => {
    expect(isValidTransition("applied", "interview")).toBe(true);
  });

  it("allows applied → rejected", () => {
    expect(isValidTransition("applied", "rejected")).toBe(true);
  });

  it("allows applied → withdrawn", () => {
    expect(isValidTransition("applied", "withdrawn")).toBe(true);
  });

  it("allows screening → assessment", () => {
    expect(isValidTransition("screening", "assessment")).toBe(true);
  });

  it("allows screening → interview", () => {
    expect(isValidTransition("screening", "interview")).toBe(true);
  });

  it("allows screening → rejected", () => {
    expect(isValidTransition("screening", "rejected")).toBe(true);
  });

  it("allows assessment → interview", () => {
    expect(isValidTransition("assessment", "interview")).toBe(true);
  });

  it("allows assessment → rejected", () => {
    expect(isValidTransition("assessment", "rejected")).toBe(true);
  });

  it("allows interview → offer", () => {
    expect(isValidTransition("interview", "offer")).toBe(true);
  });

  it("allows interview → rejected", () => {
    expect(isValidTransition("interview", "rejected")).toBe(true);
  });

  it("allows offer → accepted", () => {
    expect(isValidTransition("offer", "accepted")).toBe(true);
  });

  it("allows offer → rejected", () => {
    expect(isValidTransition("offer", "rejected")).toBe(true);
  });

  it("allows offer → withdrawn", () => {
    expect(isValidTransition("offer", "withdrawn")).toBe(true);
  });

  it("rejects saved → screening (skip applied)", () => {
    expect(isValidTransition("saved", "screening")).toBe(false);
  });

  it("rejects saved → interview (skip steps)", () => {
    expect(isValidTransition("saved", "interview")).toBe(false);
  });

  it("rejects saved → offer (skip steps)", () => {
    expect(isValidTransition("saved", "offer")).toBe(false);
  });

  it("rejects saved → accepted (skip steps)", () => {
    expect(isValidTransition("saved", "accepted")).toBe(false);
  });

  it("rejects saved → rejected", () => {
    expect(isValidTransition("saved", "rejected")).toBe(false);
  });

  it("rejects rejected → anything (terminal)", () => {
    expect(isValidTransition("rejected", "applied")).toBe(false);
    expect(isValidTransition("rejected", "screening")).toBe(false);
    expect(isValidTransition("rejected", "interview")).toBe(false);
  });

  it("rejects accepted → anything (terminal)", () => {
    expect(isValidTransition("accepted", "applied")).toBe(false);
    expect(isValidTransition("accepted", "rejected")).toBe(false);
  });

  it("rejects withdrawn → anything (terminal)", () => {
    expect(isValidTransition("withdrawn", "applied")).toBe(false);
    expect(isValidTransition("withdrawn", "screening")).toBe(false);
  });

  it("rejects offer → screening (backward)", () => {
    expect(isValidTransition("offer", "screening")).toBe(false);
  });

  it("rejects interview → screening (backward)", () => {
    expect(isValidTransition("interview", "screening")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Activity type derivation
// ---------------------------------------------------------------------------

describe("deriveActivityType", () => {
  it("derives APPLICATION_SUBMITTED for → applied", () => {
    expect(deriveActivityType("saved", "applied")).toBe("APPLICATION_SUBMITTED");
  });

  it("derives SCREENING_STARTED for → screening", () => {
    expect(deriveActivityType("applied", "screening")).toBe("SCREENING_STARTED");
  });

  it("derives ASSESSMENT_RECEIVED for → assessment", () => {
    expect(deriveActivityType("applied", "assessment")).toBe("ASSESSMENT_RECEIVED");
  });

  it("derives INTERVIEW_SCHEDULED for → interview", () => {
    expect(deriveActivityType("applied", "interview")).toBe("INTERVIEW_SCHEDULED");
  });

  it("derives OFFER_RECEIVED for → offer", () => {
    expect(deriveActivityType("interview", "offer")).toBe("OFFER_RECEIVED");
  });

  it("derives APPLICATION_ACCEPTED for → accepted", () => {
    expect(deriveActivityType("offer", "accepted")).toBe("APPLICATION_ACCEPTED");
  });

  it("derives APPLICATION_REJECTED for → rejected", () => {
    expect(deriveActivityType("applied", "rejected")).toBe("APPLICATION_REJECTED");
  });

  it("derives APPLICATION_WITHDRAWN for → withdrawn", () => {
    expect(deriveActivityType("applied", "withdrawn")).toBe("APPLICATION_WITHDRAWN");
  });
});

// ---------------------------------------------------------------------------
// Activity message derivation
// ---------------------------------------------------------------------------

describe("deriveActivityMessage", () => {
  it("generates message for saved → applied", () => {
    expect(deriveActivityMessage("saved", "applied")).toBe("Application submitted");
  });

  it("generates message for interview → offer", () => {
    expect(deriveActivityMessage("interview", "offer")).toBe("Offer received!");
  });

  it("generates message for offer → accepted", () => {
    expect(deriveActivityMessage("offer", "accepted")).toBe("Offer accepted!");
  });

  it("generates message for screening → rejected", () => {
    expect(deriveActivityMessage("screening", "rejected")).toBe("Rejected after screening");
  });

  it("falls back to generic message for unknown transition", () => {
    const msg = deriveActivityMessage("saved", "withdrawn");
    expect(msg).toBe("Application withdrawn before submission");
  });
});

// ---------------------------------------------------------------------------
// Next action calculation
// ---------------------------------------------------------------------------

describe("calculateNextAction", () => {
  it("returns APPLY_NOW for saved status", () => {
    const action = calculateNextAction("saved");
    expect(action.action).toBe("APPLY_NOW");
    expect(action.label).toBe("Submit Application");
  });

  it("returns WAIT for applied with no follow-up", () => {
    const action = calculateNextAction("applied");
    expect(action.action).toBe("WAIT");
    expect(action.label).toBe("Wait for Response");
  });

  it("returns FOLLOW_UP when follow-up date has passed", () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const action = calculateNextAction("applied", {
      deadline: null,
      followUpDate: pastDate,
      interviewDate: null,
      nextActionAt: null,
    });
    expect(action.action).toBe("FOLLOW_UP");
    expect(action.label).toBe("Follow Up");
  });

  it("returns WAIT with follow-up date when future", () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const action = calculateNextAction("applied", {
      deadline: null,
      followUpDate: futureDate,
      interviewDate: null,
      nextActionAt: null,
    });
    expect(action.action).toBe("WAIT");
    expect(action.description).toContain("Follow-up scheduled");
  });

  it("returns PREPARE_INTERVIEW for screening", () => {
    const action = calculateNextAction("screening");
    expect(action.action).toBe("PREPARE_INTERVIEW");
  });

  it("returns COMPLETE_ASSESSMENT for assessment", () => {
    const action = calculateNextAction("assessment");
    expect(action.action).toBe("COMPLETE_ASSESSMENT");
  });

  it("returns PREPARE_INTERVIEW for interview", () => {
    const action = calculateNextAction("interview");
    expect(action.action).toBe("PREPARE_INTERVIEW");
  });

  it("returns REVIEW_OFFER for offer", () => {
    const action = calculateNextAction("offer");
    expect(action.action).toBe("REVIEW_OFFER");
  });

  it("returns ONBOARDING for accepted", () => {
    const action = calculateNextAction("accepted");
    expect(action.action).toBe("ONBOARDING");
  });

  it("returns NONE for rejected", () => {
    const action = calculateNextAction("rejected");
    expect(action.action).toBe("NONE");
  });

  it("returns NONE for withdrawn", () => {
    const action = calculateNextAction("withdrawn");
    expect(action.action).toBe("NONE");
  });

  it("includes deadline as date when available", () => {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const action = calculateNextAction("saved", {
      deadline,
      followUpDate: null,
      interviewDate: null,
      nextActionAt: null,
    });
    expect(action.date).toBe(deadline);
  });
});

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

describe("PIPELINE_STAGES", () => {
  it("includes all pipeline stages in order", () => {
    expect(PIPELINE_STAGES).toEqual([
      "saved", "applied", "screening", "assessment",
      "interview", "offer", "accepted",
    ]);
  });

  it("does not include terminal non-pipeline statuses", () => {
    expect(PIPELINE_STAGES).not.toContain("rejected");
    expect(PIPELINE_STAGES).not.toContain("withdrawn");
  });
});

describe("getPipelineIndex", () => {
  it("returns correct index for each stage", () => {
    expect(getPipelineIndex("saved")).toBe(0);
    expect(getPipelineIndex("applied")).toBe(1);
    expect(getPipelineIndex("screening")).toBe(2);
    expect(getPipelineIndex("assessment")).toBe(3);
    expect(getPipelineIndex("interview")).toBe(4);
    expect(getPipelineIndex("offer")).toBe(5);
    expect(getPipelineIndex("accepted")).toBe(6);
  });

  it("returns -1 for non-pipeline statuses", () => {
    expect(getPipelineIndex("rejected")).toBe(-1);
    expect(getPipelineIndex("withdrawn")).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Terminal status detection
// ---------------------------------------------------------------------------

describe("isTerminalStatus", () => {
  it("returns true for accepted", () => {
    expect(isTerminalStatus("accepted")).toBe(true);
  });

  it("returns true for rejected", () => {
    expect(isTerminalStatus("rejected")).toBe(true);
  });

  it("returns true for withdrawn", () => {
    expect(isTerminalStatus("withdrawn")).toBe(true);
  });

  it("returns false for non-terminal statuses", () => {
    expect(isTerminalStatus("saved")).toBe(false);
    expect(isTerminalStatus("applied")).toBe(false);
    expect(isTerminalStatus("screening")).toBe(false);
    expect(isTerminalStatus("assessment")).toBe(false);
    expect(isTerminalStatus("interview")).toBe(false);
    expect(isTerminalStatus("offer")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// All statuses have transitions defined
// ---------------------------------------------------------------------------

describe("VALID_TRANSITIONS completeness", () => {
  const allStatuses: ApplicationStatus[] = [
    "saved", "applied", "screening", "assessment",
    "interview", "offer", "accepted", "rejected", "withdrawn",
  ];

  it("has transitions defined for every status", () => {
    for (const status of allStatuses) {
      expect(VALID_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
    }
  });

  it("all transition targets are valid ApplicationStatus values", () => {
    for (const [from, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const target of targets) {
        expect(allStatuses).toContain(target);
        expect(allStatuses).toContain(from);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Full lifecycle test
// ---------------------------------------------------------------------------

describe("Full application lifecycle", () => {
  it("supports complete happy path: saved → applied → screening → interview → offer → accepted", () => {
    const lifecycle: ApplicationStatus[] = [
      "saved", "applied", "screening", "interview", "offer", "accepted",
    ];

    for (let i = 0; i < lifecycle.length - 1; i++) {
      expect(isValidTransition(lifecycle[i], lifecycle[i + 1])).toBe(true);
    }
  });

  it("supports alternative path: saved → applied → assessment → interview → offer → accepted", () => {
    const lifecycle: ApplicationStatus[] = [
      "saved", "applied", "assessment", "interview", "offer", "accepted",
    ];

    for (let i = 0; i < lifecycle.length - 1; i++) {
      expect(isValidTransition(lifecycle[i], lifecycle[i + 1])).toBe(true);
    }
  });

  it("supports rejection at any stage", () => {
    const stages: ApplicationStatus[] = ["applied", "screening", "assessment", "interview", "offer"];
    for (const stage of stages) {
      expect(isValidTransition(stage, "rejected")).toBe(true);
    }
  });

  it("supports withdrawal at any active stage", () => {
    const stages: ApplicationStatus[] = ["saved", "applied", "screening", "assessment", "interview", "offer"];
    for (const stage of stages) {
      expect(isValidTransition(stage, "withdrawn")).toBe(true);
    }
  });

  it("each step creates appropriate activity type", () => {
    expect(deriveActivityType("saved", "applied")).toBe("APPLICATION_SUBMITTED");
    expect(deriveActivityType("applied", "screening")).toBe("SCREENING_STARTED");
    expect(deriveActivityType("screening", "interview")).toBe("INTERVIEW_SCHEDULED");
    expect(deriveActivityType("interview", "offer")).toBe("OFFER_RECEIVED");
    expect(deriveActivityType("offer", "accepted")).toBe("APPLICATION_ACCEPTED");
  });

  it("each step has appropriate next action", () => {
    expect(calculateNextAction("saved").action).toBe("APPLY_NOW");
    expect(calculateNextAction("applied").action).toBe("WAIT");
    expect(calculateNextAction("screening").action).toBe("PREPARE_INTERVIEW");
    expect(calculateNextAction("assessment").action).toBe("COMPLETE_ASSESSMENT");
    expect(calculateNextAction("interview").action).toBe("PREPARE_INTERVIEW");
    expect(calculateNextAction("offer").action).toBe("REVIEW_OFFER");
    expect(calculateNextAction("accepted").action).toBe("ONBOARDING");
    expect(calculateNextAction("rejected").action).toBe("NONE");
    expect(calculateNextAction("withdrawn").action).toBe("NONE");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("all next actions have required fields", () => {
    const statuses: ApplicationStatus[] = [
      "saved", "applied", "screening", "assessment",
      "interview", "offer", "accepted", "rejected", "withdrawn",
    ];
    for (const status of statuses) {
      const action = calculateNextAction(status);
      expect(action.action).toBeDefined();
      expect(action.label).toBeDefined();
      expect(action.description).toBeDefined();
    }
  });

  it("next action date is null when no context provided", () => {
    const action = calculateNextAction("applied");
    expect(action.date).toBeNull();
  });

  it("pipeline stages have consistent ordering", () => {
    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      expect(getPipelineIndex(PIPELINE_STAGES[i])).toBe(i);
    }
  });
});
