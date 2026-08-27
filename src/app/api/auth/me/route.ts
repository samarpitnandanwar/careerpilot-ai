// ============================================================================
// CareerPilot AI — /api/auth/me
// ============================================================================
//
// POST/GET: Verify the ID token in the Authorization header and return
// the authenticated user's UID, email, and display name.
//
// This is the canonical way for the client to confirm its session with
// the server. It is NOT a session-creation endpoint — Identity Platform
// handles sessions on the client.
// ============================================================================

import { NextResponse } from "next/server";
import { verifyAuthHeader } from "@/lib/firebase/server-auth";

export async function GET(request: Request) {
  const user = await verifyAuthHeader(request);

  if (!user) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    },
  });
}
