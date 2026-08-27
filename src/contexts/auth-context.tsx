// ============================================================================
// CareerPilot AI — Auth Context Provider
// ============================================================================
//
// Provides:
//   - user        : the Firebase User object (or null)
//   - loading     : true while the initial auth state is resolving
//   - configError : non-null when Identity Platform env vars are missing
//
// Children are NOT rendered until the initial auth state has resolved,
// preventing the flash of protected content.
// ============================================================================

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { type User } from "firebase/auth";
import {
  onAuthStateChanged,
  isAuthConfigured,
} from "@/lib/firebase/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  configError: null,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * When Identity Platform is not configured, we still need to render the
 * provider. We skip the effect entirely and expose the config error.
 */
const CONFIG_ERROR =
  "Identity Platform is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local.";

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  // When auth is not configured, we never enter "loading" — the context
  // resolves immediately with loading=false and configError set.
  const [loading, setLoading] = useState(isAuthConfigured);

  useEffect(() => {
    if (!isAuthConfigured) return;

    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const configError = isAuthConfigured ? null : CONFIG_ERROR;

  const value = useMemo(
    () => ({ user, loading, configError }),
    [user, loading, configError],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
