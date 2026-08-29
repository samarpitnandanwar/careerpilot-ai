// ============================================================================
// CareerPilot AI — Pub/Sub Push Consumer
// ============================================================================
//
// Receives Pub/Sub push delivery of domain events.
// Decodes, validates, and processes events idempotently.
//
// POST /api/events/pubsub
//
// Security:
//   - Production: authentication is MANDATORY.
//     Accepts ONLY:
//       1. Google-signed OIDC token (authenticated Pub/Sub push)
//     The legacy X-Goog-Pubsub-Verification-Token header is NOT accepted.
//     Rejects all unauthenticated requests with 401.
//
//   - Development: a controlled bypass is available ONLY when
//     EVENT_ENDPOINT_DEV_SECRET is set AND the request carries
//     the matching X-Event-Dev-Secret header. This is NOT activated
//     by NODE_ENV.
//
//   - Does NOT rely on URL secrecy for authentication.
//   - Validates Pub/Sub message structure with Zod.
//   - Validates domain event envelope with Zod.
//   - Uses idempotency to prevent duplicate processing.
// ============================================================================

import { NextResponse } from "next/server";
import { PubSubPushBodySchema } from "@/lib/events/schemas";
import { decodePubSubMessage, processEvent } from "@/lib/events/processor";
import { verifyPubSubRequest } from "@/lib/events/auth";
import type { DomainEventEnvelope } from "@/types";

export async function POST(request: Request) {
  // ---- Authentication ----
  // Production: require valid OIDC token (authenticated Pub/Sub push).
  // Development: optional bypass via EVENT_ENDPOINT_DEV_SECRET header.
  const authResult = await verifyPubSubRequest(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  // ---- Parse body ----
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // ---- Validate Pub/Sub push structure ----
  const pushValidation = PubSubPushBodySchema.safeParse(body);
  if (!pushValidation.success) {
    console.error(
      "[PubSub] Invalid push body:",
      pushValidation.error.message,
    );
    return NextResponse.json(
      { error: "Invalid Pub/Sub message structure" },
      { status: 400 },
    );
  }

  const { message } = pushValidation.data;

  // ---- Decode and validate domain event envelope ----
  const event: DomainEventEnvelope | null = decodePubSubMessage(message.data);
  if (!event) {
    console.error("[PubSub] Failed to decode/validate event");
    // Return 200 to prevent Pub/Sub retries for permanently invalid messages
    return NextResponse.json(
      { error: "Invalid event payload" },
      { status: 200 },
    );
  }

  // ---- Process event idempotently ----
  const success = await processEvent(event);

  if (!success) {
    // Return 500 to trigger Pub/Sub retry
    console.error(
      `[PubSub] Event processing failed: ${event.eventType} (${event.eventId})`,
    );
    return NextResponse.json(
      { error: "Event processing failed, will retry" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
