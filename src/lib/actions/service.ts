// ============================================================================
// CareerPilot AI — Actions Firestore Service
// ============================================================================

import { getDb, newId, now } from "@/lib/firestore/db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreAction, ActionStatus } from "./types";

// ---------------------------------------------------------------------------
// Collection reference
// ---------------------------------------------------------------------------

function actionsCol(uid: string) {
  return getDb().collection("users").doc(uid).collection("actions");
}

// ---------------------------------------------------------------------------
// Create action (idempotent)
// ---------------------------------------------------------------------------

/**
 * Create an action if one with the same actionKey doesn't already exist.
 * Returns the existing action if duplicate, or the new action.
 */
export async function createAction(
  uid: string,
  data: Omit<FirestoreAction, "id" | "createdAt" | "completedAt" | "dismissedAt" | "status"> & {
    status?: ActionStatus;
  },
): Promise<FirestoreAction> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const nowStr = now();

    // Check for duplicate actionKey (idempotency)
    const existing = await actionsCol(uid)
      .where("actionKey", "==", data.actionKey)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Return existing action — no duplicate created
      return existing.docs[0].data() as FirestoreAction;
    }

    const id = newId(db, uid, "actions");

    const action: FirestoreAction = {
      id,
      ...data,
      status: data.status ?? "OPEN",
      createdAt: nowStr,
      completedAt: null,
      dismissedAt: null,
    };

    // Validate before storing
    const validated = validateAction(action);
    if (!validated) {
      throw new Error("Invalid action data");
    }

    await actionsCol(uid).doc(id).set(action);
    return action;
  });
}

// ---------------------------------------------------------------------------
// Get actions
// ---------------------------------------------------------------------------

export async function getActions(
  uid: string,
  options: {
    status?: ActionStatus;
    limit?: number;
    orderBy?: "priority" | "dueAt" | "createdAt";
  } = {},
): Promise<FirestoreAction[]> {
  return handleFirestoreError(async () => {
    const sortField = options.orderBy ?? "createdAt";
    const sortDesc = sortField !== "priority";
    let actions: FirestoreAction[] = [];

    // Try the compound query with orderBy (requires composite index)
    try {
      let query: FirebaseFirestore.Query = actionsCol(uid);
      if (options.status) {
        query = query.where("status", "==", options.status);
      }
      query = query.orderBy(sortField, sortDesc ? "desc" : "asc");
      if (options.limit) {
        query = query.limit(options.limit);
      }
      const snap = await query.get();
      actions = snap.docs.map((doc) => doc.data() as FirestoreAction);
    } catch (queryError) {
      // Compound index may not be ready yet — fall back to simpler query
      console.error("[Actions] Compound query failed, falling back:", queryError);
      let fallbackQuery: FirebaseFirestore.Query = actionsCol(uid);
      if (options.status) {
        fallbackQuery = fallbackQuery.where("status", "==", options.status);
      }
      // Use __name__ ordering which always works
      fallbackQuery = fallbackQuery.orderBy("__name__", "desc");
      if (options.limit) {
        fallbackQuery = fallbackQuery.limit(options.limit);
      }
      const snap = await fallbackQuery.get();
      actions = snap.docs.map((doc) => doc.data() as FirestoreAction);
    }

    // If ordering by priority, sort client-side with custom priority order
    if (sortField === "priority") {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      actions.sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 4;
        const pb = priorityOrder[b.priority] ?? 4;
        if (pa !== pb) return pa - pb;
        // Secondary sort by createdAt desc
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return actions;
  });
}

export async function getOpenActions(uid: string): Promise<FirestoreAction[]> {
  return getActions(uid, { status: "OPEN", orderBy: "priority" });
}

export async function getAction(
  uid: string,
  actionId: string,
): Promise<FirestoreAction | null> {
  return handleFirestoreError(async () => {
    const snap = await actionsCol(uid).doc(actionId).get();
    return snap.exists ? (snap.data() as FirestoreAction) : null;
  });
}

// ---------------------------------------------------------------------------
// Complete action
// ---------------------------------------------------------------------------

export async function completeAction(
  uid: string,
  actionId: string,
): Promise<FirestoreAction | null> {
  return handleFirestoreError(async () => {
    const snap = await actionsCol(uid).doc(actionId).get();
    if (!snap.exists) return null;

    const action = snap.data() as FirestoreAction;
    if (action.status !== "OPEN") return action;

    const nowStr = now();
    await actionsCol(uid).doc(actionId).update({
      status: "COMPLETED",
      completedAt: nowStr,
    });

    return { ...action, status: "COMPLETED", completedAt: nowStr };
  });
}

// ---------------------------------------------------------------------------
// Dismiss action
// ---------------------------------------------------------------------------

export async function dismissAction(
  uid: string,
  actionId: string,
): Promise<FirestoreAction | null> {
  return handleFirestoreError(async () => {
    const snap = await actionsCol(uid).doc(actionId).get();
    if (!snap.exists) return null;

    const action = snap.data() as FirestoreAction;
    if (action.status !== "OPEN") return action;

    const nowStr = now();
    await actionsCol(uid).doc(actionId).update({
      status: "DISMISSED",
      dismissedAt: nowStr,
    });

    return { ...action, status: "DISMISSED", dismissedAt: nowStr };
  });
}

// ---------------------------------------------------------------------------
// Reopen action
// ---------------------------------------------------------------------------

export async function reopenAction(
  uid: string,
  actionId: string,
): Promise<FirestoreAction | null> {
  return handleFirestoreError(async () => {
    const snap = await actionsCol(uid).doc(actionId).get();
    if (!snap.exists) return null;

    const action = snap.data() as FirestoreAction;
    if (action.status === "OPEN") return action;

    await actionsCol(uid).doc(actionId).update({
      status: "OPEN",
      completedAt: null,
      dismissedAt: null,
    });

    return { ...action, status: "OPEN", completedAt: null, dismissedAt: null };
  });
}

// ---------------------------------------------------------------------------
// Expire actions
// ---------------------------------------------------------------------------

export async function expireActions(uid: string): Promise<number> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const nowStr = now();

    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await actionsCol(uid)
        .where("status", "==", "OPEN")
        .where("expiresAt", "<=", nowStr)
        .get();
    } catch (queryError) {
      // Compound index may not be ready — fall back to status-only query
      console.error("[Actions] Expire query failed, falling back:", queryError);
      snap = await actionsCol(uid)
        .where("status", "==", "OPEN")
        .get();
      // Client-side filter by expiresAt
      const filtered = snap.docs.filter((doc) => {
        const data = doc.data();
        return data.expiresAt && data.expiresAt <= nowStr;
      });
      if (filtered.length === 0) return 0;

      const batch = db.batch();
      for (const doc of filtered) {
        batch.update(doc.ref, { status: "EXPIRED" });
      }
      await batch.commit();
      return filtered.length;
    }

    if (snap.empty) return 0;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { status: "EXPIRED" });
    }
    await batch.commit();

    return snap.docs.length;
  });
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

function validateAction(action: FirestoreAction): boolean {
  return !!(
    action.id &&
    action.type &&
    action.priority &&
    action.title &&
    action.description &&
    action.actionUrl &&
    action.actionKey
  );
}
