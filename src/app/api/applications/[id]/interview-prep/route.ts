// ============================================================================
// CareerPilot AI — /api/applications/[id]/interview-prep
// ============================================================================
//
// POST: Generate interview preparation for an application
// GET:  Retrieve latest interview preparation
// ============================================================================

import {
  requireUser,
  jsonOk,
  jsonNotFound,
  jsonInternal,
  jsonError,
} from "@/lib/api-helpers";
import { getApplication } from "@/lib/firestore/applications";
import { getJob } from "@/lib/firestore/jobs";
import { getResumes } from "@/lib/firestore/resumes";
import { getLatestJobAnalysis } from "@/lib/firestore/job-analyses";
import { getInterviews } from "@/lib/firestore/interviews";
import { generateInterviewPrep, saveInterviewPrep, getLatestInterviewPrep } from "@/lib/interview/copilot";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: applicationId } = await params;

  try {
    // 1. Load application and verify ownership (user.uid is the verified UID)
    const application = await getApplication(user.uid, applicationId);
    if (!application) return jsonNotFound("Application not found");

    // 2. Load job
    const job = await getJob(user.uid, application.jobId);
    if (!job) return jsonNotFound("Job not found for this application");

    // 3. Load resume (use active resume, or most recent)
    const resumes = await getResumes(user.uid);
    const activeResume = resumes.find((r) => r.active && r.status === "ready");
    const resume = activeResume ?? resumes.find((r) => r.status === "ready");
    if (!resume) {
      return jsonError("No processed resume found. Upload and process a resume first.");
    }
    if (!resume.parsedData) {
      return jsonError("Resume has not been fully processed yet.");
    }

    // 4. Load latest match analysis
    const matchAnalysis = await getLatestJobAnalysis(user.uid, application.jobId);

    // 5. Load interview context if available
    const interviews = await getInterviews(user.uid);
    const relatedInterview = interviews.find((i) => i.applicationId === applicationId);
    const interview = relatedInterview ?? null;

    // 6. Generate interview preparation via Gemini
    const prepData = await generateInterviewPrep({
      applicationId,
      job,
      resume,
      matchAnalysis,
      interview,
    });

    // 7. Save to Firestore
    const saved = await saveInterviewPrep(user.uid, applicationId, prepData);

    return jsonOk({ interviewPrep: saved });
  } catch (error) {
    console.error("[InterviewCopilot] Generation failed:", error);
    return jsonInternal(
      error instanceof Error ? error.message : "Interview preparation failed",
    );
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  const { id: applicationId } = await params;

  try {
    // Verify application ownership
    const application = await getApplication(user.uid, applicationId);
    if (!application) return jsonNotFound("Application not found");

    // Get latest interview prep
    const prep = await getLatestInterviewPrep(user.uid, applicationId);
    if (!prep) {
      return jsonOk({
        interviewPrep: null,
        message: "No interview preparation yet. POST to generate.",
      });
    }

    return jsonOk({ interviewPrep: prep });
  } catch (error) {
    return jsonInternal(
      error instanceof Error ? error.message : "Failed to get interview preparation",
    );
  }
}
