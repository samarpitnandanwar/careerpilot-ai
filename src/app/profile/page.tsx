"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, Badge } from "@/components/ui";
import { MapPin, Target, DollarSign, Building2, Loader2 } from "lucide-react";
import { getIdToken } from "@/lib/firebase/get-token";

interface ProfileData {
  fullName: string;
  headline: string;
  summary?: string;
  location: string;
  yearsOfExperience: number;
  currentRole: string;
  targetRoles: string[];
  targetCompanies: string[];
  preferredLocations: string[];
  remotePreference: string;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  education: string;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}



export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user?.email && !cancelled) setEmail(user.email);

        const token = await getIdToken();
        if (!token || cancelled) return;

        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.success && json.data && !cancelled) {
          setProfile(json.data);
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

  const hasProfile = profile && (profile.headline || profile.yearsOfExperience || profile.skills?.length);

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Career Profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              Your professional background and preferences.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : !hasProfile ? (
          <Card>
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">
                No profile data yet. Complete onboarding to set up your career profile.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Profile card */}
            <Card>
              <div className="flex items-start gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-700">
                  {getInitials(profile?.fullName || "")}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">
                    {profile?.headline || "Career Profile"}
                  </h2>
                  {email && (
                    <p className="mt-1 text-sm text-slate-500">{email}</p>
                  )}
                  {profile?.yearsOfExperience != null && profile.yearsOfExperience > 0 && (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Target size={14} /> {profile.yearsOfExperience} years experience
                      </span>
                      {profile?.education && (
                        <span className="flex items-center gap-1">
                          <Building2 size={14} /> {profile.education}
                        </span>
                      )}
                      {profile?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {profile.location}
                        </span>
                      )}
                      {profile?.salaryMin != null && profile?.salaryMax != null && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={14} />
                          ${(profile.salaryMin / 1000).toFixed(0)}k – $
                          {(profile.salaryMax / 1000).toFixed(0)}k
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Target roles */}
              {profile?.targetRoles && profile.targetRoles.length > 0 && (
                <Card>
                  <CardHeader title="Target Roles" />
                  <div className="flex flex-wrap gap-2">
                    {profile.targetRoles.map((role) => (
                      <Badge key={role} variant="info">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* Target companies */}
              {profile?.targetCompanies && profile.targetCompanies.length > 0 && (
                <Card>
                  <CardHeader title="Target Companies" />
                  <div className="flex flex-wrap gap-2">
                    {profile.targetCompanies.map((company) => (
                      <Badge key={company} variant="purple">
                        {company}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* Preferred locations */}
              {profile?.preferredLocations && profile.preferredLocations.length > 0 && (
                <Card>
                  <CardHeader title="Preferred Locations" />
                  <div className="flex flex-wrap gap-2">
                    {profile.preferredLocations.map((loc) => (
                      <span
                        key={loc}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        <MapPin size={12} /> {loc}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Remote preference */}
              {profile?.remotePreference && (
                <Card>
                  <CardHeader title="Work Preference" />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success">
                      {profile.remotePreference.charAt(0).toUpperCase() + profile.remotePreference.slice(1)}
                    </Badge>
                  </div>
                </Card>
              )}
            </div>

            {/* Skills */}
            {profile?.skills && profile.skills.length > 0 && (
              <Card>
                <CardHeader title="Top Skills" />
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
