'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Code2, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useCodingStore } from '../../store/use-coding-store';
import { wsClient } from '../../lib/websocket/client';

const difficultyStyles = {
  Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Hard: 'bg-red-50 text-red-700 border-red-200',
};

const fmt = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

// Pinned panel above the Monaco editor while a coding round is active.
// The timer is derived from the server-authoritative `startedAt`, so it is
// correct after refresh/reconnect (no client drift).
export function CodingChallengePanel() {
  const phase = useCodingStore((s) => s.phase);
  const challenge = useCodingStore((s) => s.challenge);
  const startedAt = useCodingStore((s) => s.startedAt);
  const serverTimeOffset = useCodingStore((s) => s.serverTimeOffset);

  const [timeLeft, setTimeLeft] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const endSentRef = useRef(false);

  useEffect(() => {
    if (phase !== 'coding' || !startedAt || !challenge?.timeLimit) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const syncedNow = Date.now() + serverTimeOffset;
      const elapsed = (syncedNow - startedAt) / 1000;
      const left = challenge.timeLimit - elapsed;
      setTimeLeft(left);
      // Auto-end exactly once when the time budget is exhausted.
      if (left <= 0 && !endSentRef.current) {
        endSentRef.current = true;
        useCodingStore.getState().endCoding();
        try { wsClient.sendMessage('coding:end', {}); } catch (_) {}
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, startedAt, serverTimeOffset, challenge]);

  // Only render during an active coding round.
  if (phase !== 'coding' || !challenge) return null;

  const diff = difficultyStyles[challenge.difficulty] || difficultyStyles.Medium;
  const low = timeLeft !== null && timeLeft <= 60;

  return (
    <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-white">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg shadow-sm shrink-0">
            <Code2 className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800 truncate">{challenge.title}</h3>
          <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${diff}`}>
            <Zap className="h-3 w-3" />
            {challenge.difficulty || 'Medium'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-sm font-bold tabular-nums border ${low ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-slate-700 border-slate-200'}`}>
            {low ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5 text-indigo-500" />}
            {timeLeft === null ? '--:--' : fmt(timeLeft)}
          </div>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-expanded={!collapsed}
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {/* Problem statement (scrollable) */}
      {!collapsed && (
        <div className="px-4 pb-3 max-h-40 overflow-y-auto">
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {challenge.description || 'The interviewer will describe the problem aloud.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default CodingChallengePanel;
