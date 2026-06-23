import React, { useEffect, useState } from 'react';
import { useRoomStore } from '../../store/use-room-store';
import { Lock, Unlock, Clock, AlertCircle } from 'lucide-react';

export function CandidateStatusPanel() {
  const { interviewStatus, timerState, startedAt, elapsedTime, editorLocked, serverTimeOffset } = useRoomStore();
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    let interval;
    if (timerState === 'running') {
      interval = setInterval(() => {
        const syncedNow = Date.now() + serverTimeOffset;
        setDisplayTime(elapsedTime + (syncedNow - startedAt));
      }, 1000);
    } else {
      setDisplayTime(elapsedTime);
    }
    return () => clearInterval(interval);
  }, [timerState, elapsedTime, startedAt, serverTimeOffset]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-100">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
        <Clock className={`w-4 h-4 ${timerState === 'running' ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`} />
        <span className="font-mono text-sm font-semibold text-slate-700 tabular-nums">{formatTime(displayTime)}</span>
      </div>

      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
        interviewStatus === 'not_started' ? 'bg-slate-100 text-slate-500' :
        interviewStatus === 'running' ? 'bg-emerald-50 text-emerald-600' :
        interviewStatus === 'paused' ? 'bg-amber-50 text-amber-600' :
        'bg-red-50 text-red-600'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          interviewStatus === 'not_started' ? 'bg-slate-400' :
          interviewStatus === 'running' ? 'bg-emerald-500 animate-pulse' :
          interviewStatus === 'paused' ? 'bg-amber-500' : 'bg-red-500'
        }`} />
        {interviewStatus.replace('_', ' ')}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        {editorLocked ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
            <Lock className="w-3.5 h-3.5" />
            Editor Locked
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-400">
            <Unlock className="w-3.5 h-3.5" />
            Editor Unlocked
          </div>
        )}
      </div>
    </div>
  );
}
