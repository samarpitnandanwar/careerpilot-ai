// ============================================================================
// CareerPilot AI — POST /api/jobs/[id]/apply
// ============================================================================
//
// Creates an application for a job. The server derives jobTitle and company
// from the authenticated user's job record. Client cannot spoof these values.
//
// If an application for this job already exists, returns the existing one.
// ============================================================================

import { requireUser, jsonOk, jsonError, jsonNotFound, jsonInternal } from "@/lib/api-helpers";
import { getJob } from "@/lib/firestore/jobs";
import {
  createApplication,
  getApplicationByJobId,
} from "@/lib/firestore/applications";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// Client-submitted fields only — server derives jobId, jobTitle, company
const JobApplySchema = z.object({
  resumeId: z.string().nullable().optional(),
  source: z.string().max(100).optional(),
  applicationUrl: z.string().url().nullable().optional(),
  deadline: z.string().nullable().optional(),
  notes: z.string().max(5000).optional(),
  initialStatus: z.enum(["saved", "applied"]).optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: jobId } = await params;

  try {
    // 1. Verify job exists and belongs to this user
    const job = await getJob(user.uid, jobId);
    if (!job) return jsonNotFound("Job not found");

    // 2. Parse and validate client input (no jobId, jobTitle, company allowed)
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine for a simple "apply" action
    }

    const parsed = JobApplySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(`Validation failed: ${message}`);
    }

    // 3. Check for existing application for this job
    const existing = await getApplicationByJobId(user.uid, jobId);
    if (existing) {
      // Return existing application instead of creating duplicate
      return jsonOk(existing);
    }

    // 4. Create application with SERVER-DERIVED job data
    const application = await createApplication(user.uid, {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      resumeId: parsed.data.resumeId ?? null,
      source: parsed.data.source ?? "manual",
      applicationUrl: parsed.data.applicationUrl ?? null,
      deadline: parsed.data.deadline ?? job.deadline ?? null,
      notes: parsed.data.notes ?? "",
      initialStatus: parsed.data.initialStatus ?? "saved",
    });

    return jsonOk(application);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON body");
    return jsonInternal(error instanceof Error ? error.message : "Failed to create application");
  }
}
