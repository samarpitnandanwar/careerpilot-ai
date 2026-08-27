import type { Metadata } from "next";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, Badge } from "@/components/ui";
import { Upload, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Resume Management",
};

// Placeholder — will be populated from Cloud Storage + Vertex AI
const resumes = [
  {
    id: "1",
    fileName: "jane-smith-resume.pdf",
    uploadedAt: "2026-08-20T10:30:00Z",
    status: "parsed" as const,
    skills: 24,
    experience: 3,
  },
  {
    id: "2",
    fileName: "jane-smith-frontend-focus.pdf",
    uploadedAt: "2026-08-15T14:00:00Z",
    status: "uploaded" as const,
    skills: 0,
    experience: 0,
  },
];

const statusConfig = {
  parsed: { icon: <CheckCircle2 size={16} className="text-green-500" />, label: "Parsed", color: "success" as const },
  parsing: { icon: <Clock size={16} className="text-yellow-500" />, label: "Analyzing...", color: "warning" as const },
  uploaded: { icon: <FileText size={16} className="text-slate-400" />, label: "Uploaded", color: "default" as const },
  error: { icon: <AlertCircle size={16} className="text-red-500" />, label: "Error", color: "danger" as const },
};

export default function ResumePage() {
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
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 transition-colors hover:border-blue-400 hover:bg-blue-50">
            <Upload size={40} className="mb-4 text-slate-400" />
            <p className="text-lg font-medium text-slate-700">
              Drop your resume here or click to upload
            </p>
            <p className="mt-1 text-sm text-slate-500">
              PDF files up to 10MB — Gemini AI will analyze your resume
            </p>
            <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Choose file
            </button>
          </div>
        </Card>

        {/* Existing resumes */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Your Resumes</h2>
          {resumes.length === 0 ? (
            <Card>
              <div className="py-12 text-center text-slate-500">
                <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                <p>No resumes uploaded yet</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {resumes.map((resume) => {
                const st = statusConfig[resume.status];
                return (
                  <Card key={resume.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <FileText size={20} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{resume.fileName}</p>
                          <p className="text-xs text-slate-400">
                            Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {resume.status === "parsed" && (
                          <div className="hidden items-center gap-4 sm:flex">
                            <div className="text-center">
                              <p className="text-lg font-semibold text-slate-900">{resume.skills}</p>
                              <p className="text-xs text-slate-500">Skills</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-semibold text-slate-900">{resume.experience}</p>
                              <p className="text-xs text-slate-500">Experience</p>
                            </div>
                          </div>
                        )}
                        <Badge variant={st.color}>{st.label}</Badge>
                        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          View
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
