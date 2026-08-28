"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, Badge, ScoreRing } from "@/components/ui";
import {
  ArrowLeft,
  MapPin,
  Building2,
  DollarSign,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { scoreColor } from "@/lib/utils";
import type { FirestoreJob, FirestoreJobAnalysis } from "@/types";

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<FirestoreJob | null>(null);
  const [analysis, setAnalysis] = useState<FirestoreJobAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) {
          if (!cancelled) setError("Not authenticated");
          return;
        }

        const res = await fetch(`/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) {
          if (!data.success) {
            setError(data.error || "Failed to load job");
            return;
          }
          setJob(data.data);
        }

        const analysisRes = await fetch(`/api/jobs/${jobId}/match`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const analysisData = await analysisRes.json();
        if (!cancelled && analysisData.success && analysisData.data?.analysis) {
          setAnalysis(analysisData.data.analysis);
        }
      } catch {
        if (!cancelled) setError("Failed to load job details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [jobId]);

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setAnalysisError(null);
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`/api/jobs/${jobId}/match`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!data.success) {
        setAnalysisError(data.error || "Analysis failed");
        return;
      }
      setAnalysis(data.data.analysis);
    } catch {
      setAnalysisError("Failed to run analysis. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !job) {
    return (
      <ProtectedLayout>
        <div className="space-y-4">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={16} /> Back to Jobs
          </Link>
          <Card className="py-12 text-center">
            <p className="text-slate-500">{error || "Job not found"}</p>
          </Card>
        </div>
      </ProtectedLayout>
    );
  }

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
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {job.location}
                  </span>
                )}
                {job.salary && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={14} /> {job.salary}
                  </span>
                )}
                {job.parsedData?.seniorityLevel && (
                  <Badge>{job.parsedData.seniorityLevel}</Badge>
                )}
                {job.parsedData?.employmentType && (
                  <Badge>{job.parsedData.employmentType}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
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

        {/* Analyze / Re-analyze button */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Match Analysis</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Compare your resume against this job with AI-powered matching
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyzing...
                </>
              ) : analysis ? (
                <>
                  <RefreshCw size={16} />
                  Re-analyze
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Analyze Match
                </>
              )}
            </button>
          </div>
          {analysisError && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {analysisError}
            </p>
          )}
        </Card>

        {/* Analysis results */}
        {analysis && (
          <>
            {/* Recommendation banner */}
            <Card
              className={`border-l-4 ${
                analysis.overallScore >= 75
                  ? "border-l-green-500"
                  : analysis.overallScore >= 50
                    ? "border-l-yellow-500"
                    : "border-l-red-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles
                  size={20}
                  className={
                    analysis.overallScore >= 75
                      ? "text-green-500"
                      : analysis.overallScore >= 50
                        ? "text-yellow-500"
                        : "text-red-500"
                  }
                />
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-900">
                      {analysis.overallScore}% Match
                    </span>
                    <Badge
                      className={
                        analysis.overallScore >= 75
                          ? "bg-green-100 text-green-700"
                          : analysis.overallScore >= 50
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }
                    >
                      {analysis.recommendation.replace(/_/g, " ")}
                    </Badge>
                    {analysis.confidence && (
                      <span className="text-xs text-slate-400">
                        Confidence: {analysis.confidence}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{analysis.summary}</p>
                </div>
              </div>
            </Card>

            {/* Score breakdown */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <div className="flex flex-col items-center py-4">
                  <ScoreRing score={analysis.overallScore} size="lg" label="Overall Match" />
                  <div className="mt-4">
                    <Badge
                      className={
                        analysis.recommendation === "APPLY_NOW"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }
                    >
                      {analysis.recommendation.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader title="Score Breakdown" subtitle="Explainable AI analysis" />
                <div className="space-y-3">
                  {analysis.evidence.map((e) => (
                    <div key={e.dimension}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{e.dimension}</span>
                        <span className={`font-semibold ${scoreColor(e.score)}`}>
                          {e.score}%
                        </span>
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

            {/* Skills & gaps */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Matched skills */}
              <Card>
                <CardHeader title="Matched Skills" subtitle="Skills you have that match" />
                <div className="flex flex-wrap gap-2">
                  {analysis.matchedSkills.length === 0 && (
                    <p className="text-sm text-slate-400">No matched skills found</p>
                  )}
                  {analysis.matchedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                    >
                      <CheckCircle2 size={14} /> {skill}
                    </span>
                  ))}
                  {analysis.matchedPreferredSkills?.map((skill) => (
                    <span
                      key={`pref-${skill}`}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                    >
                      <CheckCircle2 size={14} /> {skill}{" "}
                      <span className="text-xs opacity-70">(preferred)</span>
                    </span>
                  ))}
                </div>
              </Card>

              {/* Missing skills */}
              <Card>
                <CardHeader title="Missing Skills" subtitle="Skills to develop" />
                <div className="flex flex-wrap gap-2">
                  {analysis.missingSkills.length === 0 && (
                    <p className="text-sm text-slate-400">No missing skills — great match!</p>
                  )}
                  {analysis.missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
                    >
                      <XCircle size={14} /> {skill}
                    </span>
                  ))}
                </div>
              </Card>

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <Card>
                  <CardHeader
                    title="Strengths"
                    subtitle="Why you are a good match"
                  />
                  <ul className="space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Gaps */}
              {analysis.gaps && analysis.gaps.length > 0 && (
                <Card>
                  <CardHeader title="Potential Gaps" subtitle="Areas for development" />
                  <ul className="space-y-2">
                    {analysis.gaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-yellow-500" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Experience gaps */}
              {analysis.experienceGaps && analysis.experienceGaps.length > 0 && (
                <Card>
                  <CardHeader title="Experience Gaps" />
                  <div className="space-y-3">
                    {analysis.experienceGaps.map((gap) => (
                      <div key={gap.area} className="rounded-lg border border-slate-100 p-3">
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
              )}

              {/* Key responsibilities */}
              {job.parsedData?.responsibilities && job.parsedData.responsibilities.length > 0 && (
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
              )}
            </div>

            {/* Skill evidence detail */}
            {analysis.skillEvidence && analysis.skillEvidence.length > 0 && (
              <Card>
                <CardHeader title="Skill Evidence Detail" subtitle="Detailed skill-by-skill analysis" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase text-slate-500">
                        <th className="pb-2 pr-4">Skill</th>
                        <th className="pb-2 pr-4">Resume Evidence</th>
                        <th className="pb-2 pr-4">Job Requirement</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.skillEvidence.map((ev) => (
                        <tr key={ev.skill} className="border-b border-slate-50">
                          <td className="py-2 pr-4 font-medium text-slate-700">{ev.skill}</td>
                          <td className="py-2 pr-4 text-slate-500">{ev.resumeEvidence}</td>
                          <td className="py-2 pr-4 text-slate-500">{ev.jobRequirement}</td>
                          <td className="py-2">
                            <Badge
                              className={
                                ev.match === "strong"
                                  ? "bg-green-100 text-green-700"
                                  : ev.match === "partial"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }
                            >
                              {ev.match}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Job description */}
        {job.description && (
          <Card>
            <CardHeader title="Job Description" />
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {job.description}
            </p>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}

// ---------------------------------------------------------------------------
// Helper — get Firebase ID token from the current user
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
