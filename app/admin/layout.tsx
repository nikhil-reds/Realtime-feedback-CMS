import React from "react";
import Link from "next/link";
import {
  Radio,
  PlusCircle,
  LayoutDashboard,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link
            href="/admin/sessions"
            className="flex items-center space-x-3 group"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Radio className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  FeedbackCMS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Dynamic Sessions
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Experience Center Realtime Control Panel
              </p>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center space-x-1 pl-6 border-l border-slate-800">
            <Link
              href="/admin/sessions"
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <LayoutDashboard className="h-4 w-4 text-indigo-400" />
              <span>All Sessions</span>
            </Link>

            <Link
              href="/admin/sessions/new"
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              <span>Create Session</span>
            </Link>
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/sessions/new"
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>New Experience</span>
          </Link>

          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Admin Authenticated</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          Realtime Feedback CMS &copy; {new Date().getFullYear()} Experience Center Bangalore
        </div>
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center space-x-1 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Realtime Engine Active</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
