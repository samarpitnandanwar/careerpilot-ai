// ============================================================================
// CareerPilot AI — POST /api/resumes/upload
// ============================================================================
//
// Accepts multipart/form-data with a resume file.
// Validates file type/size, uploads to Cloud Storage, creates Firestore record.
// ============================================================================

import {
  requireUser,
  jsonCreated,
  jsonError,
  jsonInternal,
} from "@/lib/api-helpers";
import {
  uploadResume,
  MAX_RESUME_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
} from "@/lib/storage";
import { createResume } from "@/lib/firestore/resumes";
import { getDb, resumesCol } from "@/lib/firestore/db";
import { processResume } from "@/lib/resume";

const MAX_FILE_SIZE_MB = 10;

export async function POST(request: Request) {
  const [user, err] = await requireUser(request);
  if (err) return err;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    // Accept multipart/form-data
    if (!contentType.includes("multipart/form-data")) {
      return jsonError("Upload must be multipart/form-data");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonError("No file provided");
    }

    // --- File validation ---

    // Check file size
    if (file.size === 0) {
      return jsonError("File is empty");
    }
    if (file.size > MAX_RESUME_SIZE_BYTES) {
      return jsonError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
    }

    // Check MIME type
    const mime = file.type;
    const fileName = file.name;
    const ext = "." + fileName.split(".").pop()?.toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(mime) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return jsonError("Only PDF and DOCX files are supported.");
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // --- Generate server-controlled IDs ---
    const db = getDb();
    const resumeId = resumesCol(db, user.uid).doc().id;

    // --- Upload to Cloud Storage ---
    let uploadedPath: string;
    try {
      uploadedPath = await uploadResume(
        user.uid,
        resumeId,
        fileName,
        buffer,
        mime || "application/octet-stream",
      );
    } catch (error) {
      console.error("[Upload] Storage error:", error);
      return jsonInternal("Failed to upload file to storage");
    }

    // --- Create Firestore record ---
    let resume;
    try {
      resume = await createResume(user.uid, {
        fileName,
        storagePath: uploadedPath,
        fileType: mime || "application/octet-stream",
        fileSize: file.size,
      });
    } catch (error) {
      console.error("[Upload] Firestore error:", error);
      return jsonInternal("Failed to save resume record");
    }

    // --- Process resume (extract text + Gemini analysis) ---
    // Run synchronously so the Cloud Run instance stays alive.
    const processResult = await processResume(
      user.uid,
      resume.id,
      uploadedPath,
      mime || "application/octet-stream",
    ).catch((error) => {
      console.error("[Upload] Processing error:", error);
      return null;
    });

    // Return the resume with its current status (may be 'ready' or 'failed')
    if (processResult && processResult.success) {
      return jsonCreated({ ...resume, status: "ready" });
    }

    return jsonCreated(resume);
  } catch (error) {
    console.error("[Upload] Unexpected error:", error);
    return jsonInternal("Failed to process upload");
  }
}
