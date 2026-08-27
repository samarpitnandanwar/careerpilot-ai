import type { Metadata } from "next";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { Card, CardHeader, Badge, ScoreRing, StatusBadge } from "@/components/ui";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  MessageSquare,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Application Details",
};

// Placeholder — will be populated from Firestore + Vertex AI
const application = {
  id: "1",
  jobId: "1",
  status: "interview" as const,
  appliedAt: "2026-08-26T09:00:00Z",
  followUpDate: "2026-08-29",
  notes: "Had a phone screen with HR. Next step is a technical interview.",
  job: {
    title: "Senior Frontend Engineer",
    company: "Google",
    location: "Mountain View, CA (Hybrid)",
    url: "https://careers.google.com",
  },
  matchAnalysis: {
    overallScore: 91,
    skillScore: 94,
    experienceScore: 85,
    educationScore: 100,
    matchedSkills: ["React", "TypeScript", "GraphQL"],
    missingSkills: ["Performance Optimization"],
    recommendation: "APPLY_NOW",
  },
  priorityScore: {
    score: 93,
    level: "HIGH",
    explanation: "Strong match. High priority — apply immediately.",
  },
};

const statusTimeline = [
  { status: "saved", date: "2026-08-25", completed: true },
  { status: "applied", date: "2026-08-26", completed: true },
  { status: "screening", date: "2026-08-27", completed: true },
  { status: "interview", date: "2026-08-28", completed: true, current: true },
  { status: "offer", date: null, completed: false },
  { status: "rejected", date: null, completed: false },
];

export default function ApplicationDetailPage() {
  const job = application.job;
  return (
    <AppLayout>
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
                <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                <StatusBadge status={application.status} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Building2 size={14} /> {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {job.location}
                </span>
                {application.appliedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> Applied{" "}
                    {new Date(application.appliedAt).toLocaleDateString()}
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
              {job.url && (
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

        {/* Status timeline */}
        <Card>
          <CardHeader title="Application Progress" />
          <div className="flex items-center justify-between">
            {statusTimeline.map((step, i) => (
              <div key={step.status} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      step.current
                        ? "bg-blue-600 text-white"
                        : step.completed
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="mt-2 text-xs font-medium capitalize text-slate-600">
                    {step.status}
                  </span>
                  {step.date && (
                    <span className="text-[10px] text-slate-400">
                      {new Date(step.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {i < statusTimeline.length - 1 && (
                  <div className="mx-2 mt-[-20px]">
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Score */}
          <Card>
            <div className="flex flex-col items-center py-4">
              <ScoreRing score={application.matchAnalysis.overallScore} size="lg" label="Match Score" />
            </div>
          </Card>

          {/* Priority */}
          <Card>
            <CardHeader title="Priority Score" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Score</span>
                <span className="text-lg font-bold text-slate-900">
                  {application.priorityScore.score}/100
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Level</span>
                <Badge variant="danger">{application.priorityScore.level}</Badge>
              </div>
              <p className="text-xs text-slate-500">{application.priorityScore.explanation}</p>
            </div>
          </Card>

          {/* Quick info */}
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Follow-up</span>
                <span className="font-medium text-slate-700">
                  {application.followUpDate
                    ? new Date(application.followUpDate).toLocaleDateString()
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Skill Score</span>
                <span className="font-medium text-slate-700">
                  {application.matchAnalysis.skillScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Experience</span>
                <span className="font-medium text-slate-700">
                  {application.matchAnalysis.experienceScore}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Education</span>
                <span className="font-medium text-slate-700">
                  {application.matchAnalysis.educationScore}%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Matched/Missing skills */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Matched Skills" />
            <div className="flex flex-wrap gap-2">
              {application.matchAnalysis.matchedSkills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                >
                  ✓ {s}
                </span>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Missing Skills" />
            <div className="flex flex-wrap gap-2">
              {application.matchAnalysis.missingSkills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
                >
                  ✗ {s}
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Notes */}
        <Card>
          <CardHeader title="Notes" />
          <p className="text-sm text-slate-600">{application.notes}</p>
        </Card>
      </div>
    </AppLayout>
  );
}
