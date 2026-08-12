"use client";

import React, { useEffect, useState, use } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ThumbsUp, ThumbsDown, Radio, Sparkles, AlertCircle } from "lucide-react";

interface SessionDisplayData {
  publicId: string;
  name: string;
  speaker: string;
  location: string;
  status: "DRAFT" | "LIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  upVotes: number;
  downVotes: number;
  totalVotes: number;
  satisfaction: number;
}

export default function ProjectorDisplayPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);

  const [session, setSession] = useState<SessionDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackUrl, setFeedbackUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFeedbackUrl(`${window.location.origin}/feedback/${publicId}`);
    }
  }, [publicId]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${publicId}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("Failed to load display session:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [publicId]);

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xl">
        Loading Display View...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <AlertCircle className="h-16 w-16 text-rose-500" />
        <h1 className="text-2xl font-bold">Session Not Found</h1>
        <p className="text-slate-400">Public ID: {publicId}</p>
      </div>
    );
  }

  const isLive = session.status === "LIVE";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden select-none font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>

      {/* Top Header */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Radio className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Experience Center Feedback
            </span>
            <p className="text-xs text-slate-400">Live Session ID: {session.publicId}</p>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`px-4 py-2 rounded-full text-xs font-black tracking-widest flex items-center space-x-2 ${
            isLive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 pulse-glow-green"
              : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isLive ? "bg-emerald-400 animate-ping" : "bg-amber-400"
            }`}
          ></span>
          <span>{isLive ? "🟢 LIVE — FEEDBACK OPEN" : `STATUS: ${session.status}`}</span>
        </div>
      </header>

      {/* Middle Card: Title, QR Code, Scan Prompt */}
      <main className="my-auto py-8 text-center space-y-8 z-10 max-w-3xl mx-auto w-full">
        {/* Session Info */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            {session.location}
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            {session.name}
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 font-medium">
            Speaker: <span className="text-indigo-300 font-bold">{session.speaker}</span>
          </p>
        </div>

        {/* Big QR Code Card */}
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-indigo-500/30 inline-block shadow-2xl shadow-indigo-900/40 relative group">
          <div className="bg-white p-5 rounded-2xl shadow-inner inline-block">
            <QRCodeSVG
              value={feedbackUrl || `https://example.com/feedback/${session.publicId}`}
              size={240}
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="mt-4 space-y-1">
            <div className="text-lg font-bold text-white flex items-center justify-center space-x-2">
              <Sparkles className="h-5 w-5 text-indigo-400 animate-bounce" />
              <span>Scan QR Code To Give Feedback</span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              /feedback/{session.publicId}
            </p>
          </div>
        </div>

        {/* Live Vote Counters Ticker */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-xl mx-auto flex items-center justify-around">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ThumbsUp className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-emerald-400">{session.upVotes}</div>
              <div className="text-xs text-slate-400 font-medium">Positive Votes</div>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800"></div>

          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ThumbsDown className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-rose-400">{session.downVotes}</div>
              <div className="text-xs text-slate-400 font-medium">Negative Votes</div>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800"></div>

          <div className="text-right">
            <div className="text-2xl font-black text-indigo-300">{session.satisfaction}%</div>
            <div className="text-xs text-slate-400 font-medium">Satisfaction</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between text-xs text-slate-500 z-10 border-t border-slate-900 pt-4">
        <div>Feedback updates live in real-time</div>
        <div>Experience Center Bangalore</div>
      </footer>
    </div>
  );
}
