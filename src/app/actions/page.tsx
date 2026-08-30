"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle,
  X,
  Loader2,
  Clock,
  AlertTriangle,
  Award,
  Star,
  FileText,
  Mic,
  RefreshCw,
  Settings,
} from "lucide-react";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, Badge, EmptyState } from "@/components/ui";
import type { FirestoreAction, ActionType, ActionPriority } from "@/lib/actions";
import { getIdToken } from "@/lib/firebase/get-token";

const ICON_MAP: Record<string, React.ReactNode> = {
  Mic: <Mic size={16} />,
  Clock: <Clock size={16} />,
  AlertTriangle: <AlertTriangle size={16} />,
  FileText: <FileText size={16} />,
  Award: <Award size={16} />,
  Star: <Star size={16} />,
  RefreshCw: <RefreshCw size={16} />,
  Settings: <Settings size={16} />,
};

const TYPE_ICONS: Record<ActionType, string> = {
  INTERVIEW_PREP: "Mic",
  FOLLOW_UP: "Clock",
  APPLICATION_DEADLINE: "AlertTriangle",
  ASSESSMENT: "FileText",
  REVIEW_OFFER: "Award",
  HIGH_PRIORITY_JOB: "Star",
  APPLICATION_UPDATE: "RefreshCw",
  SYSTEM: "Settings",
};

const PRIORITY_BADGE: Record<ActionPriority, "danger" | "warning" | "default" | "info"> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "default",
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DISMISSED", label: "Dismissed" },
];

export default function ActionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<FirestoreAction[]>([]);
  const [filter, setFilter] = useState<string>("OPEN");
  const [processingId, setProcessingId] = useState<string | null>(null);

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

        const statusParam = filter === "all" ? "" : `?status=${filter}`;
        const res = await fetch(`/api/actions${statusParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        if (!cancelled) {
          if (json.success && json.data) {
            setActions(json.data);
          } else {
            setError(json.error || "Failed to load actions");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load actions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filter]);

  async function handleComplete(actionId: string) {
    setProcessingId(actionId);
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`/api/actions/${actionId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setActions((prev) =>
        prev.map((a) =>
          a.id === actionId
            ? { ...a, status: "COMPLETED" as const, completedAt: new Date().toISOString() }
            : a,
        ),
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDismiss(actionId: string) {
    setProcessingId(actionId);
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`/api/actions/${actionId}/dismiss`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setActions((prev) =>
        prev.map((a) =>
          a.id === actionId
            ? { ...a, status: "DISMISSED" as const, dismissedAt: new Date().toISOString() }
            : a,
        ),
      );
    } finally {
      setProcessingId(null);
    }
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Action Center</h1>
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Action Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Proactive tasks and reminders from your job search.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {actions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CheckCircle size={48} />}
              title={filter === "OPEN" ? "No open actions" : "No actions found"}
              description={
                filter === "OPEN"
                  ? "You're all caught up! Actions will appear here as your job search progresses."
                  : "No actions match this filter."
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const icon = ICON_MAP[TYPE_ICONS[action.type]];
              const isOpen = action.status === "OPEN";
              const isProcessing = processingId === action.id;

              return (
                <Card key={action.id} padding={false}>
                  <div className="flex items-center gap-4 p-4">
                    {/* Icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      action.priority === "CRITICAL"
                        ? "bg-red-50 text-red-600"
                        : action.priority === "HIGH"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-slate-50 text-slate-500"
                    }`}>
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">{action.title}</p>
                        <Badge variant={PRIORITY_BADGE[action.priority]}>
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{action.description}</p>
                      {action.dueAt && isOpen && (
                        <p className="text-xs text-slate-400 mt-1">
                          Due: {new Date(action.dueAt).toLocaleDateString()}
                        </p>
                      )}
                      {action.completedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Completed: {new Date(action.completedAt).toLocaleDateString()}
                        </p>
                      )}
                      {action.dismissedAt && (
                        <p className="text-xs text-slate-400 mt-1">
                          Dismissed: {new Date(action.dismissedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isOpen && (
                        <>
                          <Link
                            href={action.actionUrl}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleComplete(action.id)}
                            disabled={isProcessing}
                            className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDismiss(action.id)}
                            disabled={isProcessing}
                            className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                          >
                            <X size={12} />
                          </button>
                        </>
                      )}
                      {(action.status === "COMPLETED" || action.status === "DISMISSED") && (
                        <Link
                          href={action.actionUrl}
                          className="text-xs text-blue-600 hover:text-blue-500"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}


