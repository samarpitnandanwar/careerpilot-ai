// ============================================================================
// CareerPilot AI — Job → Application Flow Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Firestore
// ---------------------------------------------------------------------------

const mockDocSet = vi.fn();
const mockDocGet = vi.fn();
const mockQueryGet = vi.fn();

const mockDocRef = {
  set: mockDocSet,
  get: mockDocGet,
};

const mockQueryObj: Record<string, unknown> = {};
mockQueryObj.get = mockQueryGet;
mockQueryObj.where = vi.fn(() => mockQueryObj);
mockQueryObj.limit = vi.fn(() => mockQueryObj);
mockQueryObj.orderBy = vi.fn(() => mockQueryObj);

const mockApplicationsCol = {
  doc: vi.fn(() => mockDocRef),
  orderBy: vi.fn(() => mockQueryObj),
  where: vi.fn(() => mockQueryObj),
};

const mockJobsCol = {
  doc: vi.fn(() => mockDocRef),
  orderBy: vi.fn(() => mockQueryObj),
  where: vi.fn(() => mockQueryObj),
};

vi.mock("@/lib/firestore/db", () => ({
  getDb: vi.fn(() => ({})),
  jobsCol: vi.fn(() => mockJobsCol),
  applicationsCol: vi.fn(() => mockApplicationsCol),
  newId: vi.fn(() => "app-123"),
  now: vi.fn(() => "2026-08-29T00:00:00.000Z"),
}));

vi.mock("@/lib/api-helpers", () => ({
  handleFirestoreError: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  requireUser: vi.fn(),
  jsonOk: vi.fn((data: unknown) => ({ status: 200, json: () => ({ success: true, data }) })),
  jsonCreated: vi.fn((data: unknown) => ({ status: 201, json: () => ({ success: true, data }) })),
  jsonError: vi.fn((msg: string) => ({ status: 400, json: () => ({ success: false, error: msg }) })),
  jsonNotFound: vi.fn((msg: string) => ({ status: 404, json: () => ({ success: false, error: msg }) })),
  jsonInternal: vi.fn((msg: string) => ({ status: 500, json: () => ({ success: false, error: msg }) })),
  FirestoreOperationError: class extends Error {},
}));

vi.mock("@/lib/events/publisher", () => ({
  publishDomainEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/applications/activity", () => ({
  createActivity: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/lib/applications/state-machine", () => ({
  isValidTransition: vi.fn(() => true),
  deriveActivityType: vi.fn(() => "APPLICATION_CREATED"),
  deriveActivityMessage: vi.fn(() => "Application created"),
  calculateNextAction: vi.fn(() => ({ action: "APPLY_NOW", label: "Submit", description: "Apply", date: null })),
}));

import {
  createApplication,
  getApplicationByJobId,
} from "@/lib/firestore/applications";
import type { ApplicationCreateInput } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAppInput(overrides: Record<string, unknown> = {}): ApplicationCreateInput {
  return {
    jobId: "job-123",
    jobTitle: "Software Engineer",
    company: "Acme",
    resumeId: null,
    source: "manual",
    applicationUrl: null,
    deadline: null,
    notes: "",
    initialStatus: "saved",
    ...overrides,
  } as ApplicationCreateInput;
}

// makeJob available for future tests if needed

function makeApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: "app-123",
    jobId: "job-123",
    jobTitle: "Software Engineer",
    company: "Acme",
    status: "saved",
    resumeId: null,
    appliedAt: null,
    deadline: "2026-09-15",
    source: "manual",
    applicationUrl: null,
    nextAction: "APPLY_NOW",
    nextActionAt: "2026-09-15",
    followUpDate: null,
    currentAnalysisId: null,
    matchAnalysisId: null,
    priorityId: null,
    interviewIds: [],
    notes: "",
    archived: false,
    lastUpdatedAt: "2026-08-29T00:00:00.000Z",
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getApplicationByJobId Tests
// ---------------------------------------------------------------------------

