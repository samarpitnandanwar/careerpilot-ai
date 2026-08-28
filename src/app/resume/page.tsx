"use client";

import { useState, useEffect, useRef } from "react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, Badge } from "@/components/ui";
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Trash2, Star, RefreshCw, Eye } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { FirestoreResume } from "@/types";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: "success" | "warning" | "default" | "danger" }> = {
  ready: { icon: <CheckCircle2 size={16} className="text-green-500" />, label: "Ready", color: "success" },
  processing: { icon: <Clock size={16} className="text-yellow-500" />, label: "Processing...", color: "warning" },
  uploaded: { icon: <FileText size={16} className="text-slate-400" />, label: "Uploaded", color: "default" },
  failed: { icon: <AlertCircle size={16} className="text-red-500" />, label: "Failed", color: "danger" },
};

export default function ResumePage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<FirestoreResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<FirestoreResume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to fetch resumes
  const loadResumes = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/resumes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setResumes(data.data);
    } catch {
      console.error("Failed to fetch resumes");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/resumes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && data.success) setResumes(data.data);
      } catch {
        console.error("Failed to fetch resumes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  // Poll for processing resumes
  useEffect(() => {
    const processing = resumes.filter((r) => r.status === "processing" || r.status === "uploaded");
    if (processing.length === 0) return;

    const interval = setInterval(() => {
      loadResumes();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumes]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    setUploadError(null);

    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      setResumes((prev) => [data.data, ...prev]);
    } catch {
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleDelete = async (resumeId: string) => {
    if (!user || !confirm("Are you sure you want to delete this resume?")) return;

    try {
      const token = await user.getIdToken();
      await fetch(`/api/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      if (selectedResume?.id === resumeId) setSelectedResume(null);
    } catch {
      console.error("Failed to delete resume");
    }
  };

  const handleActivate = async (resumeId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      await fetch(`/api/resumes/${resumeId}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setResumes((prev) =>
        prev.map((r) => ({ ...r, active: r.id === resumeId })),
      );
    } catch {
      console.error("Failed to activate resume");
    }
  };

  const handleReprocess = async (resumeId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      await fetch(`/api/resumes/${resumeId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadResumes();
    } catch {
      console.error("Failed to reprocess resume");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resume Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload resumes for AI-powered analysis and skill extraction.
          </p>
        </div>

        {/* Upload zone */}
        <Card>
          <div
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors ${
              uploading
                ? "border-blue-400 bg-blue-50"
                : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <RefreshCw size={40} className="mb-4 animate-spin text-blue-500" />
                <p className="text-lg font-medium text-blue-700">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload size={40} className="mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700">
                  Drop your resume here or click to upload
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  PDF and DOCX files up to 10MB — AI will analyze your resume
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Choose file
                </button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {uploadError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {uploadError}
            </div>
          )}
        </Card>

        {/* Existing resumes */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Your Resumes</h2>
          {loading ? (
            <Card>
              <div className="py-12 text-center text-slate-400">
                <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                Loading resumes...
              </div>
            </Card>
          ) : resumes.length === 0 ? (
            <Card>
              <div className="py-12 text-center text-slate-500">
                <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                <p>No resumes uploaded yet</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {resumes.map((resume) => {
                const st = STATUS_CONFIG[resume.status] ?? STATUS_CONFIG.uploaded;
                const skills = resume.parsedData?.skills
                  ? [...(resume.parsedData.skills.technical ?? []), ...(resume.parsedData.skills.tools ?? []), ...(resume.parsedData.skills.frameworks ?? [])]
                  : [];
                const expCount = resume.parsedData?.experience?.length ?? 0;

                return (
                  <Card key={resume.id} className={resume.active ? "ring-2 ring-blue-500" : ""}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <FileText size={20} className="text-slate-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{resume.fileName}</p>
                            {resume.active && (
                              <Badge variant="info">Active</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                          </p>
                          {resume.errorMessage && (
                            <p className="mt-1 text-xs text-red-500">{resume.errorMessage}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {resume.status === "ready" && skills.length > 0 && (
                          <div className="hidden items-center gap-4 sm:flex">
                            <div className="text-center">
                              <p className="text-lg font-semibold text-slate-900">{skills.length}</p>
                              <p className="text-xs text-slate-500">Skills</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-semibold text-slate-900">{expCount}</p>
                              <p className="text-xs text-slate-500">Experience</p>
                            </div>
                          </div>
                        )}
                        <Badge variant={st.color}>{st.label}</Badge>
                        {resume.status === "ready" && (
                          <>
                            <button
                              onClick={() => setSelectedResume(resume)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleActivate(resume.id)}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 ${
                                resume.active
                                  ? "border-blue-300 text-blue-600"
                                  : "border-slate-200 text-slate-600"
                              }`}
                              title={resume.active ? "Active" : "Set as active"}
                            >
                              <Star size={14} fill={resume.active ? "currentColor" : "none"} />
                            </button>
                          </>
                        )}
                        {(resume.status === "failed" || resume.status === "uploaded") && (
                          <button
                            onClick={() => handleReprocess(resume.id)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            title="Reprocess"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(resume.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Resume Preview Modal */}
        {selectedResume && selectedResume.parsedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Resume Preview</h3>
                <button
                  onClick={() => setSelectedResume(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <ResumePreview data={selectedResume.parsedData} />
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}

// ---------------------------------------------------------------------------
// Resume Preview Component
// ---------------------------------------------------------------------------

function ResumePreview({ data }: { data: NonNullable<FirestoreResume["parsedData"]> }) {
  return (
    <div className="space-y-6 text-sm">
      {/* Personal */}
      <div>
        <h4 className="mb-2 font-semibold text-slate-900">Personal Information</h4>
        <div className="rounded-lg bg-slate-50 p-3 space-y-1">
          <p><span className="text-slate-500">Name:</span> {data.personal?.name ?? data.name}</p>
          <p><span className="text-slate-500">Email:</span> {data.personal?.email}</p>
          {data.personal?.phone && <p><span className="text-slate-500">Phone:</span> {data.personal.phone}</p>}
          {data.personal?.location && <p><span className="text-slate-500">Location:</span> {data.personal.location}</p>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div>
          <h4 className="mb-2 font-semibold text-slate-900">Summary</h4>
          <p className="text-slate-600">{data.summary}</p>
        </div>
      )}

      {/* Skills */}
      <div>
        <h4 className="mb-2 font-semibold text-slate-900">Skills</h4>
        <div className="space-y-2">
          {data.skills?.technical?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Technical</p>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.technical.map((s) => (
                  <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{s}</span>
                ))}
              </div>
            </div>
          )}
          {data.skills?.frameworks?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Frameworks</p>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.frameworks.map((s) => (
                  <span key={s} className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">{s}</span>
                ))}
              </div>
            </div>
          )}
          {data.skills?.tools?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Tools</p>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.tools.map((s) => (
                  <span key={s} className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Experience */}
      {data.experience?.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-slate-900">Experience</h4>
          <div className="space-y-3">
            {data.experience.map((exp, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-3">
                <p className="font-medium text-slate-900">{exp.role} at {exp.company}</p>
                <p className="text-xs text-slate-400">
                  {exp.startDate} — {exp.current ? "Present" : exp.endDate}
                  {exp.location && ` · ${exp.location}`}
                </p>
                {exp.achievements?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.achievements.slice(0, 3).map((a, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-blue-500" />
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education?.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-slate-900">Education</h4>
          <div className="space-y-2">
            {data.education.map((edu, i) => (
              <div key={i} className="text-slate-600">
                <p className="font-medium">{edu.degree} in {edu.field}</p>
                <p className="text-xs text-slate-400">{edu.institution}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Career signals */}
      {data.careerSignals?.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-slate-900">Career Signals</h4>
          <ul className="space-y-1">
            {data.careerSignals.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-yellow-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta */}
      <div className="flex gap-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
        {data.totalYearsExperience > 0 && <span>{data.totalYearsExperience} years experience</span>}
        {data.seniority && <span>Seniority: {data.seniority}</span>}
        {data.domains?.length > 0 && <span>Domains: {data.domains.join(", ")}</span>}
      </div>
    </div>
  );
}
