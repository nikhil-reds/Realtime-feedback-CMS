"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, Download, QrCode, Sparkles } from "lucide-react";

export default function SessionQRPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackUrl, setFeedbackUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFeedbackUrl(`${window.location.origin}/feedback/${publicId}`);
    }
  }, [publicId]);

  useEffect(() => {
    fetch(`/api/sessions/${publicId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSession(data.session);
      })
      .finally(() => setLoading(false));
  }, [publicId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">
        Generating printable QR code...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-12 space-y-6">
      {/* Screen-only Controls */}
      <div className="max-w-xl mx-auto flex items-center justify-between print:hidden">
        <Link
          href={`/admin/sessions/${publicId}`}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Control Room</span>
        </Link>

        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg transition-all"
        >
          <Printer className="h-4 w-4" />
          <span>Print QR Flyer</span>
        </button>
      </div>

      {/* Printable Flyer Card */}
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-8 shadow-2xl print:shadow-none print:border-2 print:border-black print:bg-white print:text-black">
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 print:text-indigo-700">
            {session?.location || "Experience Center"}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white print:text-black">
            {session?.name || "Feedback Session"}
          </h1>
          <p className="text-sm text-slate-300 print:text-gray-700 font-medium">
            Speaker: <strong className="text-indigo-300 print:text-black">{session?.speaker}</strong>
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-6 bg-white rounded-2xl inline-block shadow-xl border border-slate-200">
          <QRCodeSVG
            value={feedbackUrl || `https://example.com/feedback/${publicId}`}
            size={260}
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="space-y-2">
          <div className="text-lg font-bold text-white print:text-black flex items-center justify-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-400 print:text-black" />
            <span>Scan Me to Share Your Feedback</span>
          </div>
          <p className="text-xs text-slate-400 print:text-gray-600 font-mono">
            {feedbackUrl}
          </p>
          <p className="text-xs text-slate-500 print:text-gray-500 pt-2">
            Session ID: {publicId}
          </p>
        </div>
      </div>
    </div>
  );
}
