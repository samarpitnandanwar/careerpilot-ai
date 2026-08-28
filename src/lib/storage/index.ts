// ============================================================================
// CareerPilot AI — Cloud Storage Service
// ============================================================================
//
// Private bucket: careerpilot-ai-506813-resumes
// Path structure: users/{uid}/resumes/{resumeId}/original/{fileName}
//
// All operations require an authenticated UID (never from client request).
// No public URLs — uses signed URLs for browser access.
// ============================================================================

import { getAdminStorage } from "@/lib/firebase/admin";

const BUCKET_NAME = process.env.NEXT_PUBLIC_RESUME_BUCKET ?? "careerpilot-ai-506813-resumes";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

// ---------------------------------------------------------------------------
// Path builder (server-controlled, never from client)
// ---------------------------------------------------------------------------

export function buildStoragePath(uid: string, resumeId: string, fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  return `users/${uid}/resumes/${resumeId}/original/${sanitized}`;
}

function sanitizeFileName(name: string): string {
  // Remove path traversal, control characters, keep only safe chars
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.\./g, "_")  // Remove path traversal
    .replace(/_{2,}/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 200) || "resume";
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export async function uploadResume(
  uid: string,
  resumeId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const storagePath = buildStoragePath(uid, resumeId, fileName);
  const bucket = getAdminStorage().bucket(BUCKET_NAME);

  await bucket.file(storagePath).save(fileBuffer, {
    contentType,
    metadata: {
      metadata: {
        uid,
        resumeId,
      },
    },
  });

  return storagePath;
}

// ---------------------------------------------------------------------------
// Download (returns Buffer)
// ---------------------------------------------------------------------------

export async function downloadResume(
  uid: string,
  storagePath: string,
): Promise<Buffer> {
  validateOwnership(uid, storagePath);

  const bucket = getAdminStorage().bucket(BUCKET_NAME);
  const [buffer] = await bucket.file(storagePath).download();
  return buffer;
}

// ---------------------------------------------------------------------------
// Generate signed URL (short-lived, for browser access)
// ---------------------------------------------------------------------------

export async function getResumeSignedUrl(
  uid: string,
  storagePath: string,
): Promise<string> {
  validateOwnership(uid, storagePath);

  const bucket = getAdminStorage().bucket(BUCKET_NAME);
  const [url] = await bucket.file(storagePath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });

  return url;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteResumeFile(
  uid: string,
  storagePath: string,
): Promise<void> {
  validateOwnership(uid, storagePath);

  const bucket = getAdminStorage().bucket(BUCKET_NAME);
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}

// ---------------------------------------------------------------------------
// Security: ownership validation
// ---------------------------------------------------------------------------

function validateOwnership(uid: string, storagePath: string): void {
  if (!storagePath.startsWith(`users/${uid}/`)) {
    throw new StorageAccessError("Access denied");
  }
  // Prevent path traversal
  if (storagePath.includes("..")) {
    throw new StorageAccessError("Invalid storage path");
  }
}

export class StorageAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageAccessError";
  }
}
