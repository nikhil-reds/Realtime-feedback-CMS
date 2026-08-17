"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Play,
  Pause,
  Square,
  ArrowLeft,
  Monitor,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

import SessionActionModal from "@/components/SessionActionModal";
import { SCALE, HEX, tint } from "@/lib/scale";

// --- TYPES & INTERFACES ---
interface FeedbackItem {
  id: string;
  vote: "UP" | "DOWN";
  createdAt: string;
  visitorId?: string;
  visitorCode?: string | null;
  rating?: number | null;
}

interface EventItem {
  id: string;
  eventType: string;
  createdAt: string;
  metadata?: any;
}

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
  allFeedbacks?: FeedbackItem[];
}

// --- CONSTANTS ---
const WINDOW_MIN = 20;
const TOTAL_WINDOWS = 18;
const WINDOW_MS = WINDOW_MIN * 60 * 1000;

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
};

export default function SessionControlRoomPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);

  // --- STATE ---
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackUrl, setFeedbackUrl] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"seat" | "mood">("seat");
  const [modalType, setModalType] = useState<"START" | "END" | null>(null);

  // Elapsed Time Calculation
  const [now, setNow] = useState<number>(Date.now());

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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Window Index & Time Math
  const startedAtMs = session?.startedAt ? new Date(session.startedAt).getTime() : null;
  const endedAtMs = session?.endedAt ? new Date(session.endedAt).getTime() : null;
  const isLive = session?.status === "LIVE";
  const isPaused = session?.status === "PAUSED";
  const isCompleted = session?.status === "COMPLETED";

  const elapsedMs = useMemo(() => {
    if (!startedAtMs) return 0;
    if (isCompleted && endedAtMs) return Math.max(0, endedAtMs - startedAtMs);
    return Math.max(0, now - startedAtMs);
  }, [startedAtMs, endedAtMs, isCompleted, now]);

  const currentWindowIndex = useMemo(() => {
    if (!startedAtMs) return -1;
    return Math.min(TOTAL_WINDOWS - 1, Math.floor(elapsedMs / WINDOW_MS));
  }, [startedAtMs, elapsedMs]);

  const isDayFinished = useMemo(() => {
    return startedAtMs ? elapsedMs >= TOTAL_WINDOWS * WINDOW_MS || isCompleted : false;
  }, [startedAtMs, elapsedMs, isCompleted]);

  const remainingMsInWindow = useMemo(() => {
    if (!startedAtMs || isDayFinished) return 0;
    return WINDOW_MS - (elapsedMs % WINDOW_MS);
  }, [startedAtMs, isDayFinished, elapsedMs]);

  // Real respondents only: group actual feedback rows by their assigned visitor code.
  // Also tracks each visitor's latest rating overall (for the sidebar dot color),
  // independent of which 20-minute window it landed in.
  const { visitorWindowMap, latestByCode } = useMemo(() => {
    const windowMap: Record<string, Record<number, number>> = {};
    const latest: Record<string, number> = {};
    if (!session) return { visitorWindowMap: windowMap, latestByCode: latest };

    const raw = session.allFeedbacks || session.feedbacks || [];
    const items = [...raw].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    items.forEach((item) => {
      if (!item.visitorCode) return; // skip legacy rows submitted before visitor codes existed
      const ratingVal = typeof item.rating === "number" ? item.rating : item.vote === "UP" ? 2 : 6;
      latest[item.visitorCode] = ratingVal;

      if (!startedAtMs) return;
      const itemTime = new Date(item.createdAt).getTime();
      const voteElapsed = itemTime - startedAtMs;
      if (voteElapsed < 0) return;
      const w = Math.min(TOTAL_WINDOWS - 1, Math.floor(voteElapsed / WINDOW_MS));
      if (!windowMap[item.visitorCode]) windowMap[item.visitorCode] = {};
      windowMap[item.visitorCode][w] = ratingVal;
    });

    return { visitorWindowMap: windowMap, latestByCode: latest };
  }, [session, startedAtMs]);

  // Real roster: grows only as real people submit feedback (no pre-seeded demo entries)
  const realRoster = useMemo(() => Object.keys(latestByCode), [latestByCode]);

  // Derived Series, Averages & Distribution
  const seriesFor = (code: string) => {
    const v = visitorWindowMap[code] || {};
    const out: (number | null)[] = [];
    for (let w = 0; w < TOTAL_WINDOWS; w++) {
      out.push(v[w] !== undefined ? v[w] : null);
    }
    return out;
  };

  const averages = useMemo(() => {
    const out: (number | null)[] = [];
    for (let w = 0; w < TOTAL_WINDOWS; w++) {
      let sum = 0,
        n = 0;
      for (const c of realRoster) {
        const v = visitorWindowMap[c]?.[w];
        if (v) {
          sum += v;
          n++;
        }
      }
      out.push(n ? sum / n : null);
    }
    return out;
  }, [realRoster, visitorWindowMap]);

  const distribution = (w: number) => {
    const d = [0, 0, 0, 0, 0, 0, 0];
    for (const c of realRoster) {
      const v = visitorWindowMap[c]?.[w];
      if (v) d[v - 1]++;
    }
    return d;
  };

  const respondedInWindowCount = useMemo(() => {
    const w = Math.max(0, currentWindowIndex);
    return realRoster.filter((c) => visitorWindowMap[c]?.[w] !== undefined).length;
  }, [realRoster, visitorWindowMap, currentWindowIndex]);

  const currentRoomAvg = useMemo(() => {
    const w = currentWindowIndex >= 0 ? currentWindowIndex : 0;
    return averages[w];
  }, [currentWindowIndex, averages]);

  // Status Handlers
  const handleStartSession = async () => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/sessions/${publicId}/start`, { method: "POST" });
      const data = await res.json();
      if (data.success) fetchSessionData();
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setUpdatingStatus(false);
      setModalType(null);
    }
  };

  const handlePauseSession = async () => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/sessions/${publicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED" }),
      });
      const data = await res.json();
      if (data.success) fetchSessionData();
    } catch (err) {
      console.error("Failed to pause session:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleResumeSession = async () => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/sessions/${publicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LIVE" }),
      });
      const data = await res.json();
      if (data.success) fetchSessionData();
    } catch (err) {
      console.error("Failed to resume session:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEndSession = async () => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/sessions/${publicId}/end`, { method: "POST" });
      const data = await res.json();
      if (data.success) fetchSessionData();
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

  // Rail Roster Sorting (real respondents only, in join order by default)
  const sortedRoster = useMemo(() => {
    const list = realRoster.map((c) => ({ c }));
    if (sortMode === "mood") {
      const getLastMood = (o: { c: string }) => {
        const s = seriesFor(o.c).filter((v) => v !== null);
        return s.length ? (s[s.length - 1] as number) : -1;
      };
      list.sort((a, b) => getLastMood(b) - getLastMood(a));
    }
    return list;
  }, [realRoster, sortMode, visitorWindowMap]);

  if (loading && !session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="font-mono text-xs tracking-widest uppercase">Loading PULSE Room Signal...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 max-w-md mx-auto my-12 border border-[#26292D] bg-[#101113] rounded-sm text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="font-mono text-sm font-bold text-[#E9EBED] tracking-widest uppercase">Session Not Found</h2>
        <p className="text-xs text-[#7A8085]">
          No dynamic session found with public ID <span className="font-mono text-white">{publicId}</span>.
        </p>
        <Link
          href="/admin/sessions"
          className="inline-flex items-center space-x-2 border border-[#26292D] hover:border-[#34383D] text-[#E9EBED] font-mono text-xs px-4 py-2 rounded-sm uppercase tracking-wider"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  // Active status color tint
  const activeWindowNum = currentWindowIndex >= 0 ? currentWindowIndex : 0;
  const distArr = distribution(activeWindowNum);
  const activeResp = respondedInWindowCount;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A0B0C] text-[#E9EBED] font-sans overflow-hidden">
      {/* ─── HEADER WITH TOP NAVBAR CONTROL ACTIONS (hactions) ─── */}
      <header className="flex-none flex items-center justify-between border-b border-[#1B1D20] bg-[#0A0B0C] h-[62px] px-0 select-none overflow-x-auto">
        <div className="flex items-center h-full min-w-0">
          {/* Brand Cell */}
          <div className="px-4.5 h-full flex flex-col justify-center gap-1 border-r border-[#1B1D20] min-w-[170px]">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[11px] font-bold tracking-[0.42em] text-[#E9EBED]">PULSE</div>
              <Link
                href="/admin/sessions"
                className="font-mono text-[9px] text-[#7A8085] hover:text-[#E9EBED] uppercase tracking-wider underline decoration-dotted"
                title="Back to All Sessions"
              >
                &larr; Sessions
              </Link>
            </div>
            <div className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155] truncate max-w-[190px]">
              {session.name}
            </div>
          </div>

          {/* Window Cell */}
          <div className="px-4.5 h-full flex flex-col justify-center gap-0.5 border-r border-[#1B1D20]">
            <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">Window</span>
            <span className="font-mono text-[15px] font-medium tabular-nums leading-none">
              {currentWindowIndex < 0 ? "—" : String(currentWindowIndex + 1).padStart(2, "0")}
              <span className="text-[#4C5155]">/{TOTAL_WINDOWS}</span>
            </span>
          </div>

          {/* Countdown Cell */}
          <div className="px-4.5 h-full flex flex-col justify-center gap-0.5 border-r border-[#1B1D20]">
            <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">
              {isDayFinished ? "Day complete" : isPaused ? "Paused" : "Closes in"}
            </span>
            <span className="font-mono text-[15px] font-medium tabular-nums leading-none text-[#E9EBED]">
              {startedAtMs && !isDayFinished ? mmss(remainingMsInWindow) : "--:--"}
            </span>
          </div>

          {/* Marked Count Cell */}
          <div className="px-4.5 h-full flex flex-col justify-center gap-0.5 border-r border-[#1B1D20] hidden sm:flex">
            <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">Marked this window</span>
            <span className="font-mono text-[15px] font-medium tabular-nums leading-none">
              {activeResp}
              <span className="text-[#4C5155]">/{realRoster.length}</span>
            </span>
          </div>

          {/* Room Average Cell */}
          <div className="px-4.5 h-full flex flex-col justify-center gap-0.5 border-r border-[#1B1D20] hidden md:flex">
            <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">Room average</span>
            <span
              className="font-mono text-[15px] font-medium tabular-nums leading-none"
              style={{ color: currentRoomAvg ? tint(currentRoomAvg) : "#4C5155" }}
            >
              {currentRoomAvg ? currentRoomAvg.toFixed(2) : "—"}
            </span>
          </div>
        </div>

        {/* ─── SHIFTED PLAY & PAUSE ACTION CONTROLS ON NAVBAR HEADER (hactions) ─── */}
        <div className="flex items-center gap-2 px-4.5">
          {/* Status Badge */}
          <span className="font-mono text-[9px] tracking-[0.14em] uppercase border border-[#26292D] rounded-[2px] px-2 py-1 text-[#7A8085] hidden lg:inline-block">
            {session.status}
          </span>

          {/* Join Screen Button */}
          <button
            onClick={() => setJoinOpen(true)}
            className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#26292D] hover:border-[#34383D] rounded-[2px] px-3 py-1.5 text-[#7A8085] hover:text-[#E9EBED] transition-colors whitespace-nowrap cursor-pointer"
          >
            Join screen
          </button>

          {/* SHIFTED PLAY/PAUSE/START/RESUME/END CONTROL BUTTONS */}
          {session.status === "DRAFT" && (
            <button
              onClick={handleStartSession}
              disabled={updatingStatus}
              className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#34383D] bg-[#101113] hover:bg-[#1B1D20] text-[#E9EBED] rounded-[2px] px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current text-emerald-400" />
              <span>Start Session</span>
            </button>
          )}

          {isLive && (
            <>
              <button
                onClick={handlePauseSession}
                disabled={updatingStatus}
                className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#26292D] hover:border-[#34383D] text-[#7A8085] hover:text-[#E9EBED] rounded-[2px] px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <Pause className="h-3 w-3 fill-current text-amber-400" />
                <span>Pause</span>
              </button>
              <button
                onClick={() => setModalType("END")}
                disabled={updatingStatus}
                className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#34383D] text-[#E8434B] hover:bg-rose-950/30 rounded-[2px] px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>End</span>
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                onClick={handleResumeSession}
                disabled={updatingStatus}
                className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#34383D] bg-[#101113] hover:bg-[#1B1D20] text-[#2FD98A] rounded-[2px] px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Resume</span>
              </button>
              <button
                onClick={() => setModalType("END")}
                disabled={updatingStatus}
                className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#34383D] text-[#E8434B] hover:bg-rose-950/30 rounded-[2px] px-3 py-1.5 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>End</span>
              </button>
            </>
          )}

          {isCompleted && (
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#26292D] rounded-[2px] px-3 py-1.5 text-indigo-400 bg-[#101113]">
              Completed
            </span>
          )}

          {/* Open Display Projector Link */}
          <Link
            href={`/admin/sessions/${publicId}/display`}
            target="_blank"
            className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#26292D] hover:border-[#34383D] rounded-[2px] px-3 py-1.5 text-[#7A8085] hover:text-[#E9EBED] transition-colors whitespace-nowrap hidden sm:inline-flex items-center gap-1.5"
          >
            <Monitor className="h-3 w-3 text-indigo-400" />
            <span>Display</span>
          </Link>
        </div>
      </header>

      {/* ─── TICK COUNTDOWN BAR ─── */}
      <div className="flex-none h-[2px] bg-[#1B1D20] relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[#34383D] transition-[width] duration-1000 linear"
          style={{
            width:
              startedAtMs && !isDayFinished
                ? `${(100 - (remainingMsInWindow / WINDOW_MS) * 100).toFixed(2)}%`
                : "0%",
          }}
        />
      </div>

      {/* ─── HOST BODY (RAIL SIDEBAR + CHARTS STACK) ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Rail Sidebar */}
        <aside className="w-[300px] flex-none border-r border-[#1B1D20] bg-[#0C0D0F] flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1B1D20] flex-none">
            <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">
              Respondents · {realRoster.length}
            </span>
            <div className="flex items-center gap-[2px]">
              <button
                onClick={() => setSortMode("seat")}
                className={`font-mono text-[9.5px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded-[2px] border ${
                  sortMode === "seat" ? "text-[#E9EBED] border-[#26292D]" : "text-[#4C5155] border-transparent hover:text-[#7A8085]"
                }`}
              >
                Order
              </button>
              <button
                onClick={() => setSortMode("mood")}
                className={`font-mono text-[9.5px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded-[2px] border ${
                  sortMode === "mood" ? "text-[#E9EBED] border-[#26292D]" : "text-[#4C5155] border-transparent hover:text-[#7A8085]"
                }`}
              >
                Mood
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1B1D20] scrollbar-thin">
            {sortedRoster.length === 0 ? (
              <div className="flex-1 flex items-center justify-center px-4 py-12 text-center">
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#4C5155]">
                  Waiting for the first response&hellip;
                </span>
              </div>
            ) : (
              sortedRoster.map(({ c }) => {
                const series = seriesFor(c);
                const activeVal = currentWindowIndex >= 0 ? series[currentWindowIndex] : null;
                const dotColor = latestByCode[c] ? HEX[latestByCode[c] - 1] : "#4C5155";

                return (
                  <div key={c} className="px-3.5 py-2.5 hover:bg-[#0F1012] transition-colors group">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: dotColor }} />
                      <span className="font-mono text-[10.5px] tracking-[0.09em] text-[#7A8085]">{c}</span>
                      <span
                        className="ml-auto font-mono text-[10px] tracking-[0.06em]"
                        style={{ color: activeVal ? HEX[activeVal - 1] : "#4C5155" }}
                      >
                        {activeVal ? SCALE[activeVal - 1].t : "no mark"}
                      </span>
                    </div>

                    {/* Sparkline track across 18 windows */}
                    <div className="relative h-[26px] grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${TOTAL_WINDOWS}, 1fr)` }}>
                      {series.map((val, k) => (
                        <div
                          key={k}
                          className={`rounded-[1.5px] bg-white/[0.035] ${k === currentWindowIndex ? "outline outline-1 outline-[#34383D]" : ""}`}
                          style={val ? { background: HEX[val - 1], opacity: 0.58 } : {}}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Charts Main Stack */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0A0B0C]">
          {/* Panel 1: All Signals */}
          <section className="flex-[1.12] flex flex-col min-h-0 relative border-b border-[#1B1D20]">
            <div className="flex items-center gap-3.5 px-4.5 py-2.5 flex-none">
              <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">
                All signals · every student, every window
              </span>
              <div className="ml-auto flex items-center gap-3.5">
                <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">This window</span>
                {/* Distribution Bar */}
                <div className="flex gap-[2px] h-[9px] w-[190px]">
                  {distArr.map((n, idx) => (
                    <i
                      key={idx}
                      className="rounded-[1px] transition-all duration-300"
                      style={{
                        flexBasis: activeResp ? `${(n / activeResp) * 100}%` : "0%",
                        background: HEX[idx],
                        opacity: n ? 0.9 : 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* SVG All Signals Graph */}
            <div className="flex-1 min-h-0 relative w-full h-full p-2">
              <svg className="w-full h-full" preserveAspectRatio="none">
                {/* Scale Bands & Y Grid Labels */}
                {SCALE.map((s, k) => {
                  const yPct = (k / 6) * 82 + 9;
                  return (
                    <g key={s.n}>
                      <rect x="110" y={`${yPct - 5}%`} width="82%" height="10%" fill={s.hex} opacity="0.04" />
                      <text
                        x="100"
                        y={`${yPct + 1}%`}
                        textAnchor="end"
                        fill={s.hex}
                        opacity="0.75"
                        fontFamily="Inter, sans-serif"
                        fontSize="10.5"
                      >
                        {s.t}
                      </text>
                      <line x1="110" y1={`${yPct}%`} x2="96%" y2={`${yPct}%`} stroke="#FFFFFF" strokeOpacity="0.05" />
                    </g>
                  );
                })}

                {/* X Axis Window Numbers */}
                {Array.from({ length: TOTAL_WINDOWS }).map((_, idx) => {
                  const xPct = (idx / (TOTAL_WINDOWS - 1)) * 80 + 115;
                  return (
                    <text
                      key={idx}
                      x={`${xPct}`}
                      y="96%"
                      textAnchor="middle"
                      fill="#4C5155"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="8.5"
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </text>
                  );
                })}

                {/* Active Window Marker */}
                {currentWindowIndex >= 0 && (
                  <line
                    x1={`${(currentWindowIndex / (TOTAL_WINDOWS - 1)) * 80 + 115}`}
                    y1="5%"
                    x2={`${(currentWindowIndex / (TOTAL_WINDOWS - 1)) * 80 + 115}`}
                    y2="92%"
                    stroke="#34383D"
                    strokeDasharray="2 3"
                  />
                )}
              </svg>

              {session.totalVotes === 0 && (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.16em] uppercase text-[#4C5155]">
                  waiting for the first marks
                </div>
              )}
            </div>
          </section>

          {/* Panel 2: Room Average */}
          <section className="flex-[0.88] flex flex-col min-h-0 relative">
            <div className="flex items-center gap-3.5 px-4.5 py-2.5 flex-none">
              <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">
                Room average · one line
              </span>
              <div className="ml-auto flex items-center gap-3.5">
                <span className="font-mono text-[24px] font-medium leading-none tabular-nums text-[#E9EBED]">
                  {currentRoomAvg ? currentRoomAvg.toFixed(2) : "—"}
                </span>
                <span className="font-mono text-[9.5px] text-[#7A8085] uppercase tracking-wider max-w-[16ch] text-right">
                  {currentRoomAvg ? SCALE[Math.round(currentRoomAvg) - 1].t : "no marks yet"}
                </span>
              </div>
            </div>

            {/* SVG Room Average Line Graph */}
            <div className="flex-1 min-h-0 relative w-full h-full p-2">
              <svg className="w-full h-full" preserveAspectRatio="none">
                {/* Horizontal reference lines for 1, 4, 7 */}
                {[1, 4, 7].map((v) => {
                  const yPct = ((v - 1) / 6) * 75 + 12;
                  return (
                    <g key={v}>
                      <line x1="110" y1={`${yPct}%`} x2="96%" y2={`${yPct}%`} stroke="#FFFFFF" strokeOpacity="0.055" />
                      <text
                        x="100"
                        y={`${yPct + 1}%`}
                        textAnchor="end"
                        fill="#4C5155"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="9"
                      >
                        {v}
                      </text>
                    </g>
                  );
                })}

                <text x="100" y="10%" textAnchor="end" fill="#4C5155" fontFamily="JetBrains Mono, monospace" fontSize="8.5" letterSpacing="1.4">
                  KEEP GOING
                </text>
                <text x="100" y="90%" textAnchor="end" fill="#4C5155" fontFamily="JetBrains Mono, monospace" fontSize="8.5" letterSpacing="1.4">
                  LOSING THEM
                </text>
              </svg>

              {averages.every((v) => v === null) && (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.16em] uppercase text-[#4C5155]">
                  the average appears after the first window closes
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ─── JOIN OVERLAY MODAL ─── */}
      {joinOpen && (
        <div className="fixed inset-0 bg-[#0A0B0C] z-50 flex flex-col">
          <header className="flex-none flex items-center justify-between border-b border-[#1B1D20] bg-[#0A0B0C] h-[62px] px-4.5 select-none">
            <div className="flex flex-col justify-center gap-0.5">
              <div className="font-mono text-[11px] font-bold tracking-[0.42em] text-[#E9EBED]">PULSE</div>
              <div className="font-mono text-[9.5px] font-medium tracking-[0.16em] uppercase text-[#4C5155]">
                Join screen · project this
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setJoinOpen(false)}
                className="font-mono text-[10px] tracking-[0.12em] uppercase border border-[#34383D] bg-[#101113] hover:bg-[#1B1D20] text-[#E9EBED] rounded-[2px] px-4 py-2 transition-colors cursor-pointer"
              >
                Back to board
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="bg-[#E9EBED] p-4 rounded-[3px]">
              <QRCodeSVG value={feedbackUrl || `http://localhost:3000/feedback/${publicId}`} size={280} level="L" />
            </div>

            <div className="text-center space-y-2 max-w-md">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[#4C5155]">
                Scan, or type this in any browser
              </div>
              <div className="font-mono text-[16px] tracking-[0.06em] text-[#E9EBED] break-all">
                {feedbackUrl}
              </div>
              <button
                onClick={handleCopyUrl}
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#7A8085] hover:text-[#E9EBED]"
              >
                {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedLink ? "Copied Link" : "Copy Link"}</span>
              </button>
            </div>

            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[#4C5155] max-w-sm text-center pt-4 border-t border-[#1B1D20]">
              Each student is assigned a code automatically the moment they submit their first response &mdash; no need to hand out codes in advance.
            </p>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {modalType && (
        <SessionActionModal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          onConfirm={modalType === "START" ? handleStartSession : handleEndSession}
          sessionName={session.name}
          sessionPublicId={session.publicId}
          actionType={modalType}
          loading={updatingStatus}
        />
      )}
    </div>
  );
}
