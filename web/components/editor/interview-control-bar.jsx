import React, { useEffect, useState } from 'react';
import { useRoomStore } from '../../store/use-room-store';
import { useWebSocket } from '../../providers/websocket-provider';
import { Lock, Unlock, Clock, Play, Pause, Square } from 'lucide-react';

export function InterviewControlBar() {
  const { interviewStatus, timerState, startedAt, elapsedTime, editorLocked, serverTimeOffset, optimisticTimerStart, optimisticTimerPause, optimisticTimerResume, optimisticTimerEnd, optimisticLock } = useRoomStore();
  const { sendMessage } = useWebSocket();
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

  const getSyncedNow = () => Date.now() + serverTimeOffset;

  const handleStart = () => {
    sendMessage('timer:start', {});
    optimisticTimerStart(getSyncedNow());
  };

  const handlePause = () => {
    sendMessage('timer:pause', {});
    optimisticTimerPause(getSyncedNow());
  };

  const handleResume = () => {
    sendMessage('timer:resume', {});
    optimisticTimerResume(getSyncedNow());
  };

  const handleEnd = () => {
    sendMessage('timer:end', {});
    optimisticTimerEnd(getSyncedNow());
  };

  const handleLockToggle = () => {
    const newLockState = !editorLocked;
    sendMessage(newLockState ? 'room:lock' : 'room:unlock', {});
    optimisticLock(newLockState);
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
      <div className="flex items-center gap-2 px-3 py-1 bg-white rounded shadow-sm border border-indigo-200">
        <Clock className={`w-4 h-4 ${timerState === 'running' ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`} />
        <span className="font-mono font-bold text-indigo-900">{formatTime(displayTime)}</span>
      </div>

      <div className="flex items-center gap-2">
        {interviewStatus === 'not_started' && (
          <button onClick={handleStart} className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm transition-colors">
            <Play className="w-4 h-4" /> Start Interview
          </button>
        )}
        
        {interviewStatus === 'running' && (
          <button onClick={handlePause} className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded shadow-sm transition-colors">
            <Pause className="w-4 h-4" /> Pause
          </button>
        )}

        {interviewStatus === 'paused' && (
          <button onClick={handleResume} className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded shadow-sm transition-colors">
            <Play className="w-4 h-4" /> Resume
          </button>
        )}

        {(interviewStatus === 'running' || interviewStatus === 'paused') && (
          <button onClick={handleEnd} className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded shadow-sm transition-colors">
            <Square className="w-4 h-4" /> End Interview
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button 
          onClick={handleLockToggle}
          className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded shadow-sm transition-colors border ${
            editorLocked 
              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {editorLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          {editorLocked ? 'Unlock Editor' : 'Lock Editor'}
        </button>
      </div>
    </div>
  );
}
