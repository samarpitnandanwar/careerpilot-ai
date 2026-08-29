// ============================================================================
// CareerPilot AI — Server API Helpers
// ============================================================================

import { NextResponse } from "next/server";
import { verifyAuthHeader, type VerifiedUser } from "@/lib/firebase/server-auth";
import type { ApiResponse } from "@/types";

// ---------------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------------

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function jsonCreated<T>(data: T) {
  return jsonOk(data, 201);
}

export function jsonError(error: string, status = 400) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    { status },
  );
}

export function jsonUnauthorized(message = "Authentication required") {
  return jsonError(message, 401);
}

export function jsonNotFound(message = "Not found") {
  return jsonError(message, 404);
}

export function jsonConflict(message = "Resource already exists") {
  return jsonError(message, 409);
}

/**
 * Always returns a safe generic 500 error to the client.
 * Never leaks internal error details (Firestore, Google API, etc.).
 * The message parameter is logged server-side but NOT sent to the client.
 */
export function jsonInternal(message?: string) {
  if (message) {
    console.error("[API] Internal error detail:", message);
  }
  return jsonError("Internal server error", 500);
}

// ---------------------------------------------------------------------------
// Auth wrapper — extracts verified user from request
// ---------------------------------------------------------------------------

/**
 * Extracts the authenticated user from the request's Authorization header.
 * Returns [user, null] on success or [null, NextResponse] on failure.
 *
 * Usage in API routes:
 *   const [user, err] = await requireUser(request);
 *   if (err) return err;
 *   // user.uid is guaranteed to be from the verified token.
 */
export async function requireUser(
  request: Request,
): Promise<[VerifiedUser, null] | [null, NextResponse]> {
  const user = await verifyAuthHeader(request);
  if (!user) return [null, jsonUnauthorized()];
  return [user, null];
}

// ---------------------------------------------------------------------------
// Safe error handler — wraps Firestore operations
// ---------------------------------------------------------------------------

export async function handleFirestoreError<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Log detailed error server-side only — never expose to client
    console.error("[Firestore] Operation failed:", error);
    throw new FirestoreOperationError("Database operation failed");
  }
}

export class FirestoreOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreOperationError";
  }
}
