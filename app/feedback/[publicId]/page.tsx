"use client";

import React, { useEffect, useState, use } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle2, AlertCircle, Radio, Clock, ShieldCheck } from "lucide-react";

interface StudentSession {
  publicId: string;
  name: string;
  speaker: string;
  location: string;
  status: "DRAFT" | "LIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
}

export default function StudentFeedbackPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);

  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState<"UP" | "DOWN" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 15-Minute Cooldown State (900 seconds)
  const COOLDOWN_SECONDS = 15 * 60;
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Read 15-minute cooldown cookie & local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedVote = localStorage.getItem(`feedback_voted_${publicId}`);
      if (storedVote === "UP" || storedVote === "DOWN") {
        setVoted(storedVote);
      }

      // Read cookie timestamp or localStorage timestamp
      const match = document.cookie.match(new RegExp(`fb_cooldown_${publicId}=([^;]+)`));
      let lastTime: number | null = null;

      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed)) lastTime = parsed;
      }

      if (!lastTime) {
        const storedTs = localStorage.getItem(`feedback_timestamp_${publicId}`);
        if (storedTs) {
          const parsed = parseInt(storedTs, 10);
          if (!isNaN(parsed)) lastTime = parsed;
        }
      }

      if (lastTime) {
        const elapsedSec = Math.floor((Date.now() - lastTime) / 1000);
        const remaining = COOLDOWN_SECONDS - elapsedSec;
        if (remaining > 0) {
          setCooldownRemaining(remaining);
        }
      }
    }

    // Fetch session status
    fetch(`/api/sessions/${publicId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSession(data.session);
        } else {
          setErrorMsg(data.error || "Session not found");
        }
      })
      .catch(() => {
        setErrorMsg("Failed to connect to feedback server");
      })
      .finally(() => setLoading(false));
  }, [publicId]);

  // Live 1-Second Countdown Timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setVoted(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem(`feedback_voted_${publicId}`);
            localStorage.removeItem(`feedback_timestamp_${publicId}`);
            document.cookie = `fb_cooldown_${publicId}=; path=/; max-age=0`;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining, publicId]);

  // Format seconds into MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVote = async (vote: "UP" | "DOWN") => {
    if (submitting || voted || cooldownRemaining > 0) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      let visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor_id") : null;
      if (!visitorId) {
        visitorId = `vis_${Math.random().toString(36).substring(2, 10)}`;
        if (typeof window !== "undefined") {
          localStorage.setItem("visitor_id", visitorId);
        }
      }

      const res = await fetch(`/api/sessions/${publicId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote, visitorId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const now = Date.now();
        setVoted(vote);
        setCooldownRemaining(COOLDOWN_SECONDS);

        if (typeof window !== "undefined") {
          localStorage.setItem(`feedback_voted_${publicId}`, vote);
          localStorage.setItem(`feedback_timestamp_${publicId}`, now.toString());
          document.cookie = `fb_cooldown_${publicId}=${now}; path=/; max-age=${COOLDOWN_SECONDS}; SameSite=Lax`;
        }
      } else {
        if (data.remainingSeconds) {
          setCooldownRemaining(data.remainingSeconds);
        }
        setErrorMsg(data.error || "Failed to submit feedback");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error submitting vote");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Radio className="h-10 w-10 text-indigo-500 animate-pulse mb-3" />
        <p className="text-slate-400 text-sm font-medium">Validating feedback session...</p>
      </div>
    );
  }

  if (errorMsg && !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h1 className="text-xl font-bold">Session Unavailable</h1>
        <p className="text-slate-400 text-sm">{errorMsg}</p>
      </div>
    );
  }

  const isLive = session?.status === "LIVE";
  const isCompleted = session?.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 max-w-md mx-auto relative font-sans selection:bg-indigo-500 select-none">
      {/* Ambient background glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="pt-4 text-center space-y-2 z-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-indigo-400">
          <Radio className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
          <span>Session ID: {session?.publicId}</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white leading-snug">
          {session?.name}
        </h1>

        <div className="text-xs text-slate-400 space-x-2">
          <span>👤 {session?.speaker}</span>
          <span>•</span>
          <span>📍 {session?.location}</span>
        </div>
      </header>

      {/* Main Feedback Interface */}
      <main className="my-auto py-8 text-center space-y-6 z-10">
        {!isLive ? (
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-4">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">
              {isCompleted ? "Session Completed" : "Session Closed"}
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              {isCompleted
                ? "This feedback session has ended. Thank you for participating!"
                : "This session is currently in DRAFT status. Feedback will open when the speaker starts the session."}
            </p>
          </div>
        ) : cooldownRemaining > 0 ? (
          /* 15-Minute Cooldown Lock Screen */
          <div className="glass-panel p-8 rounded-3xl border border-indigo-500/40 bg-indigo-950/20 space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
              <Clock className="h-9 w-9 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-white">
                Feedback Submitted!
              </h2>
              <p className="text-xs text-slate-300">
                You voted <strong className="text-emerald-400">{voted === "UP" ? "👍 Positive" : "👎 Negative"}</strong>
              </p>
            </div>

            {/* Live Digital Countdown Timer */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                15-Minute Cooldown Active
              </div>
              <div className="text-3xl font-black text-indigo-300 font-mono tracking-wider">
                {formatTime(cooldownRemaining)}
              </div>
              <div className="text-[11px] text-slate-400">
                Time remaining before next vote allowed
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${(cooldownRemaining / COOLDOWN_SECONDS) * 100}%` }}
              ></div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              To prevent duplicate votes and spam, feedback submissions are restricted to once every 15 minutes per device.
            </p>

            <div className="pt-2 flex items-center justify-center space-x-1.5 text-[11px] text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>15-Min Cookie Protection Active</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white">
                How was your experience?
              </h2>
              <p className="text-xs text-slate-400">
                Tap an option below to submit instant realtime feedback.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Touch Voting Buttons */}
            <div className="grid grid-cols-2 gap-4">
              {/* Positive Vote */}
              <button
                onClick={() => handleVote("UP")}
                disabled={submitting}
                className="glass-panel glass-panel-hover p-8 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col items-center justify-center space-y-3 group active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <ThumbsUp className="h-8 w-8" />
                </div>
                <span className="font-extrabold text-base text-emerald-300 group-hover:text-emerald-200">
                  GREAT 👍
                </span>
              </button>

              {/* Negative Vote */}
              <button
                onClick={() => handleVote("DOWN")}
                disabled={submitting}
                className="glass-panel glass-panel-hover p-8 rounded-3xl border border-rose-500/30 bg-rose-950/20 flex flex-col items-center justify-center space-y-3 group active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="h-16 w-16 rounded-2xl bg-rose-500/20 text-rose-400 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <ThumbsDown className="h-8 w-8" />
                </div>
                <span className="font-extrabold text-base text-rose-300 group-hover:text-rose-200">
                  POOR 👎
                </span>
              </button>
            </div>

            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500 pt-2">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Feedback limit: 1 response per 15 minutes</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-500 z-10">
        Experience Center Realtime Feedback Engine
      </footer>
    </div>
  );
}
