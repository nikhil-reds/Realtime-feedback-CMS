"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Play,
  Square,
  Radio,
  ThumbsUp,
  ThumbsDown,
  Monitor,
  QrCode,
  Copy,
  Check,
  Clock,
  Sparkles,
  RefreshCw,
  Activity,
  History,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface FeedbackItem {
  id: string;
  vote: "UP" | "DOWN";
  createdAt: string;
  visitorId?: string;
}

interface EventItem {
  id: string;
  eventType: string;
  createdAt: string;
  metadata?: any;
}

import RealtimeGraphs, { TimeSeriesBucket } from "./RealtimeGraphs";
import SessionActionModal from "@/components/SessionActionModal";

interface SessionDetails {
  id: string;
  publicId: string;
  name: string;
  speaker: string;
  location: string;
  description?: string;
  status: "DRAFT" | "LIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  totalVotes: number;
  upVotes: number;
  downVotes: number;
  satisfaction: number;
  feedbacks: FeedbackItem[];
  events: EventItem[];
  timeSeries?: TimeSeriesBucket[];
}

export default function SessionControlRoomPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);

  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackUrl, setFeedbackUrl] = useState("");

  // Modal State
  const [modalType, setModalType] = useState<"START" | "END" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFeedbackUrl(`${window.location.origin}/feedback/${publicId}`);
    }
  }, [publicId]);

  const fetchSessionData = async () => {
    try {
      const res = await fetch(`/api/sessions/${publicId}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
    const interval = setInterval(fetchSessionData, 2000);
    return () => clearInterval(interval);
  }, [publicId]);

  const handleStartSession = async () => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/sessions/${publicId}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchSessionData();
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setUpdatingStatus(false);
      setModalType(null);
    }
  };

  const handleEndSession = async () => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/sessions/${publicId}/end`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchSessionData();
      }
    } catch (err) {
      console.error("Failed to end session:", err);
    } finally {
      setUpdatingStatus(false);
      setModalType(null);
    }
  };

  const handleCopyUrl = () => {
    if (!feedbackUrl) return;
    navigator.clipboard.writeText(feedbackUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading && !session) {
    return (
      <div className="py-24 text-center space-y-3 px-4">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
        <p className="text-slate-400 text-sm">Loading Session Control Room...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="glass-panel p-6 sm:p-12 text-center rounded-2xl space-y-4 max-w-md mx-auto my-12 border border-slate-800">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Session Not Found</h2>
        <p className="text-slate-400 text-sm">
          No dynamic session found with ID <span className="font-mono text-white">{publicId}</span>.
        </p>
        <Link
          href="/admin/sessions"
          className="inline-flex items-center space-x-2 bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const isLive = session.status === "LIVE";
  const isDraft = session.status === "DRAFT";
  const isCompleted = session.status === "COMPLETED";

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/admin/sessions"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All Sessions</span>
        </Link>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSessionData}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Header & Status Control Panel */}
      <div
        className={`glass-panel p-5 sm:p-8 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden ${
          isLive
            ? "border-emerald-500/40 bg-slate-900/90"
            : "border-slate-800"
        }`}
      >
        <div className="space-y-3 max-w-2xl min-w-0">
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 border border-slate-700">
              Session ID: {session.publicId}
            </span>

            {/* Status Pill */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center space-x-1.5 ${
                isLive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 pulse-glow-green"
                  : isDraft
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isLive
                    ? "bg-emerald-400 animate-ping"
                    : isDraft
                    ? "bg-amber-400"
                    : "bg-indigo-400"
                }`}
              ></span>
              <span>🟢 {session.status}</span>
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight break-words">
              {session.name}
            </h1>
            <div className="text-xs sm:text-sm text-slate-400 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <span>👤 Speaker: <strong className="text-white">{session.speaker}</strong></span>
              <span>📍 Location: <strong className="text-white">{session.location}</strong></span>
            </div>
          </div>

          {session.description && (
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl break-words">
              {session.description}
            </p>
          )}
        </div>

        {/* Status Transition Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-col lg:flex-row items-stretch gap-2.5 sm:gap-3 w-full md:w-auto">
          {isDraft && (
            <button
              onClick={() => setModalType("START")}
              disabled={updatingStatus}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm px-5 py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current animate-pulse shrink-0" />
              <span className="whitespace-nowrap">START SESSION</span>
            </button>
          )}

          {isLive && (
            <button
              onClick={() => setModalType("END")}
              disabled={updatingStatus}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs sm:text-sm px-5 py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Square className="h-4 w-4 fill-current shrink-0" />
              <span className="whitespace-nowrap">END SESSION</span>
            </button>
          )}

          {isCompleted && (
            <div className="px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
              <span className="text-xs font-semibold text-slate-400 block">Status</span>
              <span className="text-xs sm:text-sm font-bold text-indigo-300">Session Completed</span>
            </div>
          )}

          {/* Projector Display Link */}
          <Link
            href={`/admin/sessions/${session.publicId}/display`}
            target="_blank"
            className="flex items-center justify-center space-x-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs sm:text-sm px-4 py-3.5 rounded-xl transition-all"
          >
            <Monitor className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Open Display</span>
          </Link>
        </div>
      </div>

      {/* Realtime Metrics Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Votes */}
        <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-1.5 sm:space-y-2">
          <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Responses
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
            {session.totalVotes}
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500">Live audience feedback</div>
        </div>

        {/* Positive Votes */}
        <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-1.5 sm:space-y-2">
          <div className="text-[11px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Positive</span>
            <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-300">
            👍 {session.upVotes}
          </div>
          <div className="text-[11px] sm:text-xs text-emerald-400/70 truncate">
            {session.totalVotes > 0
              ? `${Math.round((session.upVotes / session.totalVotes) * 100)}% of total`
              : "No votes yet"}
          </div>
        </div>

        {/* Negative Votes */}
        <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-1.5 sm:space-y-2">
          <div className="text-[11px] sm:text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Negative</span>
            <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-rose-300">
            👎 {session.downVotes}
          </div>
          <div className="text-[11px] sm:text-xs text-rose-400/70 truncate">
            {session.totalVotes > 0
              ? `${Math.round((session.downVotes / session.totalVotes) * 100)}% of total`
              : "No votes yet"}
          </div>
        </div>

        {/* Satisfaction Percentage */}
        <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-violet-500/30 bg-violet-950/20 space-y-1.5 sm:space-y-2">
          <div className="text-[11px] sm:text-xs font-bold text-violet-400 uppercase tracking-wider">
            Satisfaction Rate
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-violet-300">
            {session.satisfaction}%
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${session.satisfaction}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3 Realtime Analytics Graphs */}
      <RealtimeGraphs
        upVotes={session.upVotes}
        downVotes={session.downVotes}
        totalVotes={session.totalVotes}
        satisfaction={session.satisfaction}
        timeSeries={session.timeSeries || []}
        isLive={isLive}
      />

      {/* Main Grid: QR & Links | Live Feed | Event Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: QR Code & Sharing Options */}
        <div className="space-y-6">
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 sm:space-y-5 text-center">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center justify-center space-x-2">
              <QrCode className="h-4 w-4 text-indigo-400" />
              <span>Dynamic QR Code</span>
            </h3>

            {/* QR Code Graphic */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl inline-block shadow-xl shadow-indigo-500/10 max-w-full">
              <QRCodeSVG
                value={feedbackUrl || `https://example.com/feedback/${session.publicId}`}
                size={160}
                level="H"
                includeMargin={false}
                className="w-36 h-36 sm:w-44 sm:h-44 mx-auto"
              />
            </div>

            <p className="text-xs text-slate-400 font-mono break-all px-2">
              /feedback/{session.publicId}
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleCopyUrl}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-400" />
                    <span>Copy Student Feedback URL</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/admin/sessions/${session.publicId}/display`}
                  target="_blank"
                  className="flex items-center justify-center space-x-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold py-2 rounded-xl transition-all"
                >
                  <Monitor className="h-3.5 w-3.5 shrink-0" />
                  <span>Display</span>
                </Link>

                <Link
                  href={`/admin/sessions/${session.publicId}/qr`}
                  className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold py-2 rounded-xl transition-all"
                >
                  <QrCode className="h-3.5 w-3.5 shrink-0" />
                  <span>Print QR</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Live Activity Feed */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Activity className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
              <span>Live Activity Stream</span>
            </h3>
            {isLive && (
              <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Streaming</span>
              </span>
            )}
          </div>

          {session.feedbacks.length === 0 ? (
            <div className="py-10 sm:py-12 text-center space-y-2 text-slate-500 text-xs">
              <Clock className="h-8 w-8 mx-auto text-slate-700" />
              <p>No feedback submitted yet.</p>
              {isLive && <p className="text-slate-400">Waiting for student votes...</p>}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
              {session.feedbacks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition-all text-xs gap-2"
                >
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center space-x-1 ${
                        item.vote === "UP"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {item.vote === "UP" ? "👍 POSITIVE" : "👎 NEGATIVE"}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Session Event Audit Logs */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <History className="h-4 w-4 text-violet-400 shrink-0" />
            <span>Session Audit Logs</span>
          </h3>

          {session.events.length === 0 ? (
            <div className="py-10 sm:py-12 text-center text-slate-500 text-xs">
              No audit events logged.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
              {session.events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-900 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-indigo-300 truncate">
                      {ev.eventType}
                    </span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(ev.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {ev.eventType === "SESSION_CREATED" && "Session initialized in system."}
                    {ev.eventType === "SESSION_STARTED" && "Session transitioned to LIVE state."}
                    {ev.eventType === "SESSION_COMPLETED" && "Session marked COMPLETED."}
                    {ev.eventType === "FEEDBACK_UP" && "Positive student vote recorded."}
                    {ev.eventType === "FEEDBACK_DOWN" && "Negative student vote recorded."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Start & End Session Confirmation Modal */}
      <SessionActionModal
        isOpen={modalType !== null}
        type={modalType}
        sessionName={session.name}
        publicId={session.publicId}
        isSubmitting={updatingStatus}
        onClose={() => setModalType(null)}
        onConfirm={modalType === "START" ? handleStartSession : handleEndSession}
      />
    </div>
  );
}
