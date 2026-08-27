import type { Metadata } from "next";
import {
  Briefcase,
  Users,
  Award,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import Link from "next/link";
import { Card, CardHeader, StatCard, Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Placeholder data — will be replaced with real Firestore + AI data
const stats = [
  { label: "Applications", value: 12, icon: <Briefcase size={20} />, trend: { value: 20, isPositive: true } },
  { label: "Interviews", value: 3, icon: <Users size={20} />, trend: { value: 50, isPositive: true } },
  { label: "Offers", value: 1, icon: <Award size={20} /> },
  { label: "Avg Match Score", value: "76%", icon: <Target size={20} /> },
];

const upcomingDeadlines = [
  { id: "1", title: "Senior Frontend Engineer", company: "Google", deadline: "2026-08-30", daysLeft: 3 },
  { id: "2", title: "Full Stack Developer", company: "Stripe", deadline: "2026-09-01", daysLeft: 5 },
  { id: "3", title: "Software Engineer II", company: "Microsoft", deadline: "2026-09-05", daysLeft: 9 },
];

const highPriorityJobs = [
  { id: "1", title: "Senior Frontend Engineer", company: "Google", matchScore: 91, priority: "HIGH" as const },
  { id: "2", title: "Staff Engineer", company: "Vercel", matchScore: 87, priority: "HIGH" as const },
  { id: "3", title: "Lead Software Engineer", company: "Atlassian", matchScore: 78, priority: "MEDIUM" as const },
];

const skillGaps = [
  { skill: "Kubernetes", severity: "critical" as const },
  { skill: "System Design", severity: "minor" as const },
  { skill: "AWS Lambda", severity: "moderate" as const },
];

const recentActivity = [
  { id: "1", type: "application" as const, title: "Applied to Senior Frontend Engineer at Google", time: "2 hours ago" },
  { id: "2", type: "job" as const, title: "Added Staff Engineer at Vercel", time: "5 hours ago" },
  { id: "3", type: "resume" as const, title: "Resume analyzed successfully", time: "1 day ago" },
  { id: "4", type: "application" as const, title: "Moved to Interview stage at Meta", time: "2 days ago" },
];

export default function DashboardPage() {
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
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              trend={stat.trend}
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* High-priority jobs */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="High-Priority Jobs"
              subtitle="AI-ranked opportunities you should focus on"
              action={
                <Link href="/jobs" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View all →
                </Link>
              }
            />
            <div className="space-y-3">
              {highPriorityJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{job.title}</p>
                    <p className="text-sm text-slate-500">{job.company}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-600">
                      {job.matchScore}% match
                    </span>
                    <Badge
                      variant={
                        job.priority === "HIGH"
                          ? "danger"
                          : job.priority === "MEDIUM"
                            ? "warning"
                            : "default"
                      }
                    >
                      {job.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming deadlines */}
          <Card>
            <CardHeader
              title="Upcoming Deadlines"
              subtitle="Don't miss these"
            />
            <div className="space-y-3">
              {upcomingDeadlines.map((dl) => (
                <div
                  key={dl.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{dl.title}</p>
                    <p className="text-xs text-slate-500">{dl.company}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock size={14} className="text-slate-400" />
                    <span
                      className={
                        dl.daysLeft <= 3
                          ? "font-semibold text-red-600"
                          : "text-slate-600"
                      }
                    >
                      {dl.daysLeft}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Skill gaps */}
          <Card>
            <CardHeader
              title="Skill Gaps"
              subtitle="Skills to develop"
            />
            <div className="space-y-2">
              {skillGaps.map((gap) => (
                <div
                  key={gap.skill}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {gap.skill}
                  </span>
                  <div className="flex items-center gap-1.5">
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
                    <span className="text-xs capitalize text-slate-500">
                      {gap.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent activity */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Recent Activity"
              subtitle="Your latest actions"
              action={
                <Link href="/applications" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  View all →
                </Link>
              }
            />
            <div className="space-y-3">
              {recentActivity.map((item) => {
                const icons = {
                  application: <Briefcase size={16} className="text-blue-500" />,
                  job: <TrendingUp size={16} className="text-green-500" />,
                  resume: <Activity size={16} className="text-purple-500" />,
                  interview: <Users size={16} className="text-orange-500" />,
                };
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="mt-0.5">{icons[item.type]}</div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
