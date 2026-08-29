"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, MapPin, Building2, Clock, Search, X, Loader2 } from "lucide-react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, Badge } from "@/components/ui";
import type { FirestoreJob } from "@/types";

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

function formatDeadline(deadline: string | null): { text: string; color: string } | null {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Expired", color: "text-red-500" };
  if (days === 0) return { text: "Today", color: "text-red-600 font-semibold" };
  if (days === 1) return { text: "Tomorrow", color: "text-red-500 font-medium" };
  if (days <= 7) return { text: `${days}d left`, color: "text-amber-600" };
  if (days <= 30) return { text: `${days}d left`, color: "text-slate-500" };
  return { text: `${days}d left`, color: "text-slate-400" };
}

// ---------------------------------------------------------------------------
// Add Job Modal
// ---------------------------------------------------------------------------

function AddJobModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (job: FirestoreJob) => void;
}) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [salary, setSalary] = useState("");
  const [skills, setSkills] = useState("");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setCompany("");
    setLocation("");
    setUrl("");
    setDescription("");
    setSalary("");
    setSkills("");
    setEmploymentType("full-time");
    setDeadline("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) {
      setError("Job title and company are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Not authenticated.");
        return;
      }

      const payload = {
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        url: url.trim() || null,
        description: description.trim(),
        salary: salary.trim(),
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        employmentType,
        deadline: deadline || null,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to create job.");
        return;
      }

      onCreated(data.data);
      reset();
      onClose();
    } catch {
      setError("Failed to create job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Add New Job</h2>
          <button
            onClick={() => { reset(); onClose(); }}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Job URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Salary</label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. $120k-$160k"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Skills</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Comma-separated, e.g. React, TypeScript, Node.js"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<FirestoreJob[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

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

        const url = statusFilter
          ? `/api/jobs?status=${statusFilter}`
          : "/api/jobs";
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!cancelled && data.success && data.data) {
          setJobs(data.data);
        }
      } catch {
        if (!cancelled) setError("Failed to load jobs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [statusFilter]);

  // Client-side search filter
  const filtered = jobs.filter((job) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.location?.toLowerCase().includes(q) ||
      job.skills?.some((s) => s.toLowerCase().includes(q))
    );
  });

  // Status counts
  const statusCounts = jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleJobCreated = (job: FirestoreJob) => {
    setJobs((prev) => [job, ...prev]);
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

  if (error) {
    return (
      <ProtectedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
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
            <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Discover and analyze opportunities with AI-powered matching.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Job
          </button>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === null
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All ({jobs.length})
          </button>
          {(["saved", "interested", "applied", "closed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                statusFilter === status
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {status} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs by title, company, location, or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Job list */}
        {filtered.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 size={40} className="text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-700">
                {jobs.length === 0
                  ? "No jobs yet"
                  : "No jobs match your search"}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {jobs.length === 0
                  ? "Add your first job to get started with AI-powered matching."
                  : "Try adjusting your search or filters."}
              </p>
              {jobs.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus size={14} className="mr-1 inline" />
                  Add Your First Job
                </button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => {
              const deadline = formatDeadline(job.deadline);
              return (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card className="transition-all hover:shadow-md cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {job.title}
                          </h3>
                          {deadline && (
                            <span className={`flex items-center gap-1 text-xs ${deadline.color}`}>
                              <Clock size={12} />
                              {deadline.text}
                            </span>
                          )}
                          <Badge className="capitalize">{job.status}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Building2 size={14} /> {job.company}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} /> {job.location}
                            </span>
                          )}
                          {job.salary && (
                            <span className="text-xs text-slate-400">
                              {job.salary}
                            </span>
                          )}
                        </div>
                        {job.skills && job.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {job.skills.slice(0, 6).map((skill) => (
                              <span
                                key={skill}
                                className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 6 && (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                                +{job.skills.length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0 text-xs text-slate-400">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <AddJobModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handleJobCreated}
      />
    </ProtectedLayout>
  );
}
