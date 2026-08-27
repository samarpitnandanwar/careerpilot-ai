// ============================================================================
// CareerPilot AI — Client-Side Auth Operations
// ============================================================================
//
// Thin wrapper around the Identity Platform / Firebase Auth SDK.
// Every function converts raw Firebase errors into friendly, user-facing
// messages. Raw errors are logged for debugging but NEVER shown to users.
// ============================================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isAuthConfigured } from "./config";

export { isAuthConfigured };

// ---------------------------------------------------------------------------
// Friendly error messages
// ---------------------------------------------------------------------------

const ERROR_MAP: Record<string, string> = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "auth/user-not-found": "No account found with that email address.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/email-already-in-use": "An account already exists with that email.",
  "auth/weak-password": "Password must be at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/popup-blocked": "Popup was blocked. Please allow popups for this site.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/invalid-credential": "Invalid credentials. Please check your email and password.",
  "auth/invalid-verification-code": "Invalid verification code.",
  "auth/credential-already-in-use": "This credential is already associated with another account.",
};

function friendlyError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : "";

  if (ERROR_MAP[code]) return ERROR_MAP[code];

  console.error("[Auth] Unhandled error:", error);
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Sign up with email / password
// ---------------------------------------------------------------------------

export interface AuthResult {
  success: boolean;
  user: User | null;
  error: string | null;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) return { success: false, user: null, error: "Authentication is not configured." };

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // Set the display name so the UI can show it immediately.
    await updateProfile(credential.user, { displayName });
    return { success: true, user: credential.user, error: null };
  } catch (error) {
    return { success: false, user: null, error: friendlyError(error) };
  }
}

// ---------------------------------------------------------------------------
// Sign in with email / password
// ---------------------------------------------------------------------------

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) return { success: false, user: null, error: "Authentication is not configured." };

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user, error: null };
  } catch (error) {
    return { success: false, user: null, error: friendlyError(error) };
  }
}

// ---------------------------------------------------------------------------
// Sign in with Google
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) return { success: false, user: null, error: "Authentication is not configured." };

  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return { success: true, user: credential.user, error: null };
  } catch (error) {
    return { success: false, user: null, error: friendlyError(error) };
  }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

// ---------------------------------------------------------------------------
// Auth state listener
// ---------------------------------------------------------------------------

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 * The callback receives the current User or null when signed out.
 */
export function onAuthStateChanged(
  callback: (user: User | null) => void,
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    // Auth not configured — immediately report no user and return no-op.
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, callback);
}

// ---------------------------------------------------------------------------
// Get current user (synchronous snapshot)
// ---------------------------------------------------------------------------

/**
 * Returns the currently authenticated User from the in-memory cache,
 * or null. This does NOT perform a network check.
 */
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser ?? null;
}

/**
 * Returns the ID token for the current user, or null if not signed in.
 * Use this to send to server-side API routes for token verification.
 */
export async function getIdToken(): Promise<string | null> {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}
