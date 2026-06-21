import { create } from 'zustand';

export const useRoomStore = create((set) => ({
  interviewStatus: 'not_started', // not_started, running, paused, ended
  timerState: 'stopped', // stopped, running, paused
  startedAt: null,
  pausedAt: null,
  elapsedTime: 0,
  editorLocked: false,
  serverTimeOffset: 0,

  syncRoomStatus: (payload) => set((state) => {
    let offset = state.serverTimeOffset;
    if (payload.serverTime) {
      // clientTime + offset = serverTime => offset = serverTime - clientTime
      offset = payload.serverTime - Date.now();
    }
    return {
      ...state,
      ...payload,
      serverTimeOffset: offset,
    };
  }),

  // Local optimistic updates for the interviewer
  optimisticTimerStart: (now) => set({
    interviewStatus: 'running',
    timerState: 'running',
    startedAt: now,
    pausedAt: null,
  }),

  optimisticTimerPause: (now) => set((state) => ({
    timerState: 'paused',
    pausedAt: now,
    elapsedTime: state.elapsedTime + (now - state.startedAt),
  })),

  optimisticTimerResume: (now) => set({
    timerState: 'running',
    startedAt: now,
    pausedAt: null,
  }),

  optimisticTimerEnd: (now) => set((state) => ({
    interviewStatus: 'ended',
    timerState: 'stopped',
    elapsedTime: state.timerState === 'running' ? state.elapsedTime + (now - state.startedAt) : state.elapsedTime,
    startedAt: null,
    pausedAt: null,
  })),

  optimisticLock: (locked) => set({
    editorLocked: locked,
  }),
}));
