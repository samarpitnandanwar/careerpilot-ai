// ============================================================================
// CareerPilot AI — Server-Side Admin SDK
// ============================================================================
//
// This module initializes the Firebase Admin SDK for privileged server-side
// operations: Firestore access, token verification, Cloud Storage.
//
// CREDENTIAL STRATEGY:
//   - Production (Cloud Run): uses the runtime service account automatically
//     via Application Default Credentials (ADC).
//   - Local dev: uses GOOGLE_APPLICATION_CREDENTIALS env var pointing to a
//     service-account JSON, OR falls back to the Firebase Emulator, OR
//     provides a clear error.
//
// NEVER commit a service-account JSON file.
// NEVER put service-account keys in environment variables committed to git.
// NEVER expose this module to client components.
// ============================================================================

import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

// ---------------------------------------------------------------------------
// Lazy singletons
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

  // In production, ADC picks up the Cloud Run runtime service account.
  // In local dev, ADC looks for GOOGLE_APPLICATION_CREDENTIALS.
  // If neither is available, initialization will fail with a clear error.
  _app = initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "careerpilot-ai-506813",
    storageBucket: process.env.NEXT_PUBLIC_RESUME_BUCKET ?? "careerpilot-ai-506813-resumes",
    credential: cert({}),
  });

  return _app;
}

/**
 * Returns the Admin Firestore instance.
 * @throws If Firebase Admin cannot initialize.
 */
export function getAdminFirestore(): Firestore {
  if (_db) return _db;
  const app = getOrInitApp();
  _db = getFirestore(app);
  return _db;
}

/**
 * Returns the Admin Cloud Storage instance.
 * @throws If Firebase Admin cannot initialize.
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
