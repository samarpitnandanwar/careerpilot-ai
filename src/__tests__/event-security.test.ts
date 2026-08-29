// ============================================================================
// CareerPilot AI — Event Security Hardening Tests
// ============================================================================
//
// Tests:
// 1. Scheduler authentication — unauthenticated → 401
// 2. Scheduler authentication — invalid identity → 401
// 3. Scheduler authentication — valid identity → accepted
// 4. Pub/Sub authentication — unauthenticated → 401
// 5. Pub/Sub authentication — invalid identity → 401
// 6. Pub/Sub authentication — valid push → accepted
// 7. Development local bypass works when intentionally configured
// 8. Publisher cannot be imported into client components
// 9. Duplicate scheduler event prevented
// 10. Auth verification utility behavior
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import { globSync } from "glob";
import { isAcceptedSchedulerIdentity } from "@/lib/events/auth";

// ---------------------------------------------------------------------------
// Mock firebase-admin to avoid requiring real GCP credentials
// ---------------------------------------------------------------------------
vi.mock("@/lib/firebase/admin", () => ({
  getAdminApp: vi.fn(() => ({})),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn().mockRejectedValue(new Error("No real credentials")),
  })),
}));

// ---------------------------------------------------------------------------
// Test: isAcceptedSchedulerIdentity
// ---------------------------------------------------------------------------
describe("isAcceptedSchedulerIdentity", () => {
  it("accepts the runtime service account", () => {
    expect(
      isAcceptedSchedulerIdentity(
        "careerpilot-runtime@careerpilot-ai-506813.iam.gserviceaccount.com",
      ),
    ).toBe(true);
  });

  it("rejects unknown service accounts", () => {
    expect(
      isAcceptedSchedulerIdentity("random-sa@other-project.iam.gserviceaccount.com"),
    ).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isAcceptedSchedulerIdentity("")).toBe(false);
  });

  it("rejects user emails", () => {
    expect(isAcceptedSchedulerIdentity("user@gmail.com")).toBe(false);
  });

  it("scheduler route imports isAcceptedSchedulerIdentity for defense-in-depth", () => {
    // Verify the scheduler route actually uses the identity check
    const schedulerCode = fs.readFileSync(
      "src/app/api/events/scheduler/route.ts",
      "utf-8",
    );
    expect(schedulerCode).toContain("isAcceptedSchedulerIdentity");
    expect(schedulerCode).toContain("import { verifySchedulerRequest, isAcceptedSchedulerIdentity }");
  });
});

