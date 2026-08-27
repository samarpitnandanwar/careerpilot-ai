// ============================================================================
// CareerPilot AI — Users & Profiles Firestore Service
// ============================================================================

import { getDb, userDoc, profilesCol, now } from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreUser, FirestoreProfile, ProfileInput } from "@/types";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * Gets or creates a user document after first authenticated request.
 * If the document doesn't exist, it's created with the verified UID.
 */
export async function getOrCreateUser(
  uid: string,
  data: { email: string; displayName: string | null; photoURL: string | null },
): Promise<FirestoreUser> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const ref = userDoc(db, uid);
    const snap = await ref.get();

    if (snap.exists) {
      return snap.data() as FirestoreUser;
    }

    const nowStr = now();
    const user: FirestoreUser = {
      uid,
      email: data.email,
      displayName: data.displayName ?? "",
      photoURL: data.photoURL,
      createdAt: nowStr,
      updatedAt: nowStr,
      onboardingCompleted: false,
    };

    await ref.set(user);
    return user;
  });
}

export async function getUser(uid: string): Promise<FirestoreUser | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await userDoc(db, uid).get();
    return snap.exists ? (snap.data() as FirestoreUser) : null;
  });
}

export async function updateUser(
  uid: string,
  data: Partial<Pick<FirestoreUser, "displayName" | "photoURL" | "onboardingCompleted">>,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await userDoc(db, uid).update({ ...data, updatedAt: now() });
  });
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * The profile lives at users/{uid}/profile/{uid} — a single document per user.
 * Using the uid as the doc ID simplifies lookups.
 */
const PROFILE_DOC_ID = "current";

export async function getProfile(uid: string): Promise<FirestoreProfile | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await profilesCol(db, uid).doc(PROFILE_DOC_ID).get();
    return snap.exists ? (snap.data() as FirestoreProfile) : null;
  });
}

export async function upsertProfile(
  uid: string,
  input: ProfileInput,
): Promise<FirestoreProfile> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const ref = profilesCol(db, uid).doc(PROFILE_DOC_ID);
    const snap = await ref.get();
    const nowStr = now();

    const profile: FirestoreProfile = {
      uid,
      ...input,
      createdAt: snap.exists ? (snap.data() as FirestoreProfile).createdAt : nowStr,
      updatedAt: nowStr,
    };

    await ref.set(profile, { merge: true });
    return profile;
  });
}


