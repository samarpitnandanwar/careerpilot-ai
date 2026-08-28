"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Loader2,
  Briefcase,
} from "lucide-react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, StatusBadge } from "@/components/ui";
import { PIPELINE_STAGES } from "@/lib/applications/state-machine";
import type { FirestoreApplication, ApplicationStatus } from "@/types";

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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<FirestoreApplication[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(null);
  const [sortBy, setSortBy] = useState<"updatedAt" | "appliedAt" | "deadline">("updatedAt");

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

        const res = await fetch("/api/applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!cancelled && data.success && data.data) {
          setApplications(data.data);
        }
      } catch {
        if (!cancelled) setError("Failed to load applications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Filter and sort
  const filtered = applications
    .filter((a) => !a.archived)
    .filter((a) => (statusFilter ? a.status === statusFilter : true))
    .filter((a) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return a.jobTitle.toLowerCase().includes(q) || a.company.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "deadline") {
        const aDate = a.deadline ?? "9999";
        const bDate = b.deadline ?? "9999";
        return aDate.localeCompare(bDate);
      }
      if (sortBy === "appliedAt") {
        const aDate = a.appliedAt ?? "0000";
        const bDate = b.appliedAt ?? "0000";
        return bDate.localeCompare(aDate);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  // Status counts (only pipeline stages)
  const statusCounts = PIPELINE_STAGES.reduce(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status && !a.archived).length;
      return acc;
    },
    {} as Record<ApplicationStatus, number>,
  );

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
            <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
            <p className="mt-1 text-sm text-red-500">{error}</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
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
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {PIPELINE_STAGES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={`rounded-xl border p-4 text-center shadow-sm transition-all ${
                statusFilter === status
                  ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p className="text-2xl font-bold text-slate-900">
                {statusCounts[status] ?? 0}
              </p>
              <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                {status}
              </p>
            </button>
          ))}
        </div>

        {/* Search & sort */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="updatedAt">Last Updated</option>
            <option value="appliedAt">Applied Date</option>
            <option value="deadline">Deadline</option>
          </select>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Applications list */}
        {filtered.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <Briefcase size={40} className="text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-700">
                {applications.length === 0
                  ? "Your application tracker is empty"
                  : "No applications match your filters"}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {applications.length === 0
                  ? "Browse jobs and start tracking your applications."
                  : "Try adjusting your search or filters."}
              </p>
              {applications.length === 0 && (
                <Link
                  href="/jobs"
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Browse Jobs
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => (
              <Link key={app.id} href={`/applications/${app.id}`}>
                <Card className="transition-all hover:shadow-md cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <StatusBadge status={app.status} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{app.jobTitle}</h3>
                        <p className="text-sm text-slate-500">{app.company}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {app.appliedAt && (
                            <span className="text-xs text-slate-400">
                              Applied {new Date(app.appliedAt).toLocaleDateString()}
                            </span>
                          )}
                          {app.deadline && (
                            <span className="text-xs text-amber-600">
                              Deadline {new Date(app.deadline).toLocaleDateString()}
                            </span>
                          )}
                          {app.nextAction && app.nextAction !== "NONE" && (
                            <span className="text-xs text-blue-600">
                              {app.nextAction.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {app.followUpDate && (
                        <span className="text-xs text-slate-400">
                          Follow-up {new Date(app.followUpDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
