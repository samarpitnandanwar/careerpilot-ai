import Link from "next/link";
import {
  Brain,
  BarChart3,
  FileText,
  Briefcase,
  Rocket,
  Target,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Match Analysis",
    description:
      "Get explainable match scores for every job — skills, experience, education, and more.",
  },
  {
    icon: Target,
    title: "Priority Engine",
    description:
      "Let AI rank your opportunities. Know exactly which jobs to apply to next.",
  },
  {
    icon: FileText,
    title: "Resume Intelligence",
    description:
      "Upload your resume and let Gemini extract structured skills, experience, and strengths.",
  },
  {
    icon: Zap,
    title: "Interview Copilot",
    description:
      "AI-generated technical, behavioral, and role-specific questions with real-time feedback.",
  },
  {
    icon: BarChart3,
    title: "Career Analytics",
    description:
      "Track your application pipeline, skill gaps, and success rates over time.",
  },
  {
    icon: Briefcase,
    title: "Smart Application Tracker",
    description:
      "From saved to offer — manage your entire job search pipeline in one place.",
  },
];

const steps = [
  {
    num: 1,
    title: "Build Your Profile",
    description: "Set up your career profile and upload your resume.",
  },
  {
    num: 2,
    title: "Add Target Jobs",
    description: "Paste job descriptions and let AI analyze every detail.",
  },
  {
    num: 3,
    title: "Get AI Recommendations",
    description: "See match scores, priority rankings, and what you're missing.",
  },
  {
    num: 4,
    title: "Land Your Dream Job",
    description: "Prepare with interview copilot and track your progress.",
  },
];

const stats = [
  { value: "AI-Powered", label: "Decision Engine" },
  { value: "100%", label: "Explainable Scores" },
  { value: "Real-Time", label: "Interview Prep" },
  { value: "Full", label: "Pipeline Tracking" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
            CP
          </div>
          <span className="text-xl font-bold text-slate-900">CareerPilot AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
            <Rocket size={16} />
            AI-Powered Job Search Platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Stop guessing.
            <br />
            <span className="text-blue-600">Start applying smarter.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            CareerPilot AI tells you which jobs to apply to next, why you&apos;re
            a great fit, what you&apos;re missing, and how to prepare — all backed
            by explainable AI analysis.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Start for free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Everything you need to land your next role
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              CareerPilot AI combines intelligent analysis with practical tools
              to give you a genuine edge in your job search.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              How CareerPilot AI works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              From profile to interview — four simple steps.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {step.num}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Ready to transform your job search?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Join CareerPilot AI and let intelligent analysis guide your next
            career move.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create your account
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            {["Free to start", "No credit card required", "AI-powered analysis"].map(
              (item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-green-500" />
                  {item}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white text-xs font-bold">
              CP
            </div>
            <span className="text-sm font-medium text-slate-600">CareerPilot AI</span>
          </div>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} CareerPilot AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
