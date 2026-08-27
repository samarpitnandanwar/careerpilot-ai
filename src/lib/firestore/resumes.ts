// ============================================================================
// CareerPilot AI — Resumes Firestore Service
// ============================================================================

import { getDb, resumesCol, newId, now } from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type { FirestoreResume, ResumeCreateInput } from "@/types";

export async function createResume(
  uid: string,
  input: ResumeCreateInput,
): Promise<FirestoreResume> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "resumes");
    const nowStr = now();

    const resume: FirestoreResume = {
      id,
      fileName: input.fileName,
      storagePath: input.storagePath,
      fileType: input.fileType,
      fileSize: input.fileSize,
      uploadedAt: nowStr,
      updatedAt: nowStr,
      status: "uploaded",
      parsedData: null,
      active: false,
    };

    await resumesCol(db, uid).doc(id).set(resume);
    return resume;
  });
}

export async function getResumes(uid: string): Promise<FirestoreResume[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await resumesCol(db, uid).orderBy("uploadedAt", "desc").get();
    return snap.docs.map((doc) => doc.data() as FirestoreResume);
  });
}

export async function getResume(
  uid: string,
  resumeId: string,
): Promise<FirestoreResume | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await resumesCol(db, uid).doc(resumeId).get();
    return snap.exists ? (snap.data() as FirestoreResume) : null;
  });
}

export async function updateResume(
  uid: string,
  resumeId: string,
  data: Partial<Pick<FirestoreResume, "status" | "parsedData" | "active" | "fileName">>,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await resumesCol(db, uid).doc(resumeId).update({
      ...data,
      updatedAt: now(),
    });
  });
}

export async function deleteResume(uid: string, resumeId: string): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await resumesCol(db, uid).doc(resumeId).delete();
  });
}

export async function setActiveResume(
  uid: string,
  resumeId: string,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const batch = db.batch();
    const resumes = await resumesCol(db, uid).get();

    for (const doc of resumes.docs) {
      batch.update(doc.ref, {
        active: doc.id === resumeId,
        updatedAt: now(),
      });
    }

    await batch.commit();
  });
}
