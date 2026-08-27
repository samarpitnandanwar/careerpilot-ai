import type { Metadata } from "next";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { Card, ScoreRing } from "@/components/ui";
import { Plus, MapPin, Building2, Clock, Search, SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "Jobs",
};

// Placeholder — will be populated from Firestore
const jobs = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    company: "Google",
    location: "Mountain View, CA (Hybrid)",
    matchScore: 91,
    requiredSkills: ["React", "TypeScript", "GraphQL"],
    status: "analyzed",
    deadline: "2026-08-30",
    daysLeft: 3,
    postedDaysAgo: 2,
  },
  {
    id: "2",
    title: "Staff Engineer",
    company: "Vercel",
    location: "Remote",
    matchScore: 87,
    requiredSkills: ["Next.js", "TypeScript", "React"],
    status: "analyzed",
    deadline: null,
    daysLeft: null,
    postedDaysAgo: 5,
  },
  {
    id: "3",
    title: "Full Stack Developer",
    company: "Stripe",
    location: "San Francisco, CA",
    matchScore: 78,
    requiredSkills: ["Ruby", "React", "PostgreSQL"],
    status: "analyzed",
    deadline: "2026-09-01",
    daysLeft: 5,
    postedDaysAgo: 3,
  },
  {
    id: "4",
    title: "Software Engineer II",
    company: "Microsoft",
    location: "Seattle, WA (Hybrid)",
    matchScore: 72,
    requiredSkills: ["C#", ".NET", "Azure"],
    status: "analyzed",
    deadline: "2026-09-05",
    daysLeft: 9,
    postedDaysAgo: 7,
  },
  {
    id: "5",
    title: "Lead Software Engineer",
    company: "Atlassian",
    location: "Remote",
    matchScore: 84,
    requiredSkills: ["React", "Java", "Microservices"],
    status: "analyzed",
    deadline: null,
    daysLeft: null,
    postedDaysAgo: 10,
  },
];

export default function JobsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Discover and analyze opportunities with AI-powered matching.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={16} />
            Add Job
          </button>
        </div>

        {/* Search & filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search jobs by title, company, or skill..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        {/* Job cards */}
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="transition-all hover:shadow-md cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {job.title}
                      </h3>                        {job.deadline && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={12} />
                          {job.daysLeft}d left
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 size={14} /> {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {job.location}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ScoreRing score={job.matchScore} size="sm" label="Match" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
