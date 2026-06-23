'use client';

import React, { useEffect, useRef } from 'react';
import { Code2, Clock, Zap, X } from 'lucide-react';
import { useCodingStore } from '../../store/use-coding-store';
import { wsClient } from '../../lib/websocket/client';

const difficultyStyles = {
  Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Hard: 'bg-red-50 text-red-700 border-red-200',
};

const formatLimit = (seconds) => {
  const m = Math.floor((Number(seconds) || 0) / 60);
  return `${m} min`;
};

// Shown when the AI presents a coding challenge (phase === 'presented').
// "Start Coding" begins the server-authoritative timer.
export function CodingChallengeModal() {
  const showModal = useCodingStore((s) => s.showModal);
  const challenge = useCodingStore((s) => s.challenge);
  const beginCoding = useCodingStore((s) => s.beginCoding);
  const startBtnRef = useRef(null);

  // Move focus to the primary action when the modal opens (accessibility).
  useEffect(() => {
    if (showModal && startBtnRef.current) {
      const t = setTimeout(() => startBtnRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [showModal]);

  if (!showModal || !challenge) return null;

  const handleStart = () => {
    beginCoding();                         // optimistic
    try { wsClient.sendMessage('coding:start', {}); } catch (_) {}
  };

  const diff = difficultyStyles[challenge.difficulty] || difficultyStyles.Medium;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coding-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-white/60 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <Code2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-indigo-100 text-xs font-semibold uppercase tracking-wide">Coding Challenge Started</p>
              <h2 id="coding-modal-title" className="text-xl font-bold text-white leading-tight">{challenge.title}</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${diff}`}>
              <Zap className="h-3.5 w-3.5" />
              {challenge.difficulty || 'Medium'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Clock className="h-3.5 w-3.5" />
              {formatLimit(challenge.timeLimit)}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto pr-1">
            <h3 className="text-sm font-semibold text-slate-700 mb-1.5">Problem Statement</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {challenge.description || 'The interviewer will describe the problem aloud.'}
            </p>
          </div>

          <button
            ref={startBtnRef}
            onClick={handleStart}
            className="w-full mt-6 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            Start Coding
          </button>
          <p className="text-center text-xs text-slate-400 mt-3">
            The timer begins when you click Start Coding.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CodingChallengeModal;
