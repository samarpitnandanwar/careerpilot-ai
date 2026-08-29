// ============================================================================
// CareerPilot AI — Notification Preferences Service
// ============================================================================
//
// Minimal preference model: notificationsEnabled (boolean).
// Stored at users/{uid}/system/notificationPreferences.
// Default: true (notifications enabled).
// ============================================================================

import { getDb, now } from "@/lib/firestore/db";
import { handleFirestoreError } from "@/lib/api-helpers";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Preference Model
// ---------------------------------------------------------------------------

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

export const NotificationPreferencesUpdateSchema = z
  .object({
    notificationsEnabled: z.boolean(),
  })
  .strict();

export type NotificationPreferencesUpdate = z.infer<typeof NotificationPreferencesUpdateSchema>;

// ---------------------------------------------------------------------------
// Firestore path
// ---------------------------------------------------------------------------

function preferencesDoc(uid: string) {
  return getDb()
    .collection("users")
    .doc(uid)
    .collection("system")
    .doc("notificationPreferences");
}

// ---------------------------------------------------------------------------
// Get preferences (returns default if not set)
// ---------------------------------------------------------------------------

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notificationsEnabled: true,
  createdAt: "",
  updatedAt: "",
};

export async function getNotificationPreferences(
  uid: string,
): Promise<NotificationPreferences> {
  return handleFirestoreError(async () => {
    const snap = await preferencesDoc(uid).get();
    if (!snap.exists) {
      return DEFAULT_PREFERENCES;
    }
    return snap.data() as NotificationPreferences;
  });
}

// ---------------------------------------------------------------------------
// Check if notifications are enabled
// ---------------------------------------------------------------------------

export async function areNotificationsEnabled(uid: string): Promise<boolean> {
  const prefs = await getNotificationPreferences(uid);
  return prefs.notificationsEnabled;
}

// ---------------------------------------------------------------------------
// Update preferences
// ---------------------------------------------------------------------------

export async function updateNotificationPreferences(
  uid: string,
  data: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
  return handleFirestoreError(async () => {
    const nowStr = now();
    const snap = await preferencesDoc(uid).get();
    const existing = snap.exists ? (snap.data() as NotificationPreferences) : null;

    const preferences: NotificationPreferences = {
      notificationsEnabled: data.notificationsEnabled,
      createdAt: existing?.createdAt ?? nowStr,
      updatedAt: nowStr,
    };

    await preferencesDoc(uid).set(preferences);
    return preferences;
  });
}
