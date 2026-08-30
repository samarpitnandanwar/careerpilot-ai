"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  MessageSquare,
  ExternalLink,
  Loader2,
  Clock,
  Zap,
  ChevronRight,
} from "lucide-react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, Badge, ScoreRing, StatusBadge } from "@/components/ui";
import { PIPELINE_STAGES, getPipelineIndex, VALID_TRANSITIONS } from "@/lib/applications/state-machine";
import type {
  FirestoreApplication,
  FirestoreJob,
  FirestoreAnalysis,
  ApplicationActivity,
  FirestoreInterview,
  ApplicationStatus,
  NextAction,
} from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApplicationDetailData {
  application: FirestoreApplication;
  job: FirestoreJob | null;
  analysis: FirestoreAnalysis | null;
  activities: ApplicationActivity[];
  interviews: FirestoreInterview[];
  nextAction: NextAction;
}

import { getIdToken } from "@/lib/firebase/get-token";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not set";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Activity Timeline Component
// ---------------------------------------------------------------------------

function ActivityTimeline({ activities }: { activities: ApplicationActivity[] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader title="Activity Timeline" />
        <p className="text-sm text-slate-400 px-4 pb-4">No activity recorded yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Activity Timeline" subtitle={`${activities.length} events`} />
      <div className="space-y-0 px-4 pb-4">
        {activities.map((activity, i) => (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                {i === 0 ? "●" : "○"}
              </div>
              {i < activities.length - 1 && (
                <div className="w-px flex-1 bg-slate-200" />
              )}
            </div>
            {/* Content */}
            <div className="pb-6 flex-1">
              <p className="text-sm font-medium text-slate-900">{activity.message}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDate(activity.timestamp)}
                {activity.previousStatus && activity.newStatus && (
                  <span className="ml-2">
                    {activity.previousStatus} → {activity.newStatus}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status Change Modal
// ---------------------------------------------------------------------------

function StatusChangeSection({
  currentStatus,
  onStatusChange,
  changing,
}: {
  currentStatus: ApplicationStatus;
  onStatusChange: (status: ApplicationStatus, message: string) => void;
  changing: boolean;
}) {
  const [customMessage, setCustomMessage] = useState("");
  const validNext = VALID_TRANSITIONS[currentStatus] ?? [];

  if (validNext.length === 0) {
    return (
      <Card>
        <CardHeader title="Status" />
        <p className="text-sm text-slate-400 px-4 pb-4">
          This application is in a terminal state ({currentStatus}).
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Change Status" subtitle="Server-controlled transition" />
      <div className="space-y-3 px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {validNext.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status, customMessage)}
              disabled={changing}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {changing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                `→ ${status.charAt(0).toUpperCase() + status.slice(1)}`
              )}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Optional message for this status change..."
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Note Input Component
// ---------------------------------------------------------------------------

function NoteInput({ onAdd }: { onAdd: (note: string) => void }) {
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleSubmit() {
    if (!note.trim()) return;
    setAdding(true);
    await onAdd(note.trim());
    setNote("");
    setAdding(false);
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Add a note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <button
        onClick={handleSubmit}
        disabled={adding || !note.trim()}
        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {adding ? <Loader2 size={14} className="animate-spin" /> : "Add"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: applicationId } = use(params);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApplicationDetailData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const token = await getIdToken();
        if (!token) {
          if (!cancelled) setError("Not authenticated");
          return;
        }

        const res = await fetch(`/api/applications/${applicationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        if (!cancelled && result.success && result.data) {
          setData(result.data);
        } else if (!cancelled) {
          setError(result.error ?? "Failed to load application");
        }
      } catch {
        if (!cancelled) setError("Failed to load application");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [applicationId]);

  async function handleStatusChange(newStatus: ApplicationStatus, message: string) {
    try {
      setChanging(true);
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus, message }),
      });

      const result = await res.json();
      if (result.success) {
        // Reload the page data
        const detailRes = await fetch(`/api/applications/${applicationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const detailResult = await detailRes.json();
        if (detailResult.success) {
          setData(detailResult.data);
        }
      }
    } catch {
      // Error handled silently
    } finally {
      setChanging(false);
    }
  }

  async function handleAddNote(note: string) {
    try {
      const token = await getIdToken();
      if (!token) return;

      await fetch(`/api/applications/${applicationId}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note }),
      });

      // Reload to get updated notes and activities
      const detailRes = await fetch(`/api/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailResult = await detailRes.json();
      if (detailResult.success) {
        setData(detailResult.data);
      }
    } catch {
      // Error handled silently
    }
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !data) {
    return (
      <ProtectedLayout>
        <div className="space-y-6">
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={16} /> Back to Applications
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Application Details</h1>
            <p className="mt-1 text-sm text-red-500">{error ?? "Failed to load data"}</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  const { application, job, analysis, activities, interviews, nextAction } = data;

  // Build pipeline display
  const currentIdx = getPipelineIndex(application.status);

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} /> Back to Applications
        </Link>

        {/* Header */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{application.jobTitle}</h1>
                <StatusBadge status={application.status} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Building2 size={14} /> {application.company}
                </span>
                {job?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {job.location}
                  </span>
                )}
                {application.appliedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> Applied {formatDate(application.appliedAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/interview/${application.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                <MessageSquare size={16} /> Interview Prep
              </Link>
              {job?.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <ExternalLink size={14} /> Job Posting
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Pipeline progress */}
        <Card>
          <CardHeader title="Application Progress" />
          <div className="flex items-center justify-between px-4 pb-4 overflow-x-auto">
            {PIPELINE_STAGES.map((stage, i) => {
              const isCompleted = currentIdx >= 0 && i < currentIdx;
              const isCurrent = stage === application.status;

              return (
                <div key={stage} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? "bg-blue-600 text-white"
                          : isCompleted
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isCompleted ? "✓" : i + 1}
                    </div>
                    <span className="mt-2 text-xs font-medium capitalize text-slate-600">
                      {stage}
                    </span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className="mx-2 mt-[-20px]">
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Status change actions */}
        <StatusChangeSection
          currentStatus={application.status}
          onStatusChange={handleStatusChange}
          changing={changing}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Match score */}
          {analysis && (
            <Card>
              <div className="flex flex-col items-center py-4">
                <ScoreRing score={analysis.overallScore} size="lg" label="Match Score" />
              </div>
            </Card>
          )}

          {/* Next action */}
          <Card>
            <CardHeader title="Next Action" />
            <div className="space-y-3 px-4 pb-4">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-slate-900">{nextAction.label}</span>
              </div>
              <p className="text-sm text-slate-600">{nextAction.description}</p>
              {nextAction.date && (
                <p className="text-xs text-slate-400">
                  <Clock size={12} className="inline mr-1" />
                  {formatDate(nextAction.date)}
                </p>
              )}
            </div>
          </Card>

          {/* Quick info */}
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-3 text-sm px-4 pb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Deadline</span>
                <span className="font-medium text-slate-700">
                  {formatDate(application.deadline)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Follow-up</span>
                <span className="font-medium text-slate-700">
                  {formatDate(application.followUpDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="font-medium text-slate-700">{application.source}</span>
              </div>
              {analysis && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Skill Score</span>
                    <span className="font-medium text-slate-700">{analysis.skillScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Experience</span>
                    <span className="font-medium text-slate-700">{analysis.experienceScore}%</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Matched/Missing skills */}
        {analysis && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Matched Skills" />
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {analysis.matchedSkills.length > 0 ? (
                  analysis.matchedSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                    >
                      ✓ {s}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No matched skills yet.</p>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Missing Skills" />
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {analysis.missingSkills.length > 0 ? (
                  analysis.missingSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
                    >
                      ✗ {s}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No missing skills identified.</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Interviews */}
        {interviews.length > 0 && (
          <Card>
            <CardHeader
              title="Interviews"
              subtitle={`${interviews.length} scheduled`}
            />
            <div className="space-y-3 px-4 pb-4">
              {interviews.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/interview/${interview.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 capitalize">
                      {interview.interviewType.replace("_", " ")} — Round {interview.round}
                    </p>
                    {interview.scheduledAt && (
                      <p className="text-xs text-slate-400">
                        {formatDate(interview.scheduledAt)}
                      </p>
                    )}
                  </div>
                  <Badge variant="default">{interview.status}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader title="Notes" />
          <div className="space-y-3 px-4 pb-4">
            {application.notes ? (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{application.notes}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No notes yet.</p>
            )}
            <NoteInput onAdd={handleAddNote} />
          </div>
        </Card>

        {/* Activity timeline */}
        <ActivityTimeline activities={activities} />
      </div>
    </ProtectedLayout>
  );
}
