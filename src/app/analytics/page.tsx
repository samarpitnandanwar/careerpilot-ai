"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Target,
  Users,
  Award,
  TrendingUp,
  Loader2,
  Lightbulb,
  AlertTriangle,
  Zap,
  CheckCircle,
} from "lucide-react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, StatCard, Badge, EmptyState } from "@/components/ui";
import type { AnalyticsSummary, AnalyticsRange, Insight } from "@/lib/analytics/types";

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function InsightIcon({ type }: { type: Insight["type"] }) {
  switch (type) {
    case "POSITIVE_PATTERN":
      return <CheckCircle size={16} className="text-green-500" />;
    case "WARNING":
      return <AlertTriangle size={16} className="text-amber-500" />;
    case "ACTION_REQUIRED":
      return <Zap size={16} className="text-blue-500" />;
    case "OPPORTUNITY":
      return <Lightbulb size={16} className="text-purple-500" />;
    case "TREND":
      return <TrendingUp size={16} className="text-cyan-500" />;
    case "MILESTONE":
      return <Award size={16} className="text-green-600" />;
    default:
      return null;
  }
}

const statusColors: Record<string, string> = {
  saved: "bg-slate-400",
  applied: "bg-blue-500",
  screening: "bg-yellow-500",
  assessment: "bg-orange-500",
  interview: "bg-purple-500",
  offer: "bg-green-500",
  accepted: "bg-emerald-500",
  rejected: "bg-red-500",
  withdrawn: "bg-gray-400",
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("all");

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

        const res = await fetch(`/api/analytics?range=${range}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        if (!cancelled) {
          if (json.success && json.data) {
            setData(json.data);
          } else {
            setError(json.error || "Failed to load analytics");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

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
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="mt-1 text-sm text-red-500">{error}</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!data) {
    return (
      <ProtectedLayout>
        <div className="space-y-6">
          <EmptyState icon={<BarChart3 size={48} />} title="No analytics data" description="Start tracking applications to see analytics." />
        </div>
      </ProtectedLayout>
    );
  }

  const { core, funnel, velocity, matchScoreAnalysis, priorityAnalysis, insights, trends } = data;
  const maxMonthly = Math.max(...trends.current.map((m) => m.applications), 1);

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">
              Insights into your job search performance and patterns.
            </p>
          </div>
          <div className="flex gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === opt.value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {!data.hasEnoughData && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">
              Not enough data yet for full insights. Keep applying to unlock detailed analytics.
            </p>
          </div>
        )}

        {/* Top stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Applications"
            value={core.totalApplications}
            icon={<BarChart3 size={20} />}
          />
          <StatCard
            label="Interview Rate"
            value={`${core.interviewRate}%`}
            icon={<Users size={20} />}
          />
          <StatCard
            label="Offer Rate"
            value={`${core.offerRate}%`}
            icon={<Award size={20} />}
          />
          <StatCard
            label="Response Rate"
            value={`${core.responseRate}%`}
            icon={<Target size={20} />}
          />
        </div>

        {/* Velocity */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Apps / Week</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{velocity.applicationsPerWeek}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Interviews / Month</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{velocity.interviewsPerMonth}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Offers / Month</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{velocity.offersPerMonth}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Funnel */}
          <Card>
            <CardHeader title="Application Funnel" subtitle="Conversion through pipeline stages" />
            <div className="space-y-3">
              {funnel.stages.map((stage) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{stage.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-700">{stage.count}</span>
                      <span className="text-xs text-slate-400">{stage.percentage}%</span>
                    </div>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Applications by status */}
          <Card>
            <CardHeader title="Applications by Status" />
            <div className="space-y-3">
              {Object.entries(core.applicationsByStatus).map(([status, count]) => {
                if (count === 0) return null;
                const total = core.totalApplications || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-600">{status}</span>
                      <span className="font-medium text-slate-700">{count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${statusColors[status] ?? "bg-slate-300"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Trends */}
        <Card>
          <CardHeader title="Activity Trend" subtitle={`Applications over time (${range})`} />
          {trends.current.length > 0 ? (
            <div className="flex items-end gap-3 h-48">
              {trends.current.map((point) => (
                <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex gap-1 items-end h-40">
                    <div
                      className="w-4 rounded-t bg-blue-500"
                      style={{
                        height: `${(point.applications / maxMonthly) * 100}%`,
                      }}
                    />
                    <div
                      className="w-4 rounded-t bg-purple-500"
                      style={{
                        height: `${(point.interviews / maxMonthly) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{point.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No data for this period.</p>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Match Score Analysis */}
          <Card>
            <CardHeader title="Match Score Analysis" subtitle="Outcomes by match score range" />
            <div className="space-y-3">
              {matchScoreAnalysis.map((bucket) => (
                <div key={bucket.range}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{bucket.range}%</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span>{bucket.applications} apps</span>
                      <span className="text-purple-600">{bucket.interviews} interviews</span>
                      <span className="text-green-600">{bucket.offers} offers</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Priority Analysis */}
          <Card>
            <CardHeader title="Priority Analysis" subtitle="Outcomes by priority level" />
            {priorityAnalysis.length > 0 ? (
              <div className="space-y-3">
                {priorityAnalysis.map((pa) => (
                  <div key={pa.level} className="flex items-center justify-between">
                    <Badge
                      variant={
                        pa.level === "CRITICAL" || pa.level === "HIGH"
                          ? "danger"
                          : pa.level === "MEDIUM"
                            ? "warning"
                            : "default"
                      }
                    >
                      {pa.level}
                    </Badge>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{pa.applications} apps</span>
                      <span className="text-purple-600">{pa.interviews} interviews</span>
                      <span className="text-green-600">{pa.offers} offers</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No priority data yet.</p>
            )}
          </Card>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <Card>
            <CardHeader title="Career Insights" subtitle="AI-powered observations from your data" />
            <div className="space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"
                >
                  <InsightIcon type={insight.type} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{insight.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{insight.description}</p>
                  </div>
                  {insight.actionLabel && (
                    <a
                      href={insight.actionHref ?? "#"}
                      className="text-xs font-medium text-blue-600 hover:text-blue-500 whitespace-nowrap"
                    >
                      {insight.actionLabel} →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stage Durations */}
        {data.stageDurations.some((d) => d.sampleSize > 0) && (
          <Card>
            <CardHeader title="Stage Duration" subtitle="Average days spent in each stage" />
            <div className="grid gap-4 sm:grid-cols-3">
              {data.stageDurations
                .filter((d) => d.sampleSize > 0)
                .map((d) => (
                  <div key={`${d.from}-${d.to}`} className="text-center">
                    <p className="text-xs text-slate-400">
                      {d.from} → {d.to}
                    </p>
                    <p className="text-lg font-bold text-slate-900">{d.averageDays}d</p>
                    <p className="text-xs text-slate-400">
                      {d.sampleSize} sample{d.sampleSize !== 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}

import { getIdToken } from "@/lib/firebase/get-token";
