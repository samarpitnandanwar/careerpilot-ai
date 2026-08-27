// ============================================================================
// CareerPilot AI — Server-Side Token Verification
// ============================================================================
//
// Extracts the authenticated user UID from an Identity Platform ID token
// sent in the Authorization header. The server NEVER trusts a client-
// provided UID — it always comes from the verified token.
//
// Usage in API routes:
//   const uid = await verifyAuthHeader(request);
//   if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// ============================================================================

import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./admin";

export interface VerifiedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Verifies the Bearer token from the request's Authorization header.
 * Returns the verified user's UID and profile, or null if invalid/missing.
 *
 * This NEVER trusts client-supplied UIDs — the UID comes solely from
 * the cryptographic verification of the Firebase/Identity Platform token.
 */
export async function verifyAuthHeader(
  request: Request,
): Promise<VerifiedUser | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(token);

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
    };
  } catch (error) {
    // Token is expired, revoked, or malformed — treat as unauthenticated.
    console.warn("[ServerAuth] Token verification failed:", error);
    return null;
  }
}

/**
 * Same as verifyAuthHeader but throws if unauthorized.
 * Use in API routes where you want to short-circuit immediately.
 */
export async function requireAuth(request: Request): Promise<VerifiedUser> {
  const user = await verifyAuthHeader(request);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
