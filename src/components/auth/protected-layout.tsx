// ============================================================================
// CareerPilot AI — Protected Layout
// ============================================================================
//
// Combines AuthGuard (redirects unauthenticated users) with the AppLayout
// (sidebar + topbar + content area). Use this instead of AppLayout on any
// page that requires authentication.
// ============================================================================

import { AuthGuard } from "./auth-guard";
import { AppLayout } from "@/components/layout";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}
