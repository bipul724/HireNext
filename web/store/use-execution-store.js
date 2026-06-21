import { create } from 'zustand';

export const useExecutionStore = create((set) => ({
  isRunning: false,
  stdout: '',
  stderr: '',
  exitCode: null,
  executionTime: 0,
  executedBy: '',
  executionId: null,

  setRunning: (payload) => set({
    isRunning: true,
    stdout: '',
    stderr: '',
    exitCode: null,
    executionTime: 0,
    executedBy: payload?.by || 'Someone',
    executionId: payload?.executionId || null,
  }),

  setResult: (payload) => set({
    isRunning: false,
    stdout: payload.stdout || '',
    stderr: payload.stderr || '',
    exitCode: payload.exitCode ?? null,
    executionTime: payload.executionTime || 0,
    executedBy: payload.by || '',
    executionId: payload.executionId || null,
  }),

  clearOutput: () => set({
    stdout: '',
    stderr: '',
    exitCode: null,
    executionTime: 0,
    executedBy: '',
  }),
}));
