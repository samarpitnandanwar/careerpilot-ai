// ============================================================================
// CareerPilot AI — Server-Side Admin SDK
// ============================================================================
//
// Initializes the Firebase Admin SDK for privileged server-side operations:
// Identity Platform token verification, Firestore, Cloud Storage.
//
// CREDENTIAL STRATEGY (Application Default Credentials — ADC):
//
//   Production (Cloud Run):
//     ADC automatically uses the runtime service account:
//       careerpilot-runtime@careerpilot-ai-506813.iam.gserviceaccount.com
//     No configuration needed. No JSON key file.
//
//   Local development:
//     Run:  gcloud auth application-default login
//     This stores credentials in the standard ADC location (~/.config/gcloud/).
//     No GOOGLE_APPLICATION_CREDENTIALS env var needed.
//
//   CI / Non-GCP environments:
//     If ADC is unavailable, token verification will fail with a clear error.
//     Set GOOGLE_APPLICATION_CREDENTIALS pointing to a service-account JSON
//     ONLY for local testing — NEVER in production.
//
// SECURITY RULES:
//   - NEVER commit a service-account JSON file.
//   - NEVER put service-account keys in environment variables committed to git.
//   - NEVER expose this module to client components.
//   - This file must ONLY be imported in server-only code (API routes, workers).
// ============================================================================

import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

// ---------------------------------------------------------------------------
// Lazy singletons — initialized on first use
// ---------------------------------------------------------------------------

let _app: App | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;

function getOrInitApp(): App {
  if (_app) return _app;

  const apps = getApps();
  if (apps.length > 0) {
    _app = apps[0];
    return _app;
  }

  // initializeApp() with no credential option uses ADC automatically:
  //   1. Cloud Run → runtime service account (implicit)
  //   2. Local dev → gcloud auth application-default login
  //   3. Fallback → GOOGLE_APPLICATION_CREDENTIALS env var (local dev only)
  //
  // If none are available, verifyIdToken() will throw a clear error.
  // Do NOT pass explicit projectId — ADC auto-detects it on Cloud Run.
  // Setting projectId constrains the JWT issuer check to securetoken.google.com,
  // but Identity Platform tokens use identitytoolkit.google.com as issuer.
  // ADC-based initialization accepts both issuers automatically.
  _app = initializeApp({
    storageBucket: process.env.NEXT_PUBLIC_RESUME_BUCKET ?? "careerpilot-ai-506813-resumes",
  });

  return _app;
}

/**
 * Returns the Admin Firestore instance.
 * Uses ADC — no service-account JSON required in production.
 */
export function getAdminFirestore(): Firestore {
  if (_db) return _db;
  const app = getOrInitApp();
  _db = getFirestore(app);
  return _db;
}

/**
 * Returns the Admin Cloud Storage instance.
 * Uses ADC — no service-account JSON required in production.
 */
export function getAdminStorage(): Storage {
  if (_storage) return _storage;
  const app = getOrInitApp();
  _storage = getStorage(app);
  return _storage;
}

/**
 * Returns the raw Admin App instance for token verification etc.
 */
export function getAdminApp(): App {
  return getOrInitApp();
}
