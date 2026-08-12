"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Radio,
  Clock,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Monitor,
  QrCode,
  SlidersHorizontal,
  Copy,
  Check,
  Trash2,
  Play,
  Square,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

import SessionActionModal from "@/components/SessionActionModal";

interface Session {
  id: string;
  publicId: string;
  name: string;
  speaker: string;
  location: string;
  description?: string;
  status: "DRAFT" | "LIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  scheduledAt?: string;
  totalVotes: number;
  upVotes: number;
  downVotes: number;
  satisfaction: number;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "START" | "END" | null;
    publicId: string;
    sessionName: string;
  }>({
    isOpen: false,
    type: null,
    publicId: "",
    sessionName: "",
  });
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyLink = (publicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/feedback/${publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openStartModal = (publicId: string, sessionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionModal({ isOpen: true, type: "START", publicId, sessionName });
  };

  const openEndModal = (publicId: string, sessionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionModal({ isOpen: true, type: "END", publicId, sessionName });
  };

  const executeSessionAction = async () => {
    if (!actionModal.type || !actionModal.publicId) return;

    setIsSubmittingModal(true);
    const endpoint =
      actionModal.type === "START"
        ? `/api/sessions/${actionModal.publicId}/start`
        : `/api/sessions/${actionModal.publicId}/end`;

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchSessions();
      }
    } catch (err) {
      console.error(`Failed to ${actionModal.type.toLowerCase()} session:`, err);
    } finally {
      setIsSubmittingModal(false);
      setActionModal({ isOpen: false, type: null, publicId: "", sessionName: "" });
    }
  };

  const handleDelete = async (publicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete session ${publicId}? All feedback history will be removed.`)) return;
    setDeletingId(publicId);
    try {
      const res = await fetch(`/api/sessions/${publicId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.publicId !== publicId));
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.speaker.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.publicId.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Aggregated Stats
  const totalSessions = sessions.length;
  const liveSessionsCount = sessions.filter((s) => s.status === "LIVE").length;
  const totalVotesCount = sessions.reduce((acc, s) => acc + s.totalVotes, 0);
  const totalUpVotes = sessions.reduce((acc, s) => acc + s.upVotes, 0);
  const globalSatisfaction =
    totalVotesCount > 0 ? Math.round((totalUpVotes / totalVotesCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Experience Sessions</span>
            {liveSessionsCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 pulse-glow-green">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                {liveSessionsCount} LIVE NOW
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage live events, generate dynamic session QR codes, and monitor realtime audience feedback.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSessions}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Refresh session list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/admin/sessions/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Session</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Sessions
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {totalSessions}
          </div>
          <div className="text-xs text-slate-500">Created in system</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-2">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Live Sessions</span>
            <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-300">
            {liveSessionsCount}
          </div>
          <div className="text-xs text-emerald-400/70">Accepting realtime feedback</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-indigo-500/20 bg-indigo-950/10 space-y-2">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Total Responses
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-300">
            {totalVotesCount.toLocaleString()}
          </div>
          <div className="text-xs text-indigo-400/70">Audience submissions</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-violet-500/20 bg-violet-950/10 space-y-2">
          <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
            Avg Satisfaction
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-violet-300">
            {globalSatisfaction}%
          </div>
          <div className="text-xs text-violet-400/70">Positive feedback ratio</div>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {[
            { id: "ALL", label: "All Sessions" },
            { id: "LIVE", label: "🟢 Live" },
            { id: "DRAFT", label: "🟡 Drafts" },
            { id: "COMPLETED", label: "🔵 Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by session, speaker, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Loading dynamic sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-4">
          <Radio className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No sessions found</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {search || statusFilter !== "ALL"
              ? "No experience sessions matched your filter criteria."
              : "No feedback sessions created yet. Click below to create your first dynamic session."}
          </p>
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            <span>Create Session</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`glass-panel glass-panel-hover p-6 rounded-2xl border flex flex-col justify-between space-y-5 relative overflow-hidden ${
                session.status === "LIVE"
                  ? "border-emerald-500/40 bg-slate-900/90"
                  : "border-slate-800"
              }`}
            >
              {/* Header Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                      ID: {session.publicId}
                    </span>
                    <button
                      onClick={(e) => handleCopyLink(session.publicId, e)}
                      className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                      title="Copy student feedback link"
                    >
                      {copiedId === session.publicId ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 ${
                      session.status === "LIVE"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 pulse-glow-green"
                        : session.status === "DRAFT"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        session.status === "LIVE"
                          ? "bg-emerald-400 animate-ping"
                          : session.status === "DRAFT"
                          ? "bg-amber-400"
                          : "bg-indigo-400"
                      }`}
                    ></span>
                    <span>{session.status}</span>
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white line-clamp-1 hover:text-indigo-300 transition-colors">
                    <Link href={`/admin/sessions/${session.publicId}`}>
                      {session.name}
                    </Link>
                  </h2>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-y-1 gap-x-3">
                    <span>👤 {session.speaker}</span>
                    <span>📍 {session.location}</span>
                  </div>
                </div>

                {session.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {session.description}
                  </p>
                )}
              </div>

              {/* Realtime Vote Counters & Bar */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center space-x-3">
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span className="font-bold">{session.upVotes}</span>
                    </span>
                    <span className="text-rose-400 flex items-center space-x-1">
                      <ThumbsDown className="h-3.5 w-3.5" />
                      <span className="font-bold">{session.downVotes}</span>
                    </span>
                  </div>
                  <div className="text-slate-300 font-bold">
                    {session.satisfaction}% <span className="text-slate-500 font-normal">Satisfaction</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  {session.totalVotes > 0 ? (
                    <>
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${(session.upVotes / session.totalVotes) * 100}%` }}
                      ></div>
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{ width: `${(session.downVotes / session.totalVotes) * 100}%` }}
                      ></div>
                    </>
                  ) : (
                    <div className="bg-slate-700 h-full w-full"></div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{session.totalVotes} total responses</span>
                  <span>
                    {session.status === "LIVE" ? "Updating live" : "Archived"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1 border-t border-slate-800/60">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/admin/sessions/${session.publicId}`}
                    className="flex items-center justify-center space-x-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold py-2 rounded-xl transition-all shadow-md"
                  >
                    <span>Control Room</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>

                  <Link
                    href={`/admin/sessions/${session.publicId}/display`}
                    target="_blank"
                    className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 rounded-xl transition-all border border-slate-700"
                  >
                    <Monitor className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Projector</span>
                  </Link>
                </div>

                <div className="flex items-center justify-between pt-1 gap-2">
                  {/* Status Toggle Quick Button */}
                  {session.status === "DRAFT" ? (
                    <button
                      onClick={(e) => openStartModal(session.publicId, session.name, e)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Start Session</span>
                    </button>
                  ) : session.status === "LIVE" ? (
                    <button
                      onClick={(e) => openEndModal(session.publicId, session.name, e)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      <Square className="h-3 w-3 fill-current" />
                      <span>End Session</span>
                    </button>
                  ) : (
                    <span className="flex-1 text-center text-xs text-slate-500 py-1.5">
                      Session Completed
                    </span>
                  )}

                  <Link
                    href={`/admin/sessions/${session.publicId}/qr`}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                    title="View & Print QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={(e) => handleDelete(session.publicId, e)}
                    disabled={deletingId === session.publicId}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors border border-slate-800"
                    title="Delete Session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start & End Session Confirmation Modal */}
      <SessionActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        sessionName={actionModal.sessionName}
        publicId={actionModal.publicId}
        isSubmitting={isSubmittingModal}
        onClose={() => setActionModal({ isOpen: false, type: null, publicId: "", sessionName: "" })}
        onConfirm={executeSessionAction}
      />
    </div>
  );
}
