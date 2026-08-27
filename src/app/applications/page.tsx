import type { Metadata } from "next";
import Link from "next/link";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, StatusBadge, ScoreRing } from "@/components/ui";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import type { ApplicationStatus } from "@/types";

export const metadata: Metadata = {
  title: "Applications",
};

// Placeholder — will be populated from Firestore
const applications = [
  {
    id: "1",
    jobId: "1",
    title: "Senior Frontend Engineer",
    company: "Google",
    status: "interview" as ApplicationStatus,
    matchScore: 91,
    appliedAt: "2026-08-26T09:00:00Z",
    deadline: "2026-08-30",
  },
  {
    id: "2",
    jobId: "2",
    title: "Staff Engineer",
    company: "Vercel",
    status: "applied" as ApplicationStatus,
    matchScore: 87,
    appliedAt: "2026-08-24T14:30:00Z",
    deadline: null,
  },
  {
    id: "3",
    jobId: "3",
    title: "Full Stack Developer",
    company: "Stripe",
    status: "screening" as ApplicationStatus,
    matchScore: 78,
    appliedAt: "2026-08-20T10:00:00Z",
    deadline: "2026-09-01",
  },
  {
    id: "4",
    jobId: "4",
    title: "Software Engineer II",
    company: "Microsoft",
    status: "saved" as ApplicationStatus,
    matchScore: 72,
    appliedAt: null,
    deadline: "2026-09-05",
  },
  {
    id: "5",
    jobId: "5",
    title: "Lead Software Engineer",
    company: "Atlassian",
    status: "offer" as ApplicationStatus,
    matchScore: 84,
    appliedAt: "2026-08-01T08:00:00Z",
    deadline: null,
  },
  {
    id: "6",
    jobId: "6",
    title: "React Developer",
    company: "Shopify",
    status: "rejected" as ApplicationStatus,
    matchScore: 68,
    appliedAt: "2026-07-15T11:00:00Z",
    deadline: null,
  },
];

const pipelineStages: ApplicationStatus[] = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
];

export default function ApplicationsPage() {
  const statusCounts = pipelineStages.reduce(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status).length;
      return acc;
    },
    {} as Record<ApplicationStatus, number>,
  );

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track your job application pipeline from saved to offer.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Application
          </Link>
        </div>

        {/* Pipeline overview */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {pipelineStages.map((status) => (
            <div
              key={status}
              className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"
            >
              <p className="text-2xl font-bold text-slate-900">
                {statusCounts[status]}
              </p>
              <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                {status}
              </p>
            </div>
          ))}
        </div>

        {/* Search & filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search applications..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <SlidersHorizontal size={16} />
            Filter
          </button>
        </div>

        {/* Applications list */}
        <div className="space-y-3">
          {applications.map((app) => (
            <Link key={app.id} href={`/applications/${app.id}`}>
              <Card className="transition-all hover:shadow-md cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={app.matchScore} size="sm" />
                    <div>
                      <h3 className="font-semibold text-slate-900">{app.title}</h3>
                      <p className="text-sm text-slate-500">{app.company}</p>
                      {app.appliedAt && (
                        <p className="text-xs text-slate-400">
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ProtectedLayout>
  );
}