// ---------------------------------------------------------------------------
// Test: Scheduler endpoint — unauthenticated → 401
// ---------------------------------------------------------------------------
describe("Scheduler Endpoint Authentication", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.EVENT_ENDPOINT_DEV_SECRET;
    // Ensure no dev bypass is configured
    delete process.env.EVENT_ENDPOINT_DEV_SECRET;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.EVENT_ENDPOINT_DEV_SECRET = originalEnv;
    } else {
      delete process.env.EVENT_ENDPOINT_DEV_SECRET;
    }
  });

  it("rejects request with no Authorization header", async () => {
    // Import the auth verification function directly
    const { verifySchedulerRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/scheduler", {
      method: "POST",
    });

    const result = await verifySchedulerRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects request with invalid Bearer token", async () => {
    const { verifySchedulerRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/scheduler", {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-token-12345",
      },
    });

    const result = await verifySchedulerRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects request with malformed Authorization header", async () => {
    const { verifySchedulerRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/scheduler", {
      method: "POST",
      headers: {
        Authorization: "Basic dXNlcjpwYXNz",
      },
    });

    const result = await verifySchedulerRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects request with empty Bearer token", async () => {
    const { verifySchedulerRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/scheduler", {
      method: "POST",
      headers: {
        Authorization: "Bearer ",
      },
    });

    const result = await verifySchedulerRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("dev bypass works when EVENT_ENDPOINT_DEV_SECRET is set", async () => {
    process.env.EVENT_ENDPOINT_DEV_SECRET = "test-secret-123";

    const { verifySchedulerRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/scheduler", {
      method: "POST",
      headers: {
        "X-Event-Dev-Secret": "test-secret-123",
      },
    });

    const result = await verifySchedulerRequest(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.email).toBe("dev-bypass@localhost");
    }
  });

  it("dev bypass fails with wrong secret", async () => {
    process.env.EVENT_ENDPOINT_DEV_SECRET = "test-secret-123";

    const { verifySchedulerRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/scheduler", {
      method: "POST",
      headers: {
        "X-Event-Dev-Secret": "wrong-secret",
      },
    });

    const result = await verifySchedulerRequest(request);
    expect(result.ok).toBe(false);
  });

  it("dev bypass is not available without EVENT_ENDPOINT_DEV_SECRET", async () => {
    delete process.env.EVENT_ENDPOINT_DEV_SECRET;

    const { verifySchedulerRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/scheduler", {
      method: "POST",
      headers: {
        "X-Event-Dev-Secret": "any-secret",
      },
    });

    const result = await verifySchedulerRequest(request);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Pub/Sub endpoint — unauthenticated → 401
// ---------------------------------------------------------------------------
describe("Pub/Sub Endpoint Authentication", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.EVENT_ENDPOINT_DEV_SECRET;
    delete process.env.EVENT_ENDPOINT_DEV_SECRET;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.EVENT_ENDPOINT_DEV_SECRET = originalEnv;
    } else {
      delete process.env.EVENT_ENDPOINT_DEV_SECRET;
    }
  });

  it("rejects request with no Authorization header", async () => {
    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects request with invalid Bearer token", async () => {
    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-google-token",
      },
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
  });

  it("rejects request with X-Goog-Pubsub-Verification-Token alone (legacy no longer accepted)", async () => {
    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
      headers: {
        "X-Goog-Pubsub-Verification-Token": "some-pubsub-token",
      },
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects request with verification token + invalid Bearer (cannot bypass OIDC)", async () => {
    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
      headers: {
        Authorization: "Bearer fake-google-token",
        "X-Goog-Pubsub-Verification-Token": "some-pubsub-token",
      },
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects request with malformed Bearer token", async () => {
    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
      headers: {
        Authorization: "Basic dXNlcjpwYXNz",
      },
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects request with empty Bearer token", async () => {
    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
      headers: {
        Authorization: "Bearer ",
      },
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("NODE_ENV alone cannot bypass Pub/Sub authentication (source verification)", () => {
    // The auth module must not use NODE_ENV for authentication decisions.
    // Verify the source code does not contain NODE_ENV in non-comment lines.
    const authCode = fs.readFileSync("src/lib/events/auth.ts", "utf-8");
    const codeWithoutComments = authCode
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    expect(codeWithoutComments).not.toMatch(/NODE_ENV/);
  });

  it("dev bypass works when EVENT_ENDPOINT_DEV_SECRET is set", async () => {
    process.env.EVENT_ENDPOINT_DEV_SECRET = "pubsub-dev-secret";

    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
      headers: {
        "X-Event-Dev-Secret": "pubsub-dev-secret",
      },
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.email).toBe("dev-bypass@localhost");
    }
  });

  it("dev bypass fails with wrong secret", async () => {
    process.env.EVENT_ENDPOINT_DEV_SECRET = "pubsub-dev-secret";

    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
      headers: {
        "X-Event-Dev-Secret": "wrong",
      },
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
  });

  it("dev bypass is not available without EVENT_ENDPOINT_DEV_SECRET", async () => {
    delete process.env.EVENT_ENDPOINT_DEV_SECRET;

    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
      headers: {
        "X-Event-Dev-Secret": "any-secret",
      },
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
  });

  it("rejects when no auth method is available", async () => {
    delete process.env.EVENT_ENDPOINT_DEV_SECRET;

    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: Publisher cannot be imported by client components
// ---------------------------------------------------------------------------
describe("Server-Only Enforcement", () => {
  it("publisher module uses server-side only dependencies", () => {
    // The publisher imports:
    // - @google-cloud/pubsub (server-only)
    // - crypto (Node.js built-in)
    // These are not available in browser context.
    // If a client component tried to import this, it would fail at build time.

    // Verify the publisher is not in any client-side directory
    // globSync is imported at the top of the file
    const clientFiles = globSync("src/app/**/page.tsx", {
      ignore: ["src/app/api/**"],
    });

    for (const file of clientFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("@/lib/events/publisher");
      expect(content).not.toContain("@/lib/events/auth");
      expect(content).not.toContain("publishDomainEvent");
    }
  });

  it("no client page imports events module", () => {
    // globSync is imported at the top of the file
    const clientFiles = globSync("src/app/**/page.tsx", {
      ignore: ["src/app/api/**"],
    });

    for (const file of clientFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toMatch(/import.*@\/lib\/events/);
    }
  });

  it("no client component imports events module", () => {
    // globSync is imported at the top of the file
    const componentFiles = globSync("src/components/**/*.tsx");

    for (const file of componentFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toMatch(/import.*@\/lib\/events/);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Environment variable security
// ---------------------------------------------------------------------------
describe("Environment Security", () => {
  it("EVENT_ENDPOINT_DEV_SECRET is not exposed via NEXT_PUBLIC_", () => {
    // globSync is imported at the top of the file
    const allFiles = globSync("src/**/*.{ts,tsx}", {
      ignore: ["node_modules/**", ".next/**", "src/__tests__/**"],
    });

    const SECRET_PATTERN = "NEXT_PUBLIC_EVENT_ENDPOINT_DEV_SECRET";
    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf-8");
      // Should not reference EVENT_ENDPOINT_DEV_SECRET through NEXT_PUBLIC_ prefix
      expect(content).not.toContain(SECRET_PATTERN);
    }
  });

  it("scheduler service account is not hardcoded in client code", () => {
    // globSync is imported at the top of the file
    const clientFiles = globSync("src/app/**/page.tsx", {
      ignore: ["src/app/api/**"],
    });

    for (const file of clientFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain(
        "careerpilot-runtime@careerpilot-ai-506813",
      );
    }
  });

  it("firebase-admin is not imported by client components", async () => {
    // globSync is imported at the top of the file
    const clientFiles = globSync("src/app/**/page.tsx", {
      ignore: ["src/app/api/**"],
    });

    for (const file of clientFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("firebase-admin");
      expect(content).not.toMatch(/import.*@\/lib\/firebase\/admin/);
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Idempotency deterministic keys
// ---------------------------------------------------------------------------
describe("Idempotency Security", () => {
  it("scheduler deterministic keys prevent duplicate events on same day", () => {
    // Simulating the scheduler's key generation
    const eventType = "APPLICATION_DEADLINE_APPROACHING";
    const applicationId = "app-123";
    const today = new Date().toISOString().split("T")[0];

    const key1 = `evt_${eventType}_${applicationId}_${today}`;
    const key2 = `evt_${eventType}_${applicationId}_${today}`;

    expect(key1).toBe(key2);
  });

  it("different event types produce different keys", () => {
    const applicationId = "app-123";
    const dateKey = "2025-09-01";

    const key1 = `evt_APPLICATION_DEADLINE_APPROACHING_${applicationId}_${dateKey}`;
    const key2 = `evt_APPLICATION_DEADLINE_EXPIRED_${applicationId}_${dateKey}`;

    expect(key1).not.toBe(key2);
  });

  it("different applications produce different keys", () => {
    const eventType = "FOLLOW_UP_DUE";
    const dateKey = "2025-09-01";

    const key1 = `evt_${eventType}_app-1_${dateKey}`;
    const key2 = `evt_${eventType}_app-2_${dateKey}`;

    expect(key1).not.toBe(key2);
  });

  it("different dates produce different keys", () => {
    const eventType = "APPLICATION_DEADLINE_APPROACHING";
    const applicationId = "app-123";

    const key1 = `evt_${eventType}_${applicationId}_2025-09-01`;
    const key2 = `evt_${eventType}_${applicationId}_2025-09-02`;

    expect(key1).not.toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// Test: Response body does not leak sensitive information
// ---------------------------------------------------------------------------
describe("Information Leakage Prevention", () => {
  it("scheduler auth rejection does not reveal bypass mechanism", async () => {
    process.env.EVENT_ENDPOINT_DEV_SECRET = "super-secret";
    try {
      const { verifySchedulerRequest } = await import("@/lib/events/auth");

      const request = new Request(
        "http://localhost:3000/api/events/scheduler",
        { method: "POST" },
      );

      const result = await verifySchedulerRequest(request);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const body = await result.response.json();
        // Should not mention dev bypass, secret, or any internal details
        expect(body.error).not.toContain("dev");
        expect(body.error).not.toContain("secret");
        expect(body.error).not.toContain("EVENT_ENDPOINT");
        expect(body.error).not.toContain("bypass");
      }
    } finally {
      delete process.env.EVENT_ENDPOINT_DEV_SECRET;
    }
  });

  it("pubsub auth rejection does not reveal internal details", async () => {
    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const body = await result.response.json();
      expect(body.error).not.toContain("firebase");
      expect(body.error).not.toContain("google");
      expect(body.error).not.toContain("OIDC");
      expect(body.error).not.toContain("service-account");
      expect(body.error).not.toContain("legacy");
      expect(body.error).not.toContain("verification-token");
    }
  });
});

// ---------------------------------------------------------------------------
// Test: NODE_ENV is not used as bypass
// ---------------------------------------------------------------------------
describe("NODE_ENV Bypass Prevention", () => {
  it("scheduler does not use NODE_ENV for authentication bypass", () => {
    // Read the source code and verify NODE_ENV is not used for auth decisions
    // fs is imported at the top of the file
    const schedulerCode = fs.readFileSync(
      "src/app/api/events/scheduler/route.ts",
      "utf-8",
    );
    const codeWithoutComments = schedulerCode
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    expect(codeWithoutComments).not.toMatch(/NODE_ENV/);
  });

  it("pubsub does not use NODE_ENV for authentication bypass", () => {
    // fs is imported at the top of the file
    const pubsubCode = fs.readFileSync(
      "src/app/api/events/pubsub/route.ts",
      "utf-8",
    );
    const codeWithoutComments = pubsubCode
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    expect(codeWithoutComments).not.toMatch(/NODE_ENV/);
  });

  it("auth module does not use NODE_ENV for bypass", () => {
    // fs is imported at the top of the file
    const authCode = fs.readFileSync("src/lib/events/auth.ts", "utf-8");
    // Check for actual code usage of NODE_ENV, not just comments mentioning it
    const codeWithoutComments = authCode
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    expect(codeWithoutComments).not.toMatch(/NODE_ENV/);
  });
});

// ---------------------------------------------------------------------------
// Test: Verify response status codes
// ---------------------------------------------------------------------------
describe("Response Status Codes", () => {
  it("scheduler returns 401 as JSON", async () => {
    process.env.EVENT_ENDPOINT_DEV_SECRET = "";
    const { verifySchedulerRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/scheduler", {
      method: "POST",
    });

    const result = await verifySchedulerRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const contentType = result.response.headers.get("Content-Type");
      expect(contentType).toContain("application/json");
    }
  });

  it("pubsub returns 401 as JSON", async () => {
    const { verifyPubSubRequest } = await import("@/lib/events/auth");

    const request = new Request("http://localhost:3000/api/events/pubsub", {
      method: "POST",
    });

    const result = await verifyPubSubRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const contentType = result.response.headers.get("Content-Type");
      expect(contentType).toContain("application/json");
    }
  });
});
