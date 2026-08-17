"use client";

import React, { useEffect, useState, use } from "react";
import { CheckCircle2, AlertCircle, Radio, Clock, ShieldCheck, Check } from "lucide-react";
import { SCALE as SCALE_OPTIONS } from "@/lib/scale";

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
  const [votedRating, setVotedRating] = useState<number | null>(null);
  const [votedLabel, setVotedLabel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 15-Minute Cooldown State (900 seconds)
  const COOLDOWN_SECONDS = 15 * 60;
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Read 15-minute cooldown cookie & local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRating = localStorage.getItem(`feedback_rating_${publicId}`);
      if (storedRating) {
        const num = parseInt(storedRating, 10);
        if (!isNaN(num)) {
          setVotedRating(num);
          const found = SCALE_OPTIONS.find((s) => s.n === num);
          if (found) setVotedLabel(found.t);
        }
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
          setVotedRating(null);
          setVotedLabel(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem(`feedback_rating_${publicId}`);
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

  const handleRatingSelect = async (opt: { n: number; t: string; hex: string }) => {
    if (submitting || votedRating !== null || cooldownRemaining > 0) return;
    setSubmitting(true);
    setErrorMsg(null);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }

    try {
      let visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor_id") : null;
      if (!visitorId) {
        visitorId = `vis_${Math.random().toString(36).substring(2, 10)}`;
        if (typeof window !== "undefined") {
          localStorage.setItem("visitor_id", visitorId);
        }
      }

      let visitorCode: string | null = null;
      if (typeof document !== "undefined") {
        const codeMatch = document.cookie.match(new RegExp(`pulse_code_${publicId}=([^;]+)`));
        if (codeMatch && codeMatch[1]) visitorCode = codeMatch[1];
      }

      const voteType = opt.n <= 3 ? "UP" : "DOWN";

      const res = await fetch(`/api/sessions/${publicId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: voteType, rating: opt.n, visitorId, visitorCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const now = Date.now();
        setVotedRating(opt.n);
        setVotedLabel(opt.t);
        setCooldownRemaining(COOLDOWN_SECONDS);

        if (typeof window !== "undefined") {
          localStorage.setItem(`feedback_rating_${publicId}`, opt.n.toString());
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
      <div className="min-h-screen bg-[#0A0B0C] text-[#E9EBED] flex flex-col items-center justify-center p-4">
        <Radio className="h-8 w-8 text-[#2FD98A] animate-pulse mb-3" />
        <p className="text-[#7A8085] text-xs font-mono tracking-widest uppercase">Validating room signal...</p>
      </div>
    );
  }

  if (errorMsg && !session) {
    return (
      <div className="min-h-screen bg-[#0A0B0C] text-[#E9EBED] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto space-y-4 font-mono">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <h1 className="text-sm font-bold tracking-widest uppercase">Session Unavailable</h1>
        <p className="text-[#7A8085] text-xs leading-relaxed">{errorMsg}</p>
      </div>
    );
  }

  const isLive = session?.status === "LIVE";
  const isCompleted = session?.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-[#0A0B0C] text-[#E9EBED] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto relative font-sans selection:bg-[#2FD98A] selection:text-black select-none">
      {/* Header Bar */}
      <header className="pt-2 pb-4 flex items-center justify-between border-b border-[#1B1D20] flex-none">
        <div className="flex flex-col">
          <div className="font-mono text-[11px] font-bold tracking-[0.42em] text-[#E9EBED]">PULSE</div>
          <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[#4C5155] truncate max-w-[200px]">
            {session?.name}
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] border border-[#26292D] bg-[#101113] font-mono text-[10px] text-[#7A8085]">
          <span className="w-2 h-2 rounded-full bg-[#2FD98A] animate-ping" />
          <span>{session?.publicId}</span>
        </div>
      </header>

      {/* Main Feedback Interface */}
      <main className="flex-1 flex flex-col justify-center py-4 space-y-4">
        {!isLive ? (
          <div className="p-6 border border-[#26292D] bg-[#101113] rounded-[3px] text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-[#E2C63F] mx-auto" />
            <h2 className="font-mono text-sm font-bold text-[#E9EBED] tracking-widest uppercase">
              {isCompleted ? "Session Completed" : "Session Closed"}
            </h2>
            <p className="text-[#7A8085] text-xs leading-relaxed font-sans">
              {isCompleted
                ? "This session has ended. Thank you for participating!"
                : "This session is currently waiting for the instructor to start."}
            </p>
          </div>
        ) : cooldownRemaining > 0 ? (
          /* Cooldown Lock Screen */
          <div className="p-6 border border-[#26292D] bg-[#101113] rounded-[3px] space-y-4 text-center animate-in fade-in duration-300">
            <div className="h-12 w-12 rounded-[3px] bg-[#2FD98A]/10 text-[#2FD98A] border border-[#2FD98A]/30 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h2 className="font-mono text-sm font-bold text-[#E9EBED] tracking-widest uppercase">
                Signal Marked!
              </h2>
              {votedLabel && (
                <p className="text-xs text-[#7A8085] font-mono">
                  Submitted: <strong className="text-[#E9EBED]">"{votedLabel}"</strong>
                </p>
              )}
            </div>

            {/* Digital Countdown Timer */}
            <div className="bg-[#0A0B0C] border border-[#1B1D20] p-4 rounded-[2px] space-y-1">
              <div className="font-mono text-[9.5px] uppercase font-medium text-[#4C5155] tracking-widest">
                Cooldown Active
              </div>
              <div className="font-mono text-2xl font-bold text-[#E9EBED] tabular-nums tracking-wider">
                {formatTime(cooldownRemaining)}
              </div>
              <div className="text-[10px] text-[#7A8085]">Remaining before next signal change</div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="h-1.5 w-full bg-[#0A0B0C] rounded-full overflow-hidden border border-[#1B1D20]">
              <div
                className="h-full bg-[#2FD98A] transition-all duration-1000"
                style={{ width: `${(cooldownRemaining / COOLDOWN_SECONDS) * 100}%` }}
              />
            </div>

            <div className="pt-1 flex items-center justify-center gap-1.5 font-mono text-[10px] text-[#4C5155]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2FD98A]" />
              <span>15-Minute Signal Protection</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-0.5 text-left px-1">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#E9EBED]">
                Mark Room Signal
              </h2>
              <p className="text-[11.5px] text-[#7A8085]">
                Tap the line that matches how you feel right now.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-[2px] bg-rose-950/30 border border-rose-900 text-[#E8434B] text-xs font-mono">
                {errorMsg}
              </div>
            )}

            {/* 7 PULSE Sentiment Buttons */}
            <div className="flex flex-col gap-2">
              {SCALE_OPTIONS.map((opt) => {
                const isSelected = votedRating === opt.n;
                return (
                  <button
                    key={opt.n}
                    onClick={() => handleRatingSelect(opt)}
                    disabled={submitting}
                    className={`relative w-full h-[52px] rounded-[3px] px-4 flex items-center gap-3.5 border transition-all text-left group active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
                      isSelected
                        ? "border-white bg-[#101113] text-[#E9EBED]"
                        : "border-[#1B1D20] hover:border-[#26292D] bg-[#0C0D0F] hover:bg-[#101113] text-[#E9EBED]"
                    }`}
                    style={
                      {
                        "--edge": opt.hex,
                      } as React.CSSProperties
                    }
                  >
                    {/* Colored Edge Bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-[3px] transition-opacity"
                      style={{ background: opt.hex }}
                    />

                    {/* Monospace Number */}
                    <span className="font-mono text-xs font-bold w-4 flex-none" style={{ color: opt.hex }}>
                      {opt.n}
                    </span>

                    {/* Text Label */}
                    <span className="text-sm font-medium tracking-tight flex-1 truncate">{opt.t}</span>

                    {/* Marked Status Badge */}
                    <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#7A8085] opacity-0 group-hover:opacity-100 transition-opacity">
                      MARK
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-2 text-center font-mono text-[10px] text-[#4C5155] border-t border-[#1B1D20] flex-none">
        PULSE ROOM SIGNAL &middot; {session?.speaker}
      </footer>
    </div>
  );
}
