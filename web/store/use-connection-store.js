import { create } from 'zustand';

export const useConnectionStore = create((set) => ({
  status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  setStatus: (status) => set({ status }),
}));
