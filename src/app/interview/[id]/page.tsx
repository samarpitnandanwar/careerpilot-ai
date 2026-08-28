"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  Users,
  Target,
  AlertTriangle,
  ThumbsUp,
  Loader2,
  Calendar,
  Building2,
  Briefcase,
  BookOpen,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, Badge } from "@/components/ui";
import type {
  FirestoreInterviewPrep,
  InterviewPrepQuestion,
  FirestoreInterview,
  FirestoreJob,
  FirestoreApplication,
} from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InterviewPageData {
  interview: FirestoreInterview;
  application: FirestoreApplication;
  job: FirestoreJob;
  interviewPrep: FirestoreInterviewPrep | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getToken(): Promise<string | null> {
  try {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  } catch {
    return null;
  }
}

const difficultyConfig = {
  easy: { color: "success" as const, label: "Easy" },
  medium: { color: "warning" as const, label: "Medium" },
  hard: { color: "danger" as const, label: "Hard" },
};

const categoryLabels: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  experience: "Experience",
  project: "Project",
  system_design: "System Design",
  situational: "Situational",
  company: "Company",
  role_specific: "Role-Specific",
  hr: "HR",
  leadership: "Leadership",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not scheduled";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Question Card
// ---------------------------------------------------------------------------

function QuestionCard({ question }: { question: InterviewPrepQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const diff = difficultyConfig[question.difficulty];

  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={diff.color}>{diff.label}</Badge>
            <Badge variant="default">{categoryLabels[question.category] ?? question.category}</Badge>
          </div>
          <p className="text-sm font-medium text-slate-900">{question.question}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 mt-1"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
          {/* Why likely */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Why This Question</p>
            <p className="text-sm text-slate-700 mt-1">{question.whyLikely}</p>
          </div>

          {/* What it evaluates */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">What It Evaluates</p>
            <p className="text-sm text-slate-700 mt-1">{question.whatItEvaluates}</p>
          </div>

          {/* Answer guidance */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Answer Guidance</p>
            <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap">{question.answerGuidance}</p>
          </div>

          {/* Resume evidence */}
          {question.resumeEvidence.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Resume Evidence</p>
              <ul className="mt-1 space-y-1">
                {question.resumeEvidence.map((evidence, i) => (
                  <li key={i} className="text-sm text-green-800 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">•</span>
                    {evidence}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up questions */}
          {question.followUpQuestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Likely Follow-ups</p>
              <ul className="mt-1 space-y-1">
                {question.followUpQuestions.map((fq, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                    <span className="text-slate-400 mt-0.5">→</span>
                    {fq}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Practice area */}
          <div>
            <textarea
              placeholder="Write your answer here..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question Section
// ---------------------------------------------------------------------------

function QuestionSection({
  title,
  icon,
  questions,
}: {
  title: string;
  icon: React.ReactNode;
  questions: InterviewPrepQuestion[];
}) {
  if (questions.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={`${questions.length} question${questions.length !== 1 ? "s" : ""}`}
        action={icon}
      />
      <div className="space-y-4">
        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} />
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function InterviewPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: interviewId } = use(params);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InterviewPageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) {
          if (!cancelled) setError("Not authenticated");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Load interviews to find the one matching this ID
        const interviewsRes = await fetch("/api/interviews", { headers });
        const interviewsData = await interviewsRes.json();
        if (!interviewsData.success) {
          if (!cancelled) setError("Failed to load interviews");
          return;
        }

        const interview = (interviewsData.data as FirestoreInterview[]).find(
          (i) => i.id === interviewId,
        );
        if (!interview) {
          if (!cancelled) setError("Interview not found");
          return;
        }

        // Load the related application
        const appRes = await fetch(`/api/applications/${interview.applicationId}`, { headers });
        const appData = await appRes.json();
        if (!appData.success || !appData.data) {
          if (!cancelled) setError("Application not found");
          return;
        }
        const application = appData.data as FirestoreApplication;

        // Load the job
        const jobRes = await fetch(`/api/jobs/${application.jobId}`, { headers });
        const jobData = await jobRes.json();
        if (!jobData.success || !jobData.data) {
          if (!cancelled) setError("Job not found");
          return;
        }
        const job = jobData.data as FirestoreJob;

        // Load interview prep
        const prepRes = await fetch(`/api/applications/${interview.applicationId}/interview-prep`, { headers });
        const prepData = await prepRes.json();
        const interviewPrep = prepData.success ? prepData.data?.interviewPrep ?? null : null;

        if (!cancelled) {
          setData({ interview, application, job, interviewPrep });
        }
      } catch {
        if (!cancelled) setError("Failed to load interview data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [interviewId]);

  // Generate interview prep
  async function handleGeneratePrep() {
    if (!data) return;
    try {
      setGenerating(true);
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/applications/${data.application.id}/interview-prep`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && result.data?.interviewPrep) {
        setData((prev) => prev ? { ...prev, interviewPrep: result.data.interviewPrep } : prev);
      }
    } catch {
      // Error handled silently
    } finally {
      setGenerating(false);
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
            <h1 className="text-2xl font-bold text-slate-900">Interview Preparation</h1>
            <p className="mt-1 text-sm text-red-500">{error ?? "Failed to load data"}</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  const { interview, job, interviewPrep } = data;

  // Group questions by category
  const questionsByCategory = new Map<string, InterviewPrepQuestion[]>();
  if (interviewPrep) {
    for (const q of interviewPrep.questions) {
      const existing = questionsByCategory.get(q.category) ?? [];
      existing.push(q);
      questionsByCategory.set(q.category, existing);
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} /> Back to Applications
        </Link>

        {/* Interview overview */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Preparation</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI-generated preparation for your interview with{" "}
            <span className="font-medium text-slate-700">{job.company}</span> — {job.title}
          </p>
        </div>

        {/* Interview details */}
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4">
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Company</p>
                <p className="text-sm font-medium text-slate-900">{job.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Role</p>
                <p className="text-sm font-medium text-slate-900">{job.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Code2 size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Type</p>
                <p className="text-sm font-medium text-slate-900 capitalize">
                  {interview.interviewType.replace("_", " ")} — Round {interview.round}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Scheduled</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatDate(interview.scheduledAt)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Generate button if no prep exists */}
        {!interviewPrep && (
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen size={40} className="text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-700">No interview preparation yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-4">
                Generate personalized AI preparation based on your resume, job, and match analysis.
              </p>
              <button
                onClick={handleGeneratePrep}
                disabled={generating}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </span>
                ) : (
                  "Generate Interview Preparation"
                )}
              </button>
            </div>
          </Card>
        )}

        {/* Interview preparation content */}
        {interviewPrep && (
          <>
            {/* Overview */}
            <Card className="border-l-4 border-l-blue-400">
              <CardHeader title="Preparation Overview" />
              <p className="text-sm text-slate-700 px-4 pb-4">{interviewPrep.overview}</p>
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Confidence:</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-[200px]">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${interviewPrep.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{interviewPrep.confidence}%</span>
                </div>
              </div>
            </Card>

            {/* Strengths & Gaps */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-l-4 border-l-green-400">
                <CardHeader
                  title="Strengths to Emphasize"
                  subtitle="Highlight these during your interview"
                />
                <ul className="space-y-2 px-4 pb-4">
                  {interviewPrep.strengthsToEmphasize.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <ThumbsUp size={14} className="mt-0.5 text-green-500 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="border-l-4 border-l-yellow-400">
                <CardHeader
                  title="Gaps to Prepare"
                  subtitle="Have ready explanations for these areas"
                />
                <ul className="space-y-2 px-4 pb-4">
                  {interviewPrep.gapsToPrepare.length > 0 ? (
                    interviewPrep.gapsToPrepare.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <AlertTriangle size={14} className="mt-0.5 text-yellow-500 flex-shrink-0" />
                        {g}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-400">No significant gaps identified.</li>
                  )}
                </ul>
              </Card>
            </div>

            {/* Topics to review */}
            <Card>
              <CardHeader title="Topics to Review" subtitle="Study these before your interview" />
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {interviewPrep.topicsToReview.map((topic, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </Card>

            {/* Questions by category */}
            <QuestionSection
              title="Technical Questions"
              icon={<Code2 size={20} />}
              questions={interviewPrep.questions.filter((q) =>
                ["technical", "system_design", "project"].includes(q.category),
              )}
            />
            <QuestionSection
              title="Behavioral Questions"
              icon={<Users size={20} />}
              questions={interviewPrep.questions.filter((q) =>
                ["behavioral", "situational", "leadership"].includes(q.category),
              )}
            />
            <QuestionSection
              title="Role-Specific Questions"
              icon={<Target size={20} />}
              questions={interviewPrep.questions.filter((q) =>
                ["experience", "role_specific", "company"].includes(q.category),
              )}
            />
            <QuestionSection
              title="Other Questions"
              icon={<MessageSquare size={20} />}
              questions={interviewPrep.questions.filter((q) =>
                ["hr"].includes(q.category),
              )}
            />

            {/* Final tips */}
            <Card className="border-l-4 border-l-purple-400">
              <CardHeader title="Final Tips" subtitle="Last-minute preparation advice" />
              <ul className="space-y-2 px-4 pb-4">
                {interviewPrep.finalTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Lightbulb size={14} className="mt-0.5 text-purple-500 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Regenerate button */}
            <div className="flex justify-center">
              <button
                onClick={handleGeneratePrep}
                disabled={generating}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Regenerating...
                  </span>
                ) : (
                  "Regenerate Preparation"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
