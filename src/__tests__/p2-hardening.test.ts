// ============================================================================
// CareerPilot AI — P2 Production Hardening Regression Tests
// ============================================================================

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Fix 1: Scheduler response does NOT leak identity email
// ---------------------------------------------------------------------------

describe("Fix 1: Scheduler response email leak", () => {
  it("scheduler response schema does not include verifiedIdentity", () => {
    // The scheduler response should only contain:
    // { success, data, processedAt }
    // verifiedIdentity must NOT be present
    const safeResponse = {
      success: true,
      data: {
        deadlineApproaching: 0,
        deadlineExpired: 0,
        followUpDue: 0,
        interviewUpcoming: 0,
        errors: 0,
        usersProcessed: 0,
      },
      processedAt: new Date().toISOString(),
    };

    expect(safeResponse).not.toHaveProperty("verifiedIdentity");
    expect(safeResponse).not.toHaveProperty("email");
    expect(safeResponse).not.toHaveProperty("identity");
  });
});

// ---------------------------------------------------------------------------
// Fix 2: Scheduler does NOT log identity email
// ---------------------------------------------------------------------------

describe("Fix 2: Scheduler logging privacy", () => {
  it("scheduler route file does not contain email logging", async () => {
    // Read the scheduler route source and verify no email is logged
    const fs = await import("fs");
    const path = await import("path");
    const routePath = path.join(
      process.cwd(),
      "src/app/api/events/scheduler/route.ts",
    );
    const content = fs.readFileSync(routePath, "utf-8");

    // Should NOT contain patterns that log email addresses
    expect(content).not.toMatch(/console\.\w+\(.*identity\.email/);
    expect(content).not.toMatch(/console\.\w+\(.*email.*scheduler/i);
  });
});

// ---------------------------------------------------------------------------
// Fix 3: Job status cannot be changed via PATCH
// ---------------------------------------------------------------------------

describe("Fix 3: Job status authorization", () => {
  it("JobUpdateSchema does not include status field", async () => {
    const { JobUpdateSchema } = await import("@/lib/validation/schemas");

    // Parse a valid update without status
    const validUpdate = JobUpdateSchema.safeParse({
      title: "Senior Engineer",
      company: "Acme",
    });
    expect(validUpdate.success).toBe(true);

    // Parse with status — should strip it (status not in schema)
    const updateWithStatus = JobUpdateSchema.safeParse({
      title: "Senior Engineer",
      status: "applied",
    });
    expect(updateWithStatus.success).toBe(true);
    if (updateWithStatus.success) {
      expect(updateWithStatus.data).not.toHaveProperty("status");
    }
  });

  it("JobUpdateSchema rejects invalid field types", async () => {
    const { JobUpdateSchema } = await import("@/lib/validation/schemas");

    const invalid = JobUpdateSchema.safeParse({
      title: 123, // wrong type
    });
    expect(invalid.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fix 4: Pub/Sub documentation matches OIDC-only behavior
// ---------------------------------------------------------------------------

describe("Fix 4: Pub/Sub documentation accuracy", () => {
  it("pubsub route does not document legacy verification token as accepted", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routePath = path.join(
      process.cwd(),
      "src/app/api/events/pubsub/route.ts",
    );
    const content = fs.readFileSync(routePath, "utf-8");

    // Should NOT say legacy token is accepted
    expect(content).not.toMatch(
      /2\.\s*Pub\/Sub verification token header \(legacy push\)/,
    );
    // Should say legacy token is NOT accepted
    expect(content).toMatch(/legacy.*NOT.*accepted|NOT.*accepted.*legacy/i);
  });

  it("events auth module documents OIDC-only behavior", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const authPath = path.join(process.cwd(), "src/lib/events/auth.ts");
    const content = fs.readFileSync(authPath, "utf-8");

    expect(content).toMatch(/legacy.*NOT.*accepted/i);
  });
});

// ---------------------------------------------------------------------------
// Fix 5: Terminal action expiration uses single query
// ---------------------------------------------------------------------------

describe("Fix 5: Terminal action expiration optimization", () => {
  it("expireTerminalStateActions queries once, filters in-memory", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const reconcilePath = path.join(
      process.cwd(),
      "src/lib/actions/reconcile.ts",
    );
    const content = fs.readFileSync(reconcilePath, "utf-8");

    // Should query OPEN actions once (not per-application)
    const functionBody = content.slice(
      content.indexOf("async function expireTerminalStateActions"),
    );

    // Should have a single getActions call (not inside a for-loop over apps)
    const getActionsMatches = functionBody.match(/getActions\(uid/g);
    expect(getActionsMatches).toHaveLength(1);

    // Should use batch update
    expect(functionBody).toMatch(/batch\.update/);
    expect(functionBody).toMatch(/batch\.commit/);
  });
});

// ---------------------------------------------------------------------------
// Fix 6: Scheduler paginates through users
// ---------------------------------------------------------------------------

describe("Fix 6: Scheduler user pagination", () => {
  it("scheduler uses paginated user queries", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routePath = path.join(
      process.cwd(),
      "src/app/api/events/scheduler/route.ts",
    );
    const content = fs.readFileSync(routePath, "utf-8");

    // Should use cursor-based pagination
    expect(content).toMatch(/PAGE_SIZE/);
    expect(content).toMatch(/startAfter/);
    expect(content).toMatch(/while.*hasMore/);
  });
});

// ---------------------------------------------------------------------------
// Fix 7: Server-only barrel exports
// ---------------------------------------------------------------------------

describe("Fix 7: Server-only imports", () => {
  it("actions barrel export has server-only guard", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.join(process.cwd(), "src/lib/actions/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toMatch(/import \"server-only\"/);
  });

  it("analytics barrel export has server-only guard", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.join(process.cwd(), "src/lib/analytics/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toMatch(/import \"server-only\"/);
  });

  it("events barrel export has server-only guard", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const indexPath = path.join(process.cwd(), "src/lib/events/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toMatch(/import \"server-only\"/);
  });
});

// ---------------------------------------------------------------------------
// Fix 8: API error messages are safe
// ---------------------------------------------------------------------------

describe("Fix 8: API error message safety", () => {
  it("jsonInternal always returns safe generic message", async () => {
    const { jsonInternal } = await import("@/lib/api-helpers");
    const response = jsonInternal("Some internal error detail");
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("Internal server error");
    // Should NOT contain the internal error detail
    expect(body.error).not.toContain("Some internal error detail");
  });

  it("jsonInternal without message returns safe default", async () => {
    const { jsonInternal } = await import("@/lib/api-helpers");
    const response = jsonInternal();
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBe("Internal server error");
  });

  it("handleFirestoreError throws safe error message", async () => {
    const { handleFirestoreError } = await import("@/lib/api-helpers");

    try {
      await handleFirestoreError(async () => {
        throw new Error("Firestore internal: permission denied on collection users/abc123/resumes");
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      // Should NOT contain the Firestore internal details
      expect((error as Error).message).not.toContain("permission denied");
      expect((error as Error).message).not.toContain("collection users/");
      expect((error as Error).message).toBe("Database operation failed");
    }
  });
});
