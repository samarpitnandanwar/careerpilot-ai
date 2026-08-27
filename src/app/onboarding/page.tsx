import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Profile Setup",
};

export default function OnboardingPage() {
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
            <span className="font-medium text-blue-600">Step 1 of 3</span>
            <span className="text-slate-400">Career Profile</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/3 rounded-full bg-blue-600" />
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">
            Your Professional Info
          </h2>
          <form className="space-y-5">
            <div>
              <label htmlFor="headline" className="mb-1.5 block text-sm font-medium text-slate-700">
                Professional headline
              </label>
              <input
                id="headline"
                type="text"
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
                {["Remote", "Hybrid", "Onsite", "Full-time", "Part-time", "Contract"].map(
                  (pref) => (
                    <label
                      key={pref}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
                    >
                      <input type="checkbox" className="sr-only" />
                      {pref}
                    </label>
                  ),
                )}
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
