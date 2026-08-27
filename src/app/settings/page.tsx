import type { Metadata } from "next";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { Card, CardHeader, Input, Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account and preferences.
          </p>
        </div>

        {/* Account */}
        <Card>
          <CardHeader title="Account" subtitle="Your basic account information" />
          <form className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" defaultValue="Jane" />
              <Input label="Last name" defaultValue="Smith" />
            </div>
            <Input label="Email" type="email" defaultValue="jane@example.com" disabled />
            <div className="flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </form>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader
            title="Notifications"
            subtitle="Control what notifications you receive"
          />
          <div className="space-y-4">
            {[
              {
                label: "Deadline reminders",
                description: "Get notified before application deadlines",
                defaultChecked: true,
              },
              {
                label: "Interview reminders",
                description: "Reminders before scheduled interviews",
                defaultChecked: true,
              },
              {
                label: "New job matches",
                description: "Notifications when new high-match jobs are found",
                defaultChecked: false,
              },
              {
                label: "Weekly summary",
                description: "Weekly analytics and progress report",
                defaultChecked: true,
              },
            ].map((pref) => (
              <label
                key={pref.label}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{pref.label}</p>
                  <p className="text-xs text-slate-500">{pref.description}</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={pref.defaultChecked}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </label>
            ))}
          </div>
        </Card>

        {/* AI Preferences */}
        <Card>
          <CardHeader
            title="AI Preferences"
            subtitle="Configure how AI analyzes your applications"
          />
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Minimum match score to suggest
              </label>
              <input
                type="range"
                min={30}
                max={90}
                defaultValue={60}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>30%</span>
                <span>90%</span>
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Auto-generate interview prep</p>
                <p className="text-xs text-slate-500">
                  Automatically create interview questions when you reach the interview stage
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300"
              />
            </label>
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
      </div>
    </ProtectedLayout>
  );
}
