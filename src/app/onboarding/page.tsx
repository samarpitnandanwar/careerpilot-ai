"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { getIdToken } from "@/lib/firebase/get-token";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchProfile(): Promise<Record<string, unknown> | null> {
  const token = await getIdToken();
  if (!token) return null;
  const res = await fetch("/api/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.success ? json.data : null;
}

async function saveProfile(data: Record<string, unknown>): Promise<boolean> {
  const token = await getIdToken();
  if (!token) return false;
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number | "">("");
  const [education, setEducation] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [workPreferences, setWorkPreferences] = useState<string[]>([]);

  // Step 2
  const [skills, setSkills] = useState("");
  const [certifications, setCertifications] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [remotePreference, setRemotePreference] = useState("remote");

  // Step 3
  const [salaryMin, setSalaryMin] = useState<number | "">("");
  const [salaryMax, setSalaryMax] = useState<number | "">("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [workAuthorization, setWorkAuthorization] = useState("");
  const [careerGoals, setCareerGoals] = useState("");

  // Load existing profile on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const profile = await fetchProfile();
        if (cancelled || !profile) return;
        // Pre-fill from existing profile data
        if (profile.headline) setHeadline(String(profile.headline));
        if (profile.yearsOfExperience)
          setYearsOfExperience(Number(profile.yearsOfExperience));
        if (profile.education) setEducation(String(profile.education));
        if (Array.isArray(profile.targetRoles) && profile.targetRoles.length)
          setTargetRoles(profile.targetRoles.join(", "));
        if (Array.isArray(profile.workPreferences) && profile.workPreferences.length)
          setWorkPreferences(profile.workPreferences as string[]);
        if (Array.isArray(profile.skills) && profile.skills.length)
          setSkills(profile.skills.join(", "));
        if (Array.isArray(profile.certifications) && profile.certifications.length)
          setCertifications(profile.certifications.join(", "));
        if (Array.isArray(profile.preferredLocations) && profile.preferredLocations.length)
          setPreferredLocations(profile.preferredLocations.join(", "));
        if (profile.remotePreference)
          setRemotePreference(String(profile.remotePreference));
        if (profile.salaryMin != null) setSalaryMin(Number(profile.salaryMin));
        if (profile.salaryMax != null) setSalaryMax(Number(profile.salaryMax));
        if (profile.noticePeriod) setNoticePeriod(String(profile.noticePeriod));
        if (profile.workAuthorization)
          setWorkAuthorization(String(profile.workAuthorization));
        if (profile.careerGoals) setCareerGoals(String(profile.careerGoals));
      } catch {
        // Silently fail — fresh profile
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Get display name for heading (read client-side only)
  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    async function loadName() {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user?.displayName) setDisplayName(user.displayName);
      else if (user?.email) setDisplayName(user.email);
    }
    loadName();
  }, []);

  // ---------------------------------------------------------------------------
  // Step handlers
  // ---------------------------------------------------------------------------

  const WORK_PREF_OPTIONS = ["Remote", "Hybrid", "Onsite", "Full-time", "Part-time", "Contract"];

  function toggleWorkPreference(pref: string) {
    setWorkPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  }

  async function handleStep1(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      fullName: displayName || "User",
      headline,
      location: "",
      yearsOfExperience: yearsOfExperience === "" ? 0 : Number(yearsOfExperience),
      currentRole: headline,
      targetRoles: parseCommaSeparated(targetRoles),
      targetCompanies: [],
      skills: [],
      education,
      certifications: [],
      preferredLocations: [],
      remotePreference: workPreferences.find((w) =>
        ["Remote", "Hybrid", "Onsite"].includes(w),
      )?.toLowerCase() || "remote",
      salaryMin: null,
      salaryMax: null,
      noticePeriod: "",
      workAuthorization: "",
      careerGoals: "",
    };

    const ok = await saveProfile(payload);
    setSaving(false);

    if (!ok) {
      setError("Failed to save. Please try again.");
      return;
    }

    setStep(2);
  }

  async function handleStep2(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Load existing to preserve step 1 data
    const existing = await fetchProfile();

    const payload = {
      fullName: (existing?.fullName as string) || displayName || "User",
      headline: (existing?.headline as string) || headline,
      location: (existing?.location as string) || "",
      yearsOfExperience: existing?.yearsOfExperience ?? 0,
      currentRole: (existing?.currentRole as string) || headline,
      targetRoles: (existing?.targetRoles as string[]) || parseCommaSeparated(targetRoles),
      targetCompanies: (existing?.targetCompanies as string[]) || [],
      skills: parseCommaSeparated(skills),
      education: (existing?.education as string) || education,
      certifications: parseCommaSeparated(certifications),
      preferredLocations: parseCommaSeparated(preferredLocations),
      remotePreference: remotePreference,
      salaryMin: existing?.salaryMin ?? null,
      salaryMax: existing?.salaryMax ?? null,
      noticePeriod: (existing?.noticePeriod as string) || "",
      workAuthorization: (existing?.workAuthorization as string) || "",
      careerGoals: (existing?.careerGoals as string) || "",
    };

    const ok = await saveProfile(payload);
    setSaving(false);

    if (!ok) {
      setError("Failed to save. Please try again.");
      return;
    }

    setStep(3);
  }

  async function handleStep3(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Load existing to preserve step 1 + 2 data
    const existing = await fetchProfile();

    const payload = {
      fullName: (existing?.fullName as string) || displayName || "User",
      headline: (existing?.headline as string) || headline,
      location: (existing?.location as string) || "",
      yearsOfExperience: existing?.yearsOfExperience ?? 0,
      currentRole: (existing?.currentRole as string) || headline,
      targetRoles: (existing?.targetRoles as string[]) || [],
      targetCompanies: (existing?.targetCompanies as string[]) || [],
      skills: (existing?.skills as string[]) || [],
      education: (existing?.education as string) || education,
      certifications: (existing?.certifications as string[]) || [],
      preferredLocations: (existing?.preferredLocations as string[]) || [],
      remotePreference: (existing?.remotePreference as string) || remotePreference,
      salaryMin: salaryMin === "" ? null : Number(salaryMin),
      salaryMax: salaryMax === "" ? null : Number(salaryMax),
      noticePeriod,
      workAuthorization,
      careerGoals,
    };

    const ok = await saveProfile(payload);
    setSaving(false);

    if (!ok) {
      setError("Failed to save. Please try again.");
      return;
    }

    // Mark onboarding completed
    const token = await getIdToken();
    if (token) {
      await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    router.push("/dashboard");
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stepLabels = ["Career Profile", "Skills & Location", "Preferences & Goals"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
            CP
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Build your career profile
          </h1>
          <p className="mt-2 text-slate-500">
            Help our AI understand your background so we can find the best
            opportunities for you.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-600">Step {step} of 3</span>
            <span className="text-slate-400">{stepLabels[step - 1]}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <h2 className="mb-6 text-lg font-semibold text-slate-900">
                Your Professional Info
              </h2>
              <div className="space-y-5">
                <div>
                  <label htmlFor="headline" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Professional headline
                  </label>
                  <input
                    id="headline"
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div>
                  <label htmlFor="summary" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Professional summary
                  </label>
                  <textarea
                    id="summary"
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Brief overview of your experience and strengths..."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="years" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Years of experience
                    </label>
                    <input
                      id="years"
                      type="number"
                      min={0}
                      max={50}
                      value={yearsOfExperience}
                      onChange={(e) =>
                        setYearsOfExperience(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label htmlFor="education" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Highest education
                    </label>
                    <select
                      id="education"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select level</option>
                      <option value="high_school">High School</option>
                      <option value="associate">Associate Degree</option>
                      <option value="bachelor">Bachelor&apos;s Degree</option>
                      <option value="master">Master&apos;s Degree</option>
                      <option value="doctorate">Doctorate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="target-roles" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Target roles
                  </label>
                  <input
                    id="target-roles"
                    type="text"
                    value={targetRoles}
                    onChange={(e) => setTargetRoles(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Software Engineer, Tech Lead, Engineering Manager"
                  />
                  <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Work preferences
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {WORK_PREF_OPTIONS.map((pref) => (
                      <label
                        key={pref}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          workPreferences.includes(pref)
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={workPreferences.includes(pref)}
                          onChange={() => toggleWorkPreference(pref)}
                        />
                        {pref}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Continue →"
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2}>
              <h2 className="mb-6 text-lg font-semibold text-slate-900">
                Skills & Location
              </h2>
              <div className="space-y-5">
                <div>
                  <label htmlFor="skills" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Key skills
                  </label>
                  <input
                    id="skills"
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="TypeScript, React, Node.js, Python"
                  />
                  <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
                </div>
                <div>
                  <label htmlFor="certifications" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Certifications
                  </label>
                  <input
                    id="certifications"
                    type="text"
                    value={certifications}
                    onChange={(e) => setCertifications(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="AWS Solutions Architect, PMP"
                  />
                  <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
                </div>
                <div>
                  <label htmlFor="locations" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Preferred locations
                  </label>
                  <input
                    id="locations"
                    type="text"
                    value={preferredLocations}
                    onChange={(e) => setPreferredLocations(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Remote, San Francisco, New York"
                  />
                  <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
                </div>
                <div>
                  <label htmlFor="remote-pref" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Remote preference
                  </label>
                  <select
                    id="remote-pref"
                    value={remotePreference}
                    onChange={(e) => setRemotePreference(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="remote">Fully Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Continue →"
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleStep3}>
              <h2 className="mb-6 text-lg font-semibold text-slate-900">
                Preferences & Goals
              </h2>
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="salary-min" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Minimum salary (USD)
                    </label>
                    <input
                      id="salary-min"
                      type="number"
                      min={0}
                      value={salaryMin}
                      onChange={(e) =>
                        setSalaryMin(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <label htmlFor="salary-max" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Maximum salary (USD)
                    </label>
                    <input
                      id="salary-max"
                      type="number"
                      min={0}
                      value={salaryMax}
                      onChange={(e) =>
                        setSalaryMax(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="200000"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="notice-period" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notice period
                  </label>
                  <input
                    id="notice-period"
                    type="text"
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="2 weeks, 1 month, etc."
                  />
                </div>
                <div>
                  <label htmlFor="work-auth" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Work authorization
                  </label>
                  <input
                    id="work-auth"
                    type="text"
                    value={workAuthorization}
                    onChange={(e) => setWorkAuthorization(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="US Citizen, H1B, etc."
                  />
                </div>
                <div>
                  <label htmlFor="career-goals" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Career goals
                  </label>
                  <textarea
                    id="career-goals"
                    rows={4}
                    value={careerGoals}
                    onChange={(e) => setCareerGoals(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="What are you looking for in your next role?"
                  />
                </div>
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Complete Setup ✓"
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
