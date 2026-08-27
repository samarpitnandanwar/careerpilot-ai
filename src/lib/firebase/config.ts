// ============================================================================
// CareerPilot AI — Identity Platform (Client Configuration)
// ============================================================================
//
// Identity Platform provides Firebase-compatible authentication APIs.
// This file initializes the Firebase client SDK which connects to our
// Identity Platform tenant — NOT to Firebase services.
//
// Environment variables use the NEXT_PUBLIC_ prefix so they are available
// in client bundles. They contain only public config (API key, project ID),
// never secrets.
// ============================================================================

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ""}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ""}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

/**
 * Lazily initialized Firebase app singleton.
 * Returns null when required env vars are missing (e.g. in CI, local dev
 * without a .env.local). Callers MUST handle the null case gracefully.
 */
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getApp(): FirebaseApp | null {
  if (_app) return _app;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;

  const apps = getApps();
  _app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  return _app;
}

/**
 * Returns the Identity Platform Auth instance, or null if the client
 * is not configured. Components should handle the null case by showing
 * a configuration notice instead of crashing.
 */
export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth;
  const app = getApp();
  if (!app) return null;
  _auth = getAuth(app);
  return _auth;
}

/**
 * True when the client environment has the required Identity Platform
 * configuration variables. Useful for conditional rendering of auth UI.
 */
export const isAuthConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

export { firebaseConfig };
