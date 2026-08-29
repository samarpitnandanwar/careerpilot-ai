"use client";

import Link from "next/link";
import { Search, ChevronDown } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/notification-center";

export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs, applications..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <NotificationCenter />

        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
            U
          </div>
          <ChevronDown size={16} className="text-slate-400" />
        </Link>
      </div>
    </header>
  );
}