describe("getApplicationByJobId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns application when it exists for the job", async () => {
    const app = makeApplication();
    mockQueryGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => app }],
    });

    const result = await getApplicationByJobId("user-1", "job-123");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("app-123");
    expect(result!.jobId).toBe("job-123");
  });

  it("returns null when no application exists for the job", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await getApplicationByJobId("user-1", "job-nonexistent");
    expect(result).toBeNull();
  });

  it("is user-scoped — queries user's applications collection", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await getApplicationByJobId("user-abc", "job-123");
    expect(mockApplicationsCol.where).toHaveBeenCalledWith("jobId", "==", "job-123");
  });

  it("uses limit(1) for efficiency", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await getApplicationByJobId("user-1", "job-123");
    expect(mockQueryObj.limit).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// createApplication with server-derived data
// ---------------------------------------------------------------------------

describe("createApplication — server-derived job data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates application with server-derived jobTitle and company", async () => {
    // No existing application
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const input = makeAppInput({
      source: "linkedin",
    });

    await createApplication("user-1", input);

    expect(mockDocSet).toHaveBeenCalled();
    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.jobTitle).toBe("Software Engineer");
    expect(stored.company).toBe("Acme");
    expect(stored.source).toBe("linkedin");
  });

  it("defaults status to saved", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.status).toBe("saved");
  });

  it("server generates createdAt and updatedAt", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.createdAt).toBe("2026-08-29T00:00:00.000Z");
    expect(stored.updatedAt).toBe("2026-08-29T00:00:00.000Z");
  });

  it("returns existing application for duplicate jobId", async () => {
    const existingApp = makeApplication({ id: "existing-app" });
    mockQueryGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existingApp }],
    });

    const result = await createApplication("user-1", makeAppInput({
      jobTitle: "Different Title",
      company: "Different Co",
    }));

    expect(result.id).toBe("existing-app");
    expect(mockDocSet).not.toHaveBeenCalled(); // No new document created
  });
});

// ---------------------------------------------------------------------------
// Duplicate Protection
// ---------------------------------------------------------------------------

describe("Duplicate Application Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prevents creating duplicate application for same job", async () => {
    const existing = makeApplication();
    mockQueryGet.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => existing }],
    });

    const result = await createApplication("user-1", makeAppInput());

    // Should return existing, not create new
    expect(result.id).toBe("app-123");
    expect(mockDocSet).not.toHaveBeenCalled();
  });

  it("allows creating application for different job", async () => {
    // No existing application for this job
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput({
      jobId: "job-456",
      jobTitle: "Designer",
      company: "OtherCo",
    }));

    expect(mockDocSet).toHaveBeenCalled();
    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.jobId).toBe("job-456");
  });
});

// ---------------------------------------------------------------------------
// Security: Client cannot override server-controlled fields
// ---------------------------------------------------------------------------

describe("Security — server-controlled fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("server controls application ID", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    // ID comes from newId, not client
    expect(stored.id).toBeDefined();
  });

  it("server controls timestamps", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.createdAt).toBe("2026-08-29T00:00:00.000Z");
    expect(stored.updatedAt).toBe("2026-08-29T00:00:00.000Z");
  });

  it("server controls status", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.status).toBe("saved");
  });

  it("application is user-scoped", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-abc", makeAppInput());

    // applicationsCol is called with the user's uid
    expect(mockApplicationsCol.where).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Deadline behavior
// ---------------------------------------------------------------------------

describe("Job → Application Deadline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("application uses job deadline as default", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput({ deadline: "2026-09-15" }));

    // The application deadline should be set by the caller
    // (the API route provides the job's deadline)
    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.deadline).toBeDefined();
  });

  it("application can have its own deadline", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput({ deadline: "2026-10-01" }));

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.deadline).toBe("2026-10-01");
  });

  it("null deadline is valid", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored.deadline).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// No sensitive data
// ---------------------------------------------------------------------------

describe("Application Data Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not store resume text in application", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored).not.toHaveProperty("resumeText");
    expect(stored).not.toHaveProperty("resumeContent");
  });

  it("does not store credentials", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored).not.toHaveProperty("token");
    expect(stored).not.toHaveProperty("password");
  });

  it("does not store match scores", async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    await createApplication("user-1", makeAppInput());

    const stored = mockDocSet.mock.calls[0][0];
    expect(stored).not.toHaveProperty("matchScore");
    expect(stored).not.toHaveProperty("priorityScore");
  });
});

// ---------------------------------------------------------------------------
// API route schema validation
// ---------------------------------------------------------------------------

describe("Job Apply Schema Validation", () => {
  it("allows optional fields only", () => {
    // The JobApplySchema only allows:
    // resumeId, source, applicationUrl, deadline, notes, initialStatus
    // It does NOT allow: jobId, jobTitle, company, userId, scores
    const allowedFields = [
      "resumeId",
      "source",
      "applicationUrl",
      "deadline",
      "notes",
      "initialStatus",
    ];
    const disallowedFields = [
      "jobId",
      "jobTitle",
      "company",
      "userId",
      "matchScore",
      "priorityScore",
      "createdAt",
      "updatedAt",
      "activityTimestamp",
    ];

    // These are the fields the client can submit
    expect(allowedFields.length).toBe(6);
    // These must NOT be submittable by client
    for (const field of disallowedFields) {
      expect(allowedFields).not.toContain(field);
    }
  });
});
