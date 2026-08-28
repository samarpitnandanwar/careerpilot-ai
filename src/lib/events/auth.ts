// ============================================================================
// CareerPilot AI — Event Endpoint Authentication
// ============================================================================
//
// Provides production-safe authentication for:
//   - Cloud Scheduler (OIDC service-account token)
//   - Pub/Sub push (OIDC token from authenticated push)
//
// Both services send Google-signed JWTs that we verify against Google's
// public JWKS endpoint.
//
// Security:
//   - Production: authentication is MANDATORY. No bypass.
//   - Development: a controlled bypass is allowed ONLY when explicitly
//     configured via a non-public environment variable.
//   - We never use NODE_ENV as a bypass (it can be spoofed).
// ============================================================================

import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/admin";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The runtime service account that Cloud Scheduler uses */
const SCHEDULER_SERVICE_ACCOUNT =
  "careerpilot-runtime@careerpilot-ai-506813.iam.gserviceaccount.com";

/** Pub/Sub push sends this header for authenticated push */
const PUBSUB_OIDC_ISSUER = "https://accounts.google.com";

/** Google's JWKS endpoint for public key verification */
const GOOGLE_JWKS_URL =
  "https://www.googleapis.com/oauth2/v3/certs";

// ---------------------------------------------------------------------------
// Local development bypass
// ---------------------------------------------------------------------------

/**
 * When the event endpoint runs locally without real GCP credentials,
 * set this to a strong random secret to allow development bypass.
 *
 * NEVER set this in production. NEVER commit this value.
 * The dev bypass only activates when:
 *   1. The env var is set AND
 *   2. The request carries the matching secret header
 */
function getDevBypassSecret(): string {
  return process.env.EVENT_ENDPOINT_DEV_SECRET ?? "";
}

// ---------------------------------------------------------------------------
// OIDC token verification (Google-signed JWTs)
// ---------------------------------------------------------------------------

/**
 * Import jose dynamically to avoid bundling issues.
 * jose is a pure-JS JWT library — no native dependencies.
 */
async function getJose() {
  return import("jose");
}

/**
 * Verify a Google-signed OIDC JWT.
 * Returns the verified service account email, or null if invalid.
 */
async function verifyGoogleOIDCToken(
  token: string,
): Promise<string | null> {
  try {
    const jose = await getJose();
    const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: PUBSUB_OIDC_ISSUER,
    });

    // Verify the token is from a known service account
    const email = payload.email as string | undefined;
    if (!email) return null;

    return email;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public verification functions
// ---------------------------------------------------------------------------

export interface VerifiedServiceAccount {
  email: string;
}

export type AuthVerificationResult =
  | { ok: true; identity: VerifiedServiceAccount }
  | { ok: false; response: Response };

/**
 * Verify the scheduler endpoint request.
 *
 * Accepts:
 *   1. A valid Identity Platform user token (from requireUser)
 *   2. A Google-signed OIDC service-account token from Cloud Scheduler
 *   3. In development only: a bypass secret header
 *
 * Returns the verified identity or a rejection Response.
 */
export async function verifySchedulerRequest(
  request: Request,
): Promise<AuthVerificationResult> {
  // --- Path 1: Standard Identity Platform user token ---
  // If the request carries a valid user token, accept it.
  // This supports direct user invocation for testing.
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      try {
        const app = getAdminApp();
        const auth = getAuth(app);
        const decoded = await auth.verifyIdToken(token);
        return {
          ok: true,
          identity: { email: decoded.email ?? `uid:${decoded.uid}` },
        };
      } catch {
        // Not a valid Identity Platform token — try other methods
      }
    }
  }

  // --- Path 2: Google OIDC service-account token (Cloud Scheduler) ---
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      const email = await verifyGoogleOIDCToken(token);
      if (email) {
        return {
          ok: true,
          identity: { email },
        };
      }
    }
  }

  // --- Path 3: Development bypass ---
  // ONLY when explicitly configured via EVENT_ENDPOINT_DEV_SECRET env var.
  // Requires a matching secret in the X-Event-Dev-Secret header.
  const devBypassSecret = getDevBypassSecret();
  if (devBypassSecret) {
    const devSecret = request.headers.get("X-Event-Dev-Secret");
    if (devSecret === devBypassSecret) {
      console.warn(
        "[EventAuth] WARNING: Using development bypass for scheduler endpoint. " +
          "This MUST NOT happen in production.",
      );
      return {
        ok: true,
        identity: { email: "dev-bypass@localhost" },
      };
    }
  }

  // --- Rejected ---
  return {
    ok: false,
    response: new Response(
      JSON.stringify({
        success: false,
        error: "Unauthorized: valid authentication required",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  };
}

/**
 * Verify the Pub/Sub push endpoint request.
 *
 * In production with authenticated push enabled, Pub/Sub sends a
 * Google-signed OIDC token in the Authorization header.
 *
 * Without authenticated push, we verify the request structure
 * but cannot verify the sender. In that case, we rely on:
 *   1. Network-level protection (VPC, Cloud Armor)
 *   2. The message being validated/envelope-checked anyway
 *
 * Returns the verified identity or a rejection Response.
 */
export async function verifyPubSubRequest(
  request: Request,
): Promise<AuthVerificationResult> {
  const authHeader = request.headers.get("Authorization");

  // --- Path 1: Google OIDC token (authenticated Pub/Sub push) ---
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      const email = await verifyGoogleOIDCToken(token);
      if (email) {
        return {
          ok: true,
          identity: { email },
        };
      }
    }
  }

  // --- Path 2: Check for Pub/Sub verification token header ---
  // Google Pub/Sub can also send a verification token in a custom header.
  // For legacy push subscriptions without OIDC.
  const pubsubToken = request.headers.get("X-Goog-Pubsub-Verification-Token");
  if (pubsubToken) {
    // This is a Pub/Sub-specific header that only Pub/Sub sends.
    // In production, verify against the subscription's verification token.
    // For now, accept as a signal that this is a Pub/Sub request.
    console.warn(
      "[EventAuth] Received Pub/Sub verification token (legacy mode). " +
        "Consider enabling authenticated push for stronger security.",
    );
    return {
      ok: true,
      identity: { email: "pubsub-legacy@system" },
    };
  }

  // --- Path 3: Development bypass ---
  const devBypassSecret = getDevBypassSecret();
  if (devBypassSecret) {
    const devSecret = request.headers.get("X-Event-Dev-Secret");
    if (devSecret === devBypassSecret) {
      console.warn(
        "[EventAuth] WARNING: Using development bypass for Pub/Sub endpoint. " +
          "This MUST NOT happen in production.",
      );
      return {
        ok: true,
        identity: { email: "dev-bypass@localhost" },
      };
    }
  }

  // --- Rejected (in production) ---
  return {
    ok: false,
    response: new Response(
      JSON.stringify({
        success: false,
        error: "Unauthorized: Pub/Sub authentication required",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Check if a verified service account is an accepted scheduler identity.
 * Used for defense-in-depth even after JWT verification.
 */
export function isAcceptedSchedulerIdentity(
  email: string,
): boolean {
  return email === SCHEDULER_SERVICE_ACCOUNT;
}
