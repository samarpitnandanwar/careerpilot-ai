"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Award,
  Target,
  Loader2,
} from "lucide-react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, StatCard, Badge } from "@/components/ui";
import type { FirestoreJobPriority } from "@/types";
import { getDaysUntilDeadline, isDeadlineExpired } from "@/lib/priority/scorer";

interface DashboardJob {
  jobId: string;
  title: string;
  company: string;
  deadline: string | null;
  priority: FirestoreJobPriority;
}

function formatDeadline(deadline: string | null): { text: string; color: string } {
  if (!deadline) {
    return { text: "Not specified", color: "text-slate-400" };
  }
  if (isDeadlineExpired(deadline)) {
    return { text: "Expired", color: "text-red-500" };
  }
  const days = getDaysUntilDeadline(deadline);
  if (days === null) {
    return { text: "Invalid date", color: "text-slate-400" };
  }
  if (days === 0) return { text: "Today", color: "text-red-600 font-semibold" };
  if (days === 1) return { text: "Tomorrow", color: "text-red-500 font-medium" };
  if (days <= 7) return { text: `${days} days`, color: "text-amber-600" };
  if (days <= 30) return { text: `${days} days`, color: "text-slate-600" };
  return { text: `${days} days`, color: "text-slate-400" };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    offers: 0,
    avgMatch: 0,
  });
  const [priorityJobs, setPriorityJobs] = useState<DashboardJob[]>([]);

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

        // Load priority data (includes job details now)
        const priorityRes = await fetch("/api/priority", { headers });
        const priorityData = await priorityRes.json();

        if (!cancelled && priorityData.success && priorityData.data) {
          const priorities = priorityData.data.priorities as {
            jobId: string;
            title: string;
            company: string;
            deadline: string | null;
            priority: FirestoreJobPriority;
          }[];

          // Use job details directly from the priority API response
          const topJobs: DashboardJob[] = priorities.slice(0, 5).map((p) => ({
            jobId: p.jobId,
            title: p.title,
            company: p.company,
            deadline: p.deadline,
            priority: p.priority,
          }));

          if (!cancelled) setPriorityJobs(topJobs);
        }

        // Load applications for stats
        const appsRes = await fetch("/api/applications", { headers });
        const appsData = await appsRes.json();
        if (!cancelled && appsData.success && appsData.data) {
          const apps = appsData.data;
          const interviewCount = apps.filter(
            (a: { status: string }) => a.status === "interview",
          ).length;
          const offerCount = apps.filter(
            (a: { status: string }) => a.status === "offer",
          ).length;
          setStats({
            applications: apps.length,
            interviews: interviewCount,
            offers: offerCount,
            avgMatch: 0,
          });
        }
      } catch {
        if (!cancelled) setError("Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      </ProtectedLayout>
    );
  }

  if (error) {
    return (
      <ProtectedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-red-500">{error}</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your career command center. Track applications and discover top opportunities.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Applications"
            value={stats.applications}
            icon={<Briefcase size={20} />}
          />
          <StatCard
            label="Interviews"
            value={stats.interviews}
            icon={<Users size={20} />}
          />
          <StatCard
            label="Offers"
            value={stats.offers}
            icon={<Award size={20} />}
          />
          <StatCard
            label="Avg Match Score"
            value={stats.avgMatch > 0 ? `${stats.avgMatch}%` : "—"}
            icon={<Target size={20} />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* High-priority jobs — real data */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Priority Jobs"
              subtitle="AI-ranked opportunities you should focus on"
              action={
                <Link href="/jobs" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View all →
                </Link>
              }
            />
            <div className="space-y-3">
              {priorityJobs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400">
                    No jobs with priority scores yet. Add jobs and run match analysis to see rankings.
                  </p>
                </div>
              ) : (
                priorityJobs.map((job) => {
                  const deadline = formatDeadline(job.deadline);
                  return (
                    <Link key={job.jobId} href={`/jobs/${job.jobId}`}>
                      <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 cursor-pointer">
                        <div>
                          <p className="font-medium text-slate-900">{job.title}</p>
                          <p className="text-sm text-slate-500">{job.company}</p>
                          <p className={`text-xs mt-0.5 ${deadline.color}`}>
                            Deadline: {deadline.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-sm font-semibold text-blue-600">
                              {job.priority.score} priority
                            </span>
                          </div>
                          <Badge
                            variant={
                              job.priority.level === "CRITICAL"
                                ? "danger"
                                : job.priority.level === "HIGH"
                                  ? "danger"
                                  : job.priority.level === "MEDIUM"
                                    ? "warning"
                                    : "default"
                            }
                          >
                            {job.priority.level}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          {/* Skill gaps — placeholder until analytics */}
          <Card>
            <CardHeader title="Skill Gaps" subtitle="Skills to develop" />
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">
                Skill gap analysis will appear here after running multiple match analyses.
              </p>
            </div>
          </Card>
        </div>

        {/* Action Center */}
        <Card>
          <CardHeader
            title="Action Center"
            subtitle="Things that need your attention"
            action={
              <Link href="/actions" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                View all →
              </Link>
            }
          />
          <DashboardActions />
        </Card>

        {/* Quick analytics */}
        <Card>
          <CardHeader
            title="Quick Insights"
            subtitle="Key metrics from your job search"
            action={
              <Link href="/analytics" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Full Analytics →
              </Link>
            }
          />
          <AnalyticsQuickInsights />
        </Card>
      </div>
    </ProtectedLayout>
  );
}

// ---------------------------------------------------------------------------
// Helper — get Firebase ID token
// ---------------------------------------------------------------------------

function DashboardActions() {
  const [actions, setActions] = useState<{
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
    actionUrl: string;
  }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/actions?status=OPEN&limit=5", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setActions(json.data);
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (actions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-400">
          No pending actions. You&apos;re all caught up!
        </p>
      </div>
    );
  }

  const priorityColors: Record<string, string> = {
    CRITICAL: "border-l-red-500",
    HIGH: "border-l-orange-500",
    MEDIUM: "border-l-yellow-500",
    LOW: "border-l-slate-300",
  };

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <Link key={action.id} href={action.actionUrl}>
          <div
            className={`flex items-center justify-between rounded-lg border border-slate-100 border-l-4 p-3 transition-colors hover:bg-slate-50 cursor-pointer ${priorityColors[action.priority] ?? "border-l-slate-300"}`}
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900 truncate">{action.title}</p>
              <p className="text-xs text-slate-500 truncate">{action.description}</p>
            </div>
            <Badge
              variant={
                action.priority === "CRITICAL"
                  ? "danger"
                  : action.priority === "HIGH"
                    ? "warning"
                    : "default"
              }
            >
              {action.priority}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}

function AnalyticsQuickInsights() {
  const [data, setData] = useState<{
    responseRate: number;
    interviewRate: number;
    offerRate: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/analytics?range=all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setData({
            responseRate: json.data.core.responseRate,
            interviewRate: json.data.core.interviewRate,
            offerRate: json.data.core.offerRate,
          });
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (!data) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-400">
          Analytics will appear here once you have application data.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-slate-900">{data.responseRate}%</p>
        <p className="text-xs text-slate-500">Response Rate</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-slate-900">{data.interviewRate}%</p>
        <p className="text-xs text-slate-500">Interview Rate</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-slate-900">{data.offerRate}%</p>
        <p className="text-xs text-slate-500">Offer Rate</p>
      </div>
    </div>
  );
}

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
