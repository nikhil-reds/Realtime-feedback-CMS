"use client";

import React, { useState } from "react";
import { TrendingUp, PieChart, Activity, Sparkles, ThumbsUp, ThumbsDown, Zap, Clock } from "lucide-react";

export interface TimeSeriesBucket {
  timestamp: string;
  timeLabel: string;
  up: number;
  down: number;
  total: number;
  cumUp: number;
  cumDown: number;
  cumTotal: number;
  cumSatisfaction: number;
  velocity: number;
}

interface RealtimeGraphsProps {
  upVotes: number;
  downVotes: number;
  totalVotes: number;
  satisfaction: number;
  timeSeries: TimeSeriesBucket[];
  isLive: boolean;
}

export default function RealtimeGraphs({
  upVotes,
  downVotes,
  totalVotes,
  satisfaction,
  timeSeries,
  isLive,
}: RealtimeGraphsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Ensure at least 5 continuous timeline buckets for smooth rendering
  let displayData: TimeSeriesBucket[] = timeSeries && timeSeries.length > 0 ? timeSeries : [];

  if (displayData.length < 2) {
    const now = new Date();
    displayData = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(now.getTime() - (4 - i) * 60 * 1000);
      const timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return {
        timestamp: d.toISOString(),
        timeLabel,
        up: 0,
        down: 0,
        total: 0,
        cumUp: i === 4 ? upVotes : 0,
        cumDown: i === 4 ? downVotes : 0,
        cumTotal: i === 4 ? totalVotes : 0,
        cumSatisfaction: i === 4 ? satisfaction : 0,
        velocity: 0,
      };
    });
  }

  // Active hover point (or default to latest point)
  const activePoint =
    hoveredIndex !== null && displayData[hoveredIndex]
      ? displayData[hoveredIndex]
      : displayData[displayData.length - 1];

  // ----------------------------------------------------
  // Graph 1: Timeline SVG calculations
  // ----------------------------------------------------
  const svgWidth = 600;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;

  const maxVal = Math.max(
    ...displayData.map((d) => Math.max(d.cumUp, d.cumDown, d.cumTotal)),
    4
  );

  const getX = (idx: number) => {
    if (displayData.length <= 1) return (svgWidth - padLeft - padRight) / 2 + padLeft;
    return padLeft + (idx / (displayData.length - 1)) * (svgWidth - padLeft - padRight);
  };

  const getY = (val: number) => {
    const chartH = svgHeight - padTop - padBottom;
    return padTop + chartH - (val / maxVal) * chartH;
  };

  // Generate SVG paths
  const posPoints = displayData.map((d, i) => `${getX(i)},${getY(d.cumUp)}`).join(" L ");
  const negPoints = displayData.map((d, i) => `${getX(i)},${getY(d.cumDown)}`).join(" L ");
  const totalPoints = displayData.map((d, i) => `${getX(i)},${getY(d.cumTotal)}`).join(" L ");

  const posArea = `M ${getX(0)},${svgHeight - padBottom} L ${posPoints} L ${getX(
    displayData.length - 1
  )},${svgHeight - padBottom} Z`;

  const negArea = `M ${getX(0)},${svgHeight - padBottom} L ${negPoints} L ${getX(
    displayData.length - 1
  )},${svgHeight - padBottom} Z`;

  // ----------------------------------------------------
  // Graph 2: Donut parameters
  // ----------------------------------------------------
  const donutRadius = 52;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const upPercent = totalVotes > 0 ? upVotes / totalVotes : 0;
  const downPercent = totalVotes > 0 ? downVotes / totalVotes : 0;

  const upOffset = 0;
  const downOffset = -(upPercent * donutCircumference);

  // ----------------------------------------------------
  // Graph 3: Feedback Velocity Histogram parameters
  // ----------------------------------------------------
  const maxVelocity = Math.max(...displayData.map((d) => d.velocity), 3);
  const peakBucket = displayData.reduce(
    (max, item) => (item.velocity > max.velocity ? item : max),
    displayData[0]
  );

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              Realtime Feedback Analytics
            </h2>
            <p className="text-xs text-slate-400">
              Live sentiment timeline, score breakdown, and reaction velocity
            </p>
          </div>
        </div>

        {isLive && (
          <span className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full pulse-glow-green self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>LIVE POLLING EVERY 2s</span>
          </span>
        )}
      </div>

      {/* 3 GRAPHS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ==================================================== */}
        {/* GRAPH 1: Live Sentiment Timeline (Line/Area Chart) */}
        {/* ==================================================== */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>1. Live Sentiment Timeline</span>
              </h3>
              <p className="text-[11px] text-slate-400">Cumulative response progression</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-300 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
              {activePoint ? activePoint.timeLabel : "Live"}
            </span>
          </div>

          {/* Legend Badges */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <div className="flex items-center space-x-3 text-[11px] font-semibold">
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500"></span>
                <span>Positive ({activePoint ? activePoint.cumUp : upVotes})</span>
              </span>
              <span className="flex items-center space-x-1.5 text-rose-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-500"></span>
                <span>Negative ({activePoint ? activePoint.cumDown : downVotes})</span>
              </span>
            </div>

            <span className="text-[11px] font-semibold text-indigo-300">
              Total: {activePoint ? activePoint.cumTotal : totalVotes}
            </span>
          </div>

          {/* Interactive SVG Chart */}
          <div className="relative w-full pt-1">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <defs>
                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines & Y-Axis Labels */}
              {[0, 0.33, 0.66, 1].map((ratio, i) => {
                const yVal = padTop + (1 - ratio) * (svgHeight - padTop - padBottom);
                const labelVal = Math.round(ratio * maxVal);
                return (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={yVal}
                      x2={svgWidth - padRight}
                      y2={yVal}
                      stroke="#334155"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={yVal + 3}
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Area Fills */}
              <path d={posArea} fill="url(#posGrad)" />
              <path d={negArea} fill="url(#negGrad)" />

              {/* Total Cumulative Path (Dashed Indigo) */}
              <path
                d={`M ${totalPoints}`}
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.7"
              />

              {/* Positive Curve Line (Emerald) */}
              <path
                d={`M ${posPoints}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Negative Curve Line (Rose) - slight offset if identical to positive for distinct visibility */}
              <path
                d={`M ${negPoints}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeDasharray={upVotes === downVotes ? "5 3" : "none"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Points */}
              {displayData.map((d, i) => {
                const cx = getX(i);
                const cyUp = getY(d.cumUp);
                const cyDown = getY(d.cumDown);
                const isHovered = hoveredIndex === i;

                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer group"
                  >
                    {/* Hover vertical guideline */}
                    {isHovered && (
                      <line
                        x1={cx}
                        y1={padTop}
                        x2={cx}
                        y2={svgHeight - padBottom}
                        stroke="#a5b4fc"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Positive circle */}
                    <circle
                      cx={cx}
                      cy={cyUp}
                      r={isHovered ? "6" : "4"}
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />

                    {/* Negative circle */}
                    <circle
                      cx={cx}
                      cy={cyDown}
                      r={isHovered ? "5" : "3.5"}
                      fill="#f43f5e"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />

                    {/* X-axis time labels */}
                    <text
                      x={cx}
                      y={svgHeight - 10}
                      fill={isHovered ? "#ffffff" : "#64748b"}
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight={isHovered ? "bold" : "normal"}
                    >
                      {d.timeLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredIndex !== null && activePoint && (
              <div className="absolute top-2 right-2 bg-slate-900/95 border border-indigo-500/50 p-2.5 rounded-xl text-xs space-y-1 shadow-2xl backdrop-blur-md z-20 pointer-events-none">
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between gap-3">
                  <span>Timestamp: {activePoint.timeLabel}</span>
                  <span className="text-violet-400 font-bold">{activePoint.cumSatisfaction}% Sat</span>
                </div>
                <div className="flex items-center space-x-3 text-xs pt-0.5">
                  <span className="text-emerald-400 font-bold">👍 +{activePoint.cumUp}</span>
                  <span className="text-rose-400 font-bold">👎 -{activePoint.cumDown}</span>
                  <span className="text-slate-300 font-bold">Total: {activePoint.cumTotal}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* GRAPH 2: Real-time Sentiment Ratio (Donut Chart) */}
        {/* ==================================================== */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <PieChart className="h-4 w-4 text-violet-400 shrink-0" />
              <span>2. Realtime Sentiment Ratio</span>
            </h3>
            <p className="text-[11px] text-slate-400">Audience approval index & split</p>
          </div>

          {/* Donut Graphic */}
          <div className="flex items-center justify-center my-auto py-2">
            <div className="relative flex items-center justify-center">
              <svg width="150" height="150" viewBox="0 0 140 140" className="transform -rotate-90">
                {/* Track */}
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  stroke="#1e293b"
                  strokeWidth="14"
                  fill="none"
                />

                {totalVotes > 0 ? (
                  <>
                    {/* Positive Slice (Emerald) */}
                    <circle
                      cx="70"
                      cy="70"
                      r={donutRadius}
                      stroke="#10b981"
                      strokeWidth="14"
                      fill="none"
                      strokeDasharray={`${upPercent * donutCircumference} ${donutCircumference}`}
                      strokeDashoffset={upOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />

                    {/* Negative Slice (Rose) */}
                    <circle
                      cx="70"
                      cy="70"
                      r={donutRadius}
                      stroke="#f43f5e"
                      strokeWidth="14"
                      fill="none"
                      strokeDasharray={`${downPercent * donutCircumference} ${donutCircumference}`}
                      strokeDashoffset={downOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </>
                ) : (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    stroke="#334155"
                    strokeWidth="14"
                    fill="none"
                    strokeDasharray="4 4"
                  />
                )}
              </svg>

              {/* Center Donut Satisfaction Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {satisfaction}%
                </span>
                <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">
                  Satisfaction
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-400 flex items-center space-x-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{upVotes} Positive ({totalVotes > 0 ? Math.round(upPercent * 100) : 0}%)</span>
              </span>
              <span className="text-rose-400 flex items-center space-x-1">
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>{downVotes} Negative ({totalVotes > 0 ? Math.round(downPercent * 100) : 0}%)</span>
              </span>
            </div>

            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
              {totalVotes > 0 ? (
                <>
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                    style={{ width: `${upPercent * 100}%` }}
                  ></div>
                  <div
                    className="bg-gradient-to-r from-rose-500 to-red-400 h-full transition-all duration-500"
                    style={{ width: `${downPercent * 100}%` }}
                  ></div>
                </>
              ) : (
                <div className="w-full bg-slate-800 h-full"></div>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* GRAPH 3: Feedback Velocity Pulse (Histogram) */}
        {/* ==================================================== */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Activity className="h-4 w-4 text-indigo-400 shrink-0 animate-pulse" />
                <span>3. Feedback Velocity Pulse</span>
              </h3>
              <p className="text-[11px] text-slate-400">Response frequency per minute window</p>
            </div>

            {peakBucket && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md flex items-center space-x-1 whitespace-nowrap">
                <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                <span>Peak: {peakBucket.velocity} v/m</span>
              </span>
            )}
          </div>

          {/* Histogram Bar Display */}
          <div className="pt-2 pb-1">
            <div className="flex items-end space-x-2 h-36 w-full px-2 border-b border-slate-800">
              {displayData.map((bucket, idx) => {
                const barHeight =
                  maxVelocity > 0
                    ? Math.max((bucket.velocity / maxVelocity) * 100, bucket.velocity > 0 ? 12 : 6)
                    : 6;

                const isHovered = hoveredIndex === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end"
                  >
                    {/* Hover Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-11 z-30 flex flex-col items-center pointer-events-none">
                        <div className="bg-slate-900 border border-indigo-500/50 text-[10px] font-bold px-2 py-1 rounded-md text-white whitespace-nowrap shadow-xl">
                          {bucket.velocity} votes ({bucket.up}👍 / {bucket.down}👎) @ {bucket.timeLabel}
                        </div>
                        <div className="w-2 h-2 bg-slate-900 transform rotate-45 border-r border-b border-indigo-500/50 -mt-1"></div>
                      </div>
                    )}

                    {/* Stacked Histogram Bar */}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-200 relative overflow-hidden flex flex-col justify-end ${
                        isHovered
                          ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-950 scale-105"
                          : ""
                      } ${
                        bucket.velocity > 0
                          ? "bg-indigo-600 shadow-md shadow-indigo-600/30"
                          : "bg-slate-800/60 hover:bg-slate-700"
                      }`}
                      style={{ height: `${barHeight}%` }}
                    >
                      {/* Positive Portion (Green bottom) */}
                      {bucket.up > 0 && (
                        <div
                          className="bg-emerald-400 w-full transition-all"
                          style={{
                            height: `${(bucket.up / Math.max(bucket.total, 1)) * 100}%`,
                          }}
                        ></div>
                      )}
                      {/* Negative Portion (Rose top) */}
                      {bucket.down > 0 && (
                        <div
                          className="bg-rose-500 w-full transition-all"
                          style={{
                            height: `${(bucket.down / Math.max(bucket.total, 1)) * 100}%`,
                          }}
                        ></div>
                      )}
                    </div>

                    {/* Time Label */}
                    <span
                      className={`text-[9px] mt-1.5 font-mono ${
                        isHovered ? "text-white font-bold" : "text-slate-500"
                      }`}
                    >
                      {bucket.timeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-slate-500" />
              <span>Session Timeline</span>
            </span>
            <span className="font-semibold text-indigo-300">
              Avg Speed: {(totalVotes / Math.max(displayData.length, 1)).toFixed(1)} votes/min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
