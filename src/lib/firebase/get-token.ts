// ============================================================================
// CareerPilot AI — Firebase ID Token Helper
// ============================================================================
//
// Properly waits for Firebase auth initialization before attempting to
// retrieve the ID token. This avoids the race condition where
// getAuth().currentUser is null because Firebase hasn't finished its
// initial auth state check yet.
//
// All client pages that need an authenticated API call should import
// this function instead of inlining their own getToken().
// ============================================================================

import { getAuth, onAuthStateChanged } from "firebase/auth";

/**
 * Returns a Firebase ID token for the current user, or null if signed out.
 *
 * Unlike the naive `getAuth().currentUser?.getIdToken()`, this function
 * properly waits for Firebase's initial auth state resolution before
 * checking `currentUser`. This prevents the race condition where
 * `currentUser` is temporarily null during page load.
 */
export async function getIdToken(): Promise<string | null> {
  try {
    const auth = getAuth();

    // If auth already has a user, return the token immediately.
    if (auth.currentUser) {
      return auth.currentUser.getIdToken();
    }

    // Otherwise wait for the first auth state callback (up to 5 seconds).
    const user = await new Promise<import("firebase/auth").User | null>(
      (resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            unsubscribe();
            resolve(null);
          }
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, (u) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            unsubscribe();
            resolve(u);
          }
        });
      },
    );

    return user ? user.getIdToken() : null;
  } catch {
    return null;
  }
}
