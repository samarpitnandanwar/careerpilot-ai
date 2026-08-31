// ============================================================================
// CareerPilot AI — Resume Processing Pipeline
// ============================================================================
//
// Coordinates the full resume intelligence pipeline:
//   Storage → Text Extraction → Gemini → Zod Validation → Firestore
//
// Designed with clean service boundaries for future async migration:
//   Storage → Pub/Sub → Cloud Run → Gemini → Firestore
//
// Each service is independent and testable in isolation.
// ============================================================================

import { downloadResume, StorageAccessError } from "@/lib/storage";
import { extractResumeText, ExtractionError } from "@/lib/resume/extract";
import { generateContent, GeminiError } from "@/lib/ai/vertex";
import { RESUME_PARSER_PROMPT_V1 } from "@/lib/ai/prompts";
import { validateResumeData, ResumeValidationError } from "@/lib/validation/resume-schema";
import { updateResume } from "@/lib/firestore/resumes";
import { publishDomainEvent, type EventContext } from "@/lib/events/publisher";
import type { ParsedResume } from "@/types";

// ---------------------------------------------------------------------------
// Error codes (safe for Firestore — no stack traces)
// ---------------------------------------------------------------------------

export const ERROR_CODES = {
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  EMPTY_DOCUMENT: "EMPTY_DOCUMENT",
  GEMINI_FAILED: "GEMINI_FAILED",
  GEMINI_TIMEOUT: "GEMINI_TIMEOUT",
  GEMINI_UNAVAILABLE: "GEMINI_UNAVAILABLE",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  STORAGE_FAILED: "STORAGE_FAILED",
  FIRESTORE_FAILED: "FIRESTORE_FAILED",
} as const;

// ---------------------------------------------------------------------------
// Pipeline result
// ---------------------------------------------------------------------------

export interface PipelineResult {
  success: boolean;
  parsedData: ParsedResume | null;
  errorCode: string | null;
  errorMessage: string | null;
}

// ---------------------------------------------------------------------------
// Main processing function
// ---------------------------------------------------------------------------

/**
 * Process a resume end-to-end: download → extract → Gemini → validate → save.
 *
 * This is synchronous for development. In production, this can be triggered
 * by Pub/Sub and executed by a Cloud Run worker.
 *
 * @param uid - Verified user UID (from token, never from client)
 * @param resumeId - Server-generated resume ID
 * @param storagePath - Server-generated storage path
 * @param fileType - MIME type of the uploaded file
 */
