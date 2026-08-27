import type { Metadata } from "next";
import { AppLayout } from "@/components/layout";
import { Card, CardHeader } from "@/components/ui";
import {
  BarChart3,
  Target,
  Users,
  Award,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics",
};

// Placeholder — will be computed from Firestore data
const analytics = {
  totalApplications: 12,
  applicationsByStatus: {
    saved: 2,
    applied: 3,
    screening: 2,
    interview: 3,
    offer: 1,
    rejected: 1,
    withdrawn: 0,
  },
  interviewRate: 50,
  offerRate: 8.3,
  averageMatchScore: 76,
  highestPerformingSkills: [
    { skill: "TypeScript", count: 10, averageScore: 89 },
    { skill: "React", count: 9, averageScore: 87 },
    { skill: "Next.js", count: 7, averageScore: 84 },
    { skill: "Node.js", count: 6, averageScore: 78 },
    { skill: "GraphQL", count: 5, averageScore: 82 },
  ],
  commonSkillGaps: [
    { skill: "Kubernetes", count: 4, averageScore: 45 },
    { skill: "System Design", count: 3, averageScore: 52 },
    { skill: "AWS Lambda", count: 3, averageScore: 48 },
    { skill: "Rust", count: 2, averageScore: 30 },
  ],
  monthlyActivity: [
    { month: "Apr", applications: 2, interviews: 0 },
    { month: "May", applications: 3, interviews: 1 },
    { month: "Jun", applications: 1, interviews: 1 },
    { month: "Jul", applications: 3, interviews: 2 },
    { month: "Aug", applications: 3, interviews: 2 },
  ],
};

const statusColors: Record<string, string> = {
  saved: "bg-slate-400",
  applied: "bg-blue-500",
  screening: "bg-yellow-500",
  interview: "bg-purple-500",
  offer: "bg-green-500",
  rejected: "bg-red-500",
};

export default function AnalyticsPage() {
  const maxMonthly = Math.max(
    ...analytics.monthlyActivity.map((m) => m.applications),
    1,
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Insights into your job search performance and patterns.
          </p>
        </div>

        {/* Top stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Applications", value: analytics.totalApplications, icon: <BarChart3 size={20} /> },
            { label: "Interview Rate", value: `${analytics.interviewRate}%`, icon: <Users size={20} /> },
            { label: "Offer Rate", value: `${analytics.offerRate}%`, icon: <Award size={20} /> },
            { label: "Avg Match Score", value: `${analytics.averageMatchScore}%`, icon: <Target size={20} /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Applications by status */}
          <Card>
            <CardHeader title="Applications by Status" />
            <div className="space-y-3">
              {Object.entries(analytics.applicationsByStatus).map(([status, count]) => {
                const total = analytics.totalApplications || 1;
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

          {/* Activity over time */}
          <Card>
            <CardHeader title="Activity Over Time" subtitle="Last 5 months" />
            <div className="flex items-end gap-3 h-48">
              {analytics.monthlyActivity.map((month) => (
                <div key={month.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex gap-1 items-end h-40">
                    <div
                      className="w-4 rounded-t bg-blue-500"
                      style={{
                        height: `${(month.applications / maxMonthly) * 100}%`,
                      }}
                    />
                    <div
                      className="w-4 rounded-t bg-purple-500"
                      style={{
                        height: `${(month.interviews / maxMonthly) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{month.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Applications
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" /> Interviews
              </span>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Highest-performing skills */}
          <Card>
            <CardHeader
              title="Highest-Performing Skills"
              subtitle="Skills with best match scores"
            />
            <div className="space-y-3">
              {analytics.highestPerformingSkills.map((skill) => (
                <div key={skill.skill}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{skill.skill}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{skill.count} jobs</span>
                      <span className="font-semibold text-green-600">
                        {skill.averageScore}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${skill.averageScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Common skill gaps */}
          <Card>
            <CardHeader
              title="Common Skill Gaps"
              subtitle="Most frequently missing skills"
            />
            <div className="space-y-3">
              {analytics.commonSkillGaps.map((skill) => (
                <div key={skill.skill}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{skill.skill}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{skill.count} jobs</span>
                      <span className="font-semibold text-red-500">
                        {skill.averageScore}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{ width: `${skill.averageScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
