import { create } from 'zustand';

export const useExecutionStore = create((set) => ({
  isRunning: false,
  stdout: '',
  stderr: '',
  exitCode: null,
  executionTime: 0,
  executedBy: '',


  setRunning: (payload) => set({
    isRunning: true,
    stdout: '',
    stderr: '',
    exitCode: null,
    executionTime: 0,
    executedBy: payload?.by || 'Someone',

  }),

  setResult: (payload) => set({
    isRunning: false,
    stdout: payload.stdout || '',
    stderr: payload.stderr || '',
    exitCode: payload.exitCode ?? null,
    executionTime: payload.executionTime || 0,
    executedBy: payload.by || '',

  }),

  clearOutput: () => set({
    stdout: '',
    stderr: '',
    exitCode: null,
    executionTime: 0,
    executedBy: '',
  }),
}));
