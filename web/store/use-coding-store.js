import { create } from 'zustand';

// Coding Challenge Mode state.
//
// Why Zustand (not local state or context):
//  - The challenge is presented at the PAGE level (the Vapi message handler) but
//    consumed inside the editor column (CodingChallengePanel), which lives under
//    a different provider subtree. A singleton store crosses that boundary
//    cleanly — exactly how editor/room/presence state already works here.
//  - The authoritative source of truth is the WS server + Redis (see
//    ws-server roomState `room:{id}:coding`). This store mirrors that via
//    `syncCoding`, and offers optimistic actions for instant UI feedback.
//
// phase: 'idle' | 'presented' | 'coding' | 'ended'
export const useCodingStore = create((set) => ({
  phase: 'idle',
  challenge: null,        // { title, description, difficulty, timeLimit(seconds) }
  startedAt: null,        // server-time ms when the candidate began coding
  serverTimeOffset: 0,    // clientTime + offset = serverTime
  showModal: false,

  // Authoritative update from the server (coding:sync). Always wins.
  syncCoding: (payload) => set((state) => {
    if (!payload) return state;
    let offset = state.serverTimeOffset;
    if (payload.serverTime) offset = payload.serverTime - Date.now();
    const phase = payload.phase || 'idle';
    return {
      phase,
      challenge: payload.challenge ?? null,
      startedAt: payload.startedAt ?? null,
      serverTimeOffset: offset,
      showModal: phase === 'presented', // modal only before coding starts
    };
  }),

  // Optimistic local updates (each is mirrored to the server over the WS).
  presentChallenge: (challenge) =>
    set({ phase: 'presented', challenge, startedAt: null, showModal: true }),

  beginCoding: () =>
    set((s) => ({ phase: 'coding', startedAt: Date.now() + s.serverTimeOffset, showModal: false })),

  endCoding: () => set({ phase: 'ended', showModal: false }),



  reset: () => set({ phase: 'idle', challenge: null, startedAt: null, showModal: false }),
}));