export async function processResume(
  uid: string,
  resumeId: string,
  storagePath: string,
  fileType: string,
): Promise<PipelineResult> {
  // Step 1: Mark as processing
  try {
    await updateResume(uid, resumeId, { status: "processing" });
  } catch {
    return await fail(uid, resumeId, ERROR_CODES.FIRESTORE_FAILED, "Failed to update resume status");
  }

  try {
    // Step 2: Download from Cloud Storage
    let fileBuffer: Buffer;
    try {
      fileBuffer = await downloadResume(uid, storagePath);
    } catch (error) {
      if (error instanceof StorageAccessError) {
        return await fail(uid, resumeId, ERROR_CODES.STORAGE_FAILED, "Failed to access resume file");
      }
      return await fail(uid, resumeId, ERROR_CODES.STORAGE_FAILED, "Failed to download resume file");
    }

    // Step 3: Extract text
    let extractionResult;
    try {
      extractionResult = await extractResumeText(fileBuffer, fileType);
    } catch (error) {
      if (error instanceof ExtractionError) {
        const code = error.code === "EMPTY_PDF" || error.code === "EMPTY_DOCX"
          ? ERROR_CODES.EMPTY_DOCUMENT
          : ERROR_CODES.EXTRACTION_FAILED;
        return await fail(uid, resumeId, code, error.message);
      }
      return await fail(uid, resumeId, ERROR_CODES.EXTRACTION_FAILED, "Failed to extract text from resume");
    }

    // Truncate very long text to stay within Gemini limits
    const maxChars = 100_000;
    const resumeText = extractionResult.text.slice(0, maxChars);

    // Step 4: Send to Gemini
    let rawResponse: string;
    try {
      const prompt = RESUME_PARSER_PROMPT_V1 + resumeText;
      rawResponse = await generateContent(prompt);
    } catch (error) {
      if (error instanceof GeminiError) {
        if (error.code === "NO_RESPONSE") {
          return await fail(uid, resumeId, ERROR_CODES.GEMINI_UNAVAILABLE, "Resume processing is temporarily unavailable. Please try again.");
        }
        return await fail(uid, resumeId, ERROR_CODES.GEMINI_FAILED, "AI processing failed. Please try again.");
      }
      return await fail(uid, resumeId, ERROR_CODES.GEMINI_FAILED, "Resume processing is temporarily unavailable. Please try again.");
    }

    // Step 5: Parse JSON response
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      // Attempt to extract JSON from markdown code blocks
      const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch {
          return await fail(uid, resumeId, ERROR_CODES.INVALID_RESPONSE, "Failed to parse AI response");
        }
      } else {
        return await fail(uid, resumeId, ERROR_CODES.INVALID_RESPONSE, "Failed to parse AI response");
      }
    }

    // Step 6: Validate with Zod
    let validatedData: ParsedResume;
    try {
      const data = validateResumeData(parsed);
      // Add backward-compatible fields for existing consumers
      const experienceWithCompat = data.experience.map((exp) => ({
        ...exp,
        title: exp.role,
        description: [...exp.responsibilities, ...exp.achievements].join("\n"),
        skills: exp.technologies,
      }));
      validatedData = {
        ...data,
        experience: experienceWithCompat,
        name: data.personal.name,
        technologies: [
          ...new Set([
            ...data.skills.technical,
            ...data.skills.tools,
            ...data.skills.frameworks,
          ]),
        ],
      };
    } catch (error) {
      if (error instanceof ResumeValidationError) {
        return await fail(uid, resumeId, ERROR_CODES.VALIDATION_FAILED, "AI response did not match expected format");
      }
      return await fail(uid, resumeId, ERROR_CODES.VALIDATION_FAILED, "Resume data validation failed");
    }

    // Step 7: Save to Firestore
    try {
      await updateResume(uid, resumeId, {
        status: "ready",
        parsedData: validatedData,
      });
    } catch {
      return await fail(uid, resumeId, ERROR_CODES.FIRESTORE_FAILED, "Failed to save parsed resume data");
    }

    // Step 8: Publish domain event (fire-and-forget)
    const eventCtx: EventContext = { userId: uid };
    publishDomainEvent(
      eventCtx,
      "RESUME_PROCESSED",
      { type: "resume", id: resumeId },
      { resumeId },
    ).catch((err) =>
      console.error("[ResumePipeline] Failed to publish RESUME_PROCESSED event:", err),
    );

    return {
      success: true,
      parsedData: validatedData,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    // Catch-all: never let unexpected errors crash the pipeline
    console.error("[ResumePipeline] Unexpected error:", error instanceof Error ? error.message : String(error));
    
    // Publish failure event (fire-and-forget)
    publishDomainEvent(
      { userId: uid },
      "RESUME_PROCESSING_FAILED",
      { type: "resume", id: resumeId },
      { resumeId },
    ).catch(() => {});
    
    return await fail(uid, resumeId, ERROR_CODES.GEMINI_FAILED, "An unexpected error occurred during processing");
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function fail(
  uid: string,
  resumeId: string,
  code: string,
  message: string,
): Promise<PipelineResult> {
  // Persist failure to Firestore so the resume doesn't stay stuck at "processing"
  try {
    await updateResume(uid, resumeId, {
      status: "failed",
      errorCode: code,
      errorMessage: message,
    });
  } catch (err) {
    console.error("[ResumePipeline] Failed to persist error state:", err);
  }
  return { success: false, parsedData: null, errorCode: code, errorMessage: message };
}
