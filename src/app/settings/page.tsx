"use client";

import { useState, useEffect, type FormEvent } from "react";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { getIdToken } from "@/lib/firebase/get-token";

export default function SettingsPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user || cancelled) return;

        if (user.email) setEmail(user.email);

        // Split displayName into first/last
        if (user.displayName) {
          const parts = user.displayName.trim().split(/\s+/);
          if (!cancelled) {
            setFirstName(parts[0] || "");
            setLastName(parts.slice(1).join(" ") || "");
          }
        }

        // Try to get profile data for richer info
        const token = await getIdToken();
        if (!token || cancelled) return;

        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const json = await res.json();
          if (json.success && json.data?.fullName) {
            const nameParts = json.data.fullName.trim().split(/\s+/);
            setFirstName(nameParts[0] || "");
            setLastName(nameParts.slice(1).join(" ") || "");
          }
        }
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        // Update Firebase display name
        const { updateProfile } = await import("firebase/auth");
        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`.trim() || undefined,
        });
      }

      // Update server profile
      const token = await getIdToken();
      if (token) {
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          await fetch("/api/profile", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fullName }),
          });
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const { signOut } = await import("@/lib/firebase/auth");
      await signOut();
      router.push("/login");
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account and preferences.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Account */}
            <Card>
              <CardHeader title="Account" subtitle="Your basic account information" />
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="settings-first-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                      First name
                    </label>
                    <input
                      id="settings-first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-last-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Last name
                    </label>
                    <input
                      id="settings-last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="settings-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  {saved && (
                    <span className="text-sm text-green-600">Saved!</span>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </Card>

            {/* Sign Out */}
            <Card>
              <CardHeader title="Session" subtitle="Manage your sign-in session" />
              <div className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Sign out</p>
                  <p className="text-xs text-slate-500">
                    End your current session and return to the login page
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
                >
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            </Card>

            {/* Danger zone */}
            <Card className="border-red-200">
              <CardHeader
                title="Danger Zone"
                subtitle="Irreversible actions"
              />
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
                <div>
                  <p className="text-sm font-medium text-red-700">Delete account</p>
                  <p className="text-xs text-red-500">
                    Permanently delete your account and all data
                  </p>
                </div>
                <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Delete Account
                </button>
              </div>
            </Card>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
