import type { Metadata } from "next";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, Badge } from "@/components/ui";
import { MapPin, Target, DollarSign, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Career Profile",
};

// Placeholder — will be populated from Firestore
const profile = {
  headline: "Senior Software Engineer",
  summary:
    "Experienced full-stack engineer with 7+ years building scalable web applications. Passionate about developer experience, clean architecture, and AI-powered tools.",
  yearsOfExperience: 7,
  educationLevel: "Bachelor",
  targetRoles: ["Staff Engineer", "Tech Lead", "Engineering Manager"],
  targetCompanies: ["Google", "Stripe", "Vercel", "Notion"],
  preferredLocations: ["Remote", "San Francisco", "New York"],
  workPreferences: {
    remote: true,
    hybrid: true,
    onsite: false,
    fullTime: true,
    partTime: false,
    contract: false,
  },
  salaryExpectation: { min: 180000, max: 250000, currency: "USD" },
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Python",
    "PostgreSQL",
    "GraphQL",
    "AWS",
    "Docker",
    "CI/CD",
  ],
};

export default function ProfilePage() {
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
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Edit Profile
          </button>
        </div>

        {/* Profile card */}
        <Card>
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-700">
              JD
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile.headline}</h2>
              <p className="mt-1 text-slate-500">{profile.summary}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Target size={14} /> {profile.yearsOfExperience} years experience
                </span>
                <span className="flex items-center gap-1">
                  <Building2 size={14} /> {profile.educationLevel}
                </span>
                {profile.salaryExpectation && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={14} />
                    ${(profile.salaryExpectation.min / 1000).toFixed(0)}k – $
                    {(profile.salaryExpectation.max / 1000).toFixed(0)}k
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Target roles */}
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

          {/* Target companies */}
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

          {/* Preferred locations */}
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

          {/* Work preferences */}
          <Card>
            <CardHeader title="Work Preferences" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.workPreferences)
                .filter(([, v]) => v)
                .map(([key]) => (
                  <Badge key={key} variant="success">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Badge>
                ))}
            </div>
          </Card>
        </div>

        {/* Skills */}
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
      </div>
    </ProtectedLayout>
  );
}
