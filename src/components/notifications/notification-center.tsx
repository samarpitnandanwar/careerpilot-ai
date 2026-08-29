"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Mic, Clock, AlertTriangle, AlertCircle, RefreshCw, Award, XCircle, FileText, Star, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  applicationId: string | null;
  jobId: string | null;
  interviewId: string | null;
  resumeId: string | null;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  INTERVIEW_SCHEDULED: Mic,
  INTERVIEW_REMINDER: Bell,
  FOLLOW_UP_DUE: Clock,
  APPLICATION_DEADLINE_APPROACHING: AlertTriangle,
  APPLICATION_DEADLINE_EXPIRED: AlertCircle,
  APPLICATION_STATUS_CHANGED: RefreshCw,
  OFFER_RECEIVED: Award,
  APPLICATION_REJECTED: XCircle,
  ASSESSMENT_DUE: FileText,
  HIGH_PRIORITY_JOB: Star,
  RESUME_PROCESSED: CheckCircle,
  RESUME_PROCESSING_FAILED: XCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-600",
  HIGH: "text-orange-600",
  MEDIUM: "text-yellow-600",
  LOW: "text-slate-500",
};

function getNotificationUrl(n: Notification): string {
  if (n.interviewId) return `/interview/${n.interviewId}`;
  if (n.applicationId) return `/applications/${n.applicationId}`;
  if (n.jobId) return `/jobs/${n.jobId}`;
  if (n.resumeId) return `/resume`;
  return "/dashboard";
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function NotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);



  // Initial fetch + poll every 30 seconds
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/notifications?limit=20");
        if (res.ok && mounted) {
          const data = await res.json();
          const notifs = data.data ?? [];
          setNotifications(notifs);
          setUnreadCount(notifs.filter((n: Notification) => !n.read).length);
        }
      } catch {
        // Silently fail
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ({unreadCount} unread)
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] ?? Bell;
                const priorityColor = PRIORITY_COLORS[notification.priority] ?? "text-slate-500";
                const url = getNotificationUrl(notification);

                return (
                  <button
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id);
                      setIsOpen(false);
                      router.push(url);
                    }}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                      !notification.read && "bg-blue-50/50",
                    )}
                  >
                    <div className={cn("mt-0.5 flex-shrink-0", priorityColor)}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        notification.read ? "text-slate-600" : "font-medium text-slate-900",
                      )}>
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/dashboard");
                }}
                className="w-full text-center text-xs text-blue-600 hover:text-blue-700"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
