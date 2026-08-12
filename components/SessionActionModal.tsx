"use client";

import React, { useEffect } from "react";
import { Play, Square, X, AlertTriangle, Radio } from "lucide-react";

interface SessionActionModalProps {
  isOpen: boolean;
  type: "START" | "END" | null;
  sessionName: string;
  publicId: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SessionActionModal({
  isOpen,
  type,
  sessionName,
  publicId,
  isSubmitting = false,
  onClose,
  onConfirm,
}: SessionActionModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !type) return null;

  const isStart = type === "START";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal backdrop click */}
      <div
        className="absolute inset-0"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      ></div>

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 z-10 overflow-hidden transform transition-all scale-100">
        {/* Glow effect in background */}
        <div
          className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isStart ? "bg-emerald-500/20" : "bg-rose-500/20"
          }`}
        ></div>

        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center border shadow-lg ${
                isStart
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-400"
              }`}
            >
              {isStart ? (
                <Play className="h-6 w-6 fill-current animate-pulse" />
              ) : (
                <Square className="h-6 w-6 fill-current" />
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase font-mono px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                ID: {publicId}
              </span>
              <h3 className="text-lg font-extrabold text-white tracking-tight mt-1">
                {isStart ? "Start Live Session?" : "End Live Session?"}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Target Session:
          </div>
          <div className="text-sm font-bold text-white line-clamp-2">{sessionName}</div>

          <div className="pt-2 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60">
            {isStart ? (
              <p>
                Starting this session will transition its status to <strong className="text-emerald-400">LIVE</strong>. Audience members will immediately be able to scan the QR code and submit real-time feedback.
              </p>
            ) : (
              <p>
                Ending this session will mark it <strong className="text-rose-400">COMPLETED</strong>. Audience feedback submission will be permanently closed for this event.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-1 py-3 px-4 rounded-xl text-white text-xs font-extrabold flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              isStart
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30"
                : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30"
            }`}
          >
            {isStart ? (
              <>
                <Play className="h-4 w-4 fill-current shrink-0" />
                <span>{isSubmitting ? "STARTING..." : "START SESSION"}</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4 fill-current shrink-0" />
                <span>{isSubmitting ? "ENDING..." : "END SESSION"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
