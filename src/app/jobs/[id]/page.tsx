import type { Metadata } from "next";
import Link from "next/link";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, Badge, ScoreRing } from "@/components/ui";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { scoreColor } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Job Details",
};

// Placeholder — will be populated from Firestore + Vertex AI analysis
const job = {
  id: "1",
  title: "Senior Frontend Engineer",
  company: "Google",
  location: "Mountain View, CA (Hybrid)",
  description:
    "We are looking for a Senior Frontend Engineer to build next-generation web experiences for Google Search. You will work with React, TypeScript, and modern web technologies to create performant, accessible interfaces used by billions of users.",
  url: "https://careers.google.com",
  deadline: "2026-08-30",
  postedAt: "2026-08-25",
  salaryRange: { min: 180000, max: 280000, currency: "USD" },
  parsedData: {
    requiredSkills: ["React", "TypeScript", "GraphQL", "CSS", "Performance Optimization"],
    preferredSkills: ["Next.js", "Testing", "Web Accessibility", "Design Systems"],
    experienceRequirement: "5+ years frontend development",
    education: "Bachelor's in CS or equivalent",
    responsibilities: [
      "Build and maintain high-performance web applications",
      "Collaborate with design and product teams",
      "Mentor junior engineers",
      "Drive frontend architecture decisions",
    ],
    keywords: ["React", "TypeScript", "frontend", "web", "performance"],
    employmentType: "Full-time",
    seniorityLevel: "Senior",
  },
};

const matchAnalysis = {
  overallScore: 91,
  skillScore: 94,
  experienceScore: 85,
  educationScore: 100,
  responsibilityAlignment: 88,
  matchedSkills: ["React", "TypeScript", "GraphQL", "CSS"],
  missingSkills: ["Performance Optimization (specific experience)"],
  matchedPreferredSkills: ["Next.js", "Testing"],
  experienceGaps: [
    {
      area: "Web Accessibility",
      detail: "Preferred but not heavily evidenced in resume",
      severity: "minor" as const,
    },
    {
      area: "Design Systems",
      detail: "No direct experience with large-scale design systems",
      severity: "moderate" as const,
    },
    {
      area: "Performance Optimization",
      detail: "Listed as required but no specific evidence of large-scale optimization",
      severity: "critical" as const,
    },
  ],
  evidence: [
    { dimension: "Skill Match", score: 94, reason: "Strong alignment with core React/TypeScript/GraphQL stack" },
    { dimension: "Experience Fit", score: 85, reason: "7 years exceeds the 5-year requirement, mostly frontend roles" },
    { dimension: "Education", score: 100, reason: "BS in CS meets the requirement" },
    { dimension: "Responsibility Alignment", score: 88, reason: "Has led architecture decisions and mentored engineers" },
  ],
  recommendation: "APPLY_NOW" as const,
  summary: "Excellent match. Strong frontend skills, right experience level. Minor gaps in accessibility and design systems can be addressed.",
};

const priorityScore = {
  score: 93,
  level: "HIGH" as const,
  recommendation: "Apply within 48 hours",
  explanation:
    "91% match — HIGH PRIORITY — Strong skill alignment with 94% skill score. Deadline in 5 days. Apply immediately.",
  factors: [
    { name: "Match Quality", weight: 0.4, value: 91, impact: "Excellent overall fit" },
    { name: "Skill Alignment", weight: 0.3, value: 94, reason: "Core skills perfectly matched", impact: "Very high" },
    { name: "Deadline Urgency", weight: 0.15, value: 70, impact: "5 days remaining" },
    { name: "Company Preference", weight: 0.15, value: 95, impact: "Google is a target company" },
  ],
};

export default function JobDetailPage() {
  const daysLeft = 5;

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} /> Back to Jobs
        </Link>

        {/* Job header */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Building2 size={14} /> {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {job.location}
                </span>
                {job.salaryRange && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={14} />
                    ${(job.salaryRange.min / 1000).toFixed(0)}k – ${(job.salaryRange.max / 1000).toFixed(0)}k
                  </span>
                )}
                {daysLeft !== null && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {daysLeft} days left
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Apply Now
              </button>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <ExternalLink size={14} /> Original
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Priority score */}
        <Card className="border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-orange-500" />
            <div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-900">
                  Priority: {priorityScore.level}
                </span>
                <Badge variant="danger">{priorityScore.score}/100</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {priorityScore.explanation}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Overall match score */}
          <Card>
            <div className="flex flex-col items-center py-4">
              <ScoreRing score={matchAnalysis.overallScore} size="lg" label="Overall Match" />
              <div className="mt-4">
                <Badge
                  className={
                    matchAnalysis.recommendation === "APPLY_NOW"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }
                >
                  {matchAnalysis.recommendation.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Dimension scores */}
          <Card className="lg:col-span-2">
            <CardHeader title="Score Breakdown" subtitle="Explainable AI analysis" />
            <div className="space-y-3">
              {matchAnalysis.evidence.map((e) => (
                <div key={e.dimension}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{e.dimension}</span>
                    <span className={`font-semibold ${scoreColor(e.score)}`}>{e.score}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        e.score >= 80
                          ? "bg-green-500"
                          : e.score >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${e.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{e.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Matched skills */}
          <Card>
            <CardHeader title="Matched Skills" subtitle="Skills you have that match" />
            <div className="flex flex-wrap gap-2">
              {matchAnalysis.matchedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                >
                  <CheckCircle2 size={14} /> {skill}
                </span>
              ))}
              {matchAnalysis.matchedPreferredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                >
                  <CheckCircle2 size={14} /> {skill} <span className="text-xs opacity-70">(preferred)</span>
                </span>
              ))}
            </div>
          </Card>

          {/* Missing skills */}
          <Card>
            <CardHeader title="Missing Skills" subtitle="Skills to develop" />
            <div className="flex flex-wrap gap-2">
              {matchAnalysis.missingSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
                >
                  <XCircle size={14} /> {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* Experience gaps */}
          <Card>
            <CardHeader title="Experience Gaps" />
            <div className="space-y-3">
              {matchAnalysis.experienceGaps.map((gap) => (
                <div
                  key={gap.area}
                  className="rounded-lg border border-slate-100 p-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      size={14}
                      className={
                        gap.severity === "critical"
                          ? "text-red-500"
                          : gap.severity === "moderate"
                            ? "text-yellow-500"
                            : "text-slate-400"
                      }
                    />
                    <span className="font-medium text-slate-700">{gap.area}</span>
                    <Badge
                      variant={
                        gap.severity === "critical"
                          ? "danger"
                          : gap.severity === "moderate"
                            ? "warning"
                            : "default"
                      }
                    >
                      {gap.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{gap.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Responsibilities */}
          <Card>
            <CardHeader title="Key Responsibilities" />
            <ul className="space-y-2">
              {job.parsedData.responsibilities.map((resp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                  {resp}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Job description */}
        <Card>
          <CardHeader title="Job Description" />
          <p className="text-sm leading-7 text-slate-600">{job.description}</p>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
