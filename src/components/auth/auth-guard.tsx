// ============================================================================
// CareerPilot AI — Auth Guard
// ============================================================================
//
// Wraps protected page content. Behaviour:
//   1. While auth state is resolving → shows a loading skeleton.
//   2. If Identity Platform is not configured → shows a config notice.
//   3. If the user is signed out → redirects to /login.
//   4. If the user is signed in → renders children.
//
// This component must be rendered inside AuthProvider.
// ============================================================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Loading skeleton (matches the sidebar + topbar layout)
// ---------------------------------------------------------------------------

function AuthLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar skeleton */}
      <div className="hidden w-64 border-r border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-6">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="flex-1 p-6">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configuration notice (shown when env vars are missing)
// ---------------------------------------------------------------------------

function ConfigNotice({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-yellow-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-xl">
          ⚠️
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          Configuration Required
        </h2>
        <p className="text-sm text-slate-600">{message}</p>
        <p className="mt-4 text-xs text-slate-400">
          See <code className="rounded bg-slate-100 px-1">.env.example</code> for
          required variables.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth Guard
// ---------------------------------------------------------------------------

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, configError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !configError) {
      router.replace("/login");
    }
  }, [loading, user, configError, router]);

  // Still loading auth state
  if (loading) return <AuthLoadingSkeleton />;

  // Identity Platform not configured
  if (configError) return <ConfigNotice message={configError} />;

  // Not authenticated
  if (!user) return <AuthLoadingSkeleton />;

  // Authenticated — render protected content
  return <>{children}</>;
}
