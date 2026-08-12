"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Radio,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin/sessions";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "admin123@gmail.com",
    password: "rubenius@reds123",
    rememberMe: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setErrorMsg(null);
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleFillDemo = () => {
    setErrorMsg(null);
    setFormData({
      email: "admin123@gmail.com",
      password: "rubenius@reds123",
      rememberMe: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Invalid email or password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(redirectTarget);
        router.refresh();
      }, 800);
    } catch (err: any) {
      console.error("Login Error:", err);
      setErrorMsg("Failed to connect to authentication server");
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800/80 shadow-2xl shadow-slate-950/80 relative overflow-hidden space-y-6">
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400"></div>

      {/* Card Header Title */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-white">
          Admin Sign In
        </h1>
        <p className="text-xs text-slate-400">
          Sign in with demo credentials to manage experience feedback sessions
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Overlay */}
      {success ? (
        <div className="py-8 text-center space-y-3 animate-in fade-in zoom-in duration-300">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-white">Authentication Successful!</h3>
          <p className="text-xs text-slate-400">Redirecting to Control Room...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="admin123@gmail.com"
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Demo Fill & Remember Me */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>Keep me signed in</span>
            </label>

            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-bold transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Fill Demo Credentials</span>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Verifying Credentials...</span>
              </span>
            ) : (
              <>
                <span>Sign In to Admin Portal</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Demo Credentials Box */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1 text-xs font-mono text-slate-400">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Seeded Database Credentials:
        </div>
        <div className="flex items-center justify-between text-indigo-300">
          <span>Email: <strong className="text-white">admin123@gmail.com</strong></span>
          <span>Pass: <strong className="text-white">rubenius@reds123</strong></span>
        </div>
      </div>

      {/* Security Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Protected Admin Proxy</span>
        </div>
        <span className="font-mono text-slate-400">v1.0.0</span>
      </div>
    </div>
  );
}

export default function CanonicalLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none font-sans">
      {/* Ambient background glowing elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute top-10 left-10 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Top Header */}
      <header className="flex items-center justify-between z-10 max-w-6xl w-full mx-auto">
        <Link href="/auth/login" className="flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Radio className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              FeedbackCMS
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 ml-2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Admin Authentication
            </span>
          </div>
        </Link>

        <div className="text-xs text-slate-400 font-mono">
          Protected Route System
        </div>
      </header>

      {/* Main Authentication Card wrapped in Suspense */}
      <main className="my-auto py-12 flex items-center justify-center z-10">
        <div className="w-full max-w-md space-y-6">
          <Suspense
            fallback={
              <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
                <p className="text-xs text-slate-400">Loading Login Portal...</p>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 z-10">
        Experience Center Feedback CMS &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
