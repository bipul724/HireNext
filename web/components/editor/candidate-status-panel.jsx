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
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center gap-2 px-3 py-1 bg-white rounded shadow-sm border border-slate-200">
        <Clock className={`w-4 h-4 ${timerState === 'running' ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
        <span className="font-mono font-medium text-slate-700">{formatTime(displayTime)}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${
          interviewStatus === 'not_started' ? 'bg-slate-100 text-slate-600' :
          interviewStatus === 'running' ? 'bg-green-100 text-green-700' :
          interviewStatus === 'paused' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {interviewStatus.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {editorLocked ? (
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded">
            <Lock className="w-3.5 h-3.5" />
            Editor Locked
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500">
            <Unlock className="w-3.5 h-3.5" />
            Editor Unlocked
          </div>
        )}
      </div>
    </div>
  );
}
