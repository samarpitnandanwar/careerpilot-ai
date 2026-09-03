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
import * as jose from "jose";

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
 *
 * Uses firebase-admin's verifyIdToken first. If that fails with an issuer
 * mismatch (Identity Platform vs legacy securetoken), falls back to manual
 * JWKS-based verification that accepts both issuers.
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
  } catch (adminError) {
    // firebase-admin's verifyIdToken rejects Identity Platform tokens because
    // it expects issuer "https://securetoken.google.com/<project>" but
    // Identity Platform uses "https://identitytoolkit.google.com/".
    // Fall back to manual JWKS verification for Identity Platform tokens.
    if (
      adminError instanceof Error &&
      adminError.message.includes("incorrect \"iss\" (issuer) claim")
    ) {
      try {
        return await verifyWithJwks(token);
      } catch (jwksError) {
        console.warn("[ServerAuth] JWKS fallback verification failed:", jwksError);
        return null;
      }
    }
    // Token is expired, revoked, or malformed — treat as unauthenticated.
    console.warn("[ServerAuth] Token verification failed:", adminError);
    return null;
  }
}

/**
 * Manual JWKS-based token verification for Identity Platform tokens.
 * Accepts both "https://identitytoolkit.google.com/" and
 * "https://securetoken.google.com/<project>" issuers.
 */
async function verifyWithJwks(token: string): Promise<VerifiedUser> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "careerpilot-ai-506813";

  // Decode header to get kid (key ID)
  const header = jose.decodeProtectedHeader(token);
  if (!header.kid) throw new Error("Missing kid in token header");

  // Fetch Google's public keys (JWKS)
  const jwksUri = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
  // Use the Identity Platform JWKS endpoint instead
  const ipJwksUri = `https://identitytoolkit.googleapis.com/v1/public_keys`;

  // Try Identity Platform JWKS first
  let signingKey: jose.KeyLike;
  try {
    const ipJwks = await jose.createRemoteJWKSet(new URL(ipJwksUri))(
      header,
      {} as jose.JWTVerifyOptions,
    );
    signingKey = ipJwks as jose.KeyLike;
  } catch {
    // Fall back to securetoken JWKS
    const stJwks = await jose.createRemoteJWKSet(new URL(jwksUri))(
      header,
      {} as jose.JWTVerifyOptions,
    );
    signingKey = stJwks as jose.KeyLike;
  }

  // Verify with both accepted issuers
  const { payload } = await jose.jwtVerify(token, signingKey, {
    issuer: [
      "https://identitytoolkit.google.com/",
      `https://securetoken.google.com/${projectId}`,
    ],
    audience: projectId,
  });

  const uid = payload.sub;
  if (!uid || typeof uid !== "string") {
    throw new Error("Missing or invalid sub claim");
  }

  return {
    uid,
    email: typeof payload.email === "string" ? payload.email : null,
    displayName: typeof payload.name === "string" ? payload.name : null,
  };
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
