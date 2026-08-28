// ============================================================================
// CareerPilot AI — Jobs Firestore Service
// ============================================================================

import { getDb, jobsCol, newId, now } from "./db";
import { handleFirestoreError } from "@/lib/api-helpers";
import type {
  FirestoreJob,
  JobCreateInput,
  JobUpdateInput,
  FirestoreJobStatus,
} from "@/types";

export async function createJob(
  uid: string,
  input: JobCreateInput,
): Promise<FirestoreJob> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const id = newId(db, uid, "jobs");
    const nowStr = now();

    const job: FirestoreJob = {
      id,
      title: input.title,
      company: input.company,
      location: input.location,
      url: input.url,
      description: input.description,
      source: input.source,
      employmentType: input.employmentType,
      salary: input.salary,
      skills: input.skills,
      requirements: input.requirements,
      parsedData: null,
      postedAt: input.postedAt,
      deadline: input.deadline,
      savedAt: nowStr,
      status: "saved",
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await jobsCol(db, uid).doc(id).set(job);
    return job;
  });
}

export async function getJobs(
  uid: string,
  status?: FirestoreJobStatus,
): Promise<FirestoreJob[]> {
  return handleFirestoreError(async () => {
    const db = getDb();
    let query = jobsCol(db, uid).orderBy("createdAt", "desc");
    if (status) {
      query = query.where("status", "==", status) as typeof query;
    }
    const snap = await query.get();
    return snap.docs.map((doc) => doc.data() as FirestoreJob);
  });
}

export async function getJob(
  uid: string,
  jobId: string,
): Promise<FirestoreJob | null> {
  return handleFirestoreError(async () => {
    const db = getDb();
    const snap = await jobsCol(db, uid).doc(jobId).get();
    return snap.exists ? (snap.data() as FirestoreJob) : null;
  });
}

export async function updateJob(
  uid: string,
  jobId: string,
  data: JobUpdateInput,
): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await jobsCol(db, uid).doc(jobId).update({
      ...data,
      updatedAt: now(),
    });
  });
}

export async function deleteJob(uid: string, jobId: string): Promise<void> {
  return handleFirestoreError(async () => {
    const db = getDb();
    await jobsCol(db, uid).doc(jobId).delete();
  });
}
