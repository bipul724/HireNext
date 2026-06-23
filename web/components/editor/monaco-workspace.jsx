'use client';

import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../store/use-editor-store';
import { useConnectionStore } from '../../store/use-connection-store';
import { useRoomStore } from '../../store/use-room-store';
import { useExecutionStore } from '../../store/use-execution-store';
import { useWebSocket } from '../../providers/websocket-provider';
import { InterviewControlBar } from './interview-control-bar';
import { CandidateStatusPanel } from './candidate-status-panel';
import { ExecutionPanel } from './execution-panel';
import { CodingChallengePanel } from './coding-challenge-panel';
import { useCodingStore } from '../../store/use-coding-store';
import { Play } from 'lucide-react';

export function MonacoWorkspace() {
  const editorRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  // Connection locking state
  const status = useConnectionStore((state) => state.status);
  const [isOfflineLocked, setIsOfflineLocked] = useState(false);

  // Room store
  const editorLocked = useRoomStore((state) => state.editorLocked);

  // Execution store
  const isRunning = useExecutionStore((state) => state.isRunning);

  // Zustand editor state
  const code = useEditorStore((state) => state.code);
  const language = useEditorStore((state) => state.language);
  const setCode = useEditorStore((state) => state.setCode);
  const setLanguage = useEditorStore((state) => state.setLanguage);


  // Coding Challenge Mode
  const codingPhase = useCodingStore((state) => state.phase);

  // Grab WS send function & role
  const { sendMessage, role } = useWebSocket();

  // --- Offline Locking Policy ---
  useEffect(() => {
    let timeoutId;

    if (status === 'connected') {
      setIsOfflineLocked(false);
    } else {
      // 5-second grace period before offline lock
      timeoutId = setTimeout(() => {
        setIsOfflineLocked(true);
      }, 5000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status]);

  // Combined lock state: Candidate is locked if room is locked OR offline. Interviewer is only locked if offline.
  const isLocked = isOfflineLocked || (role === 'candidate' && editorLocked);

  // --- Editor Integration ---
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // When a coding round begins, bring the candidate straight into the editor:
  // focus it, reveal the top, and place the cursor on line 1.
  useEffect(() => {
    if (codingPhase !== 'coding') return;
    const editor = editorRef.current;
    if (!editor) return;
    const t = setTimeout(() => {
      try {
        editor.focus();
        editor.revealLine(1);
        editor.setPosition({ lineNumber: 1, column: 1 });
        editor.getContainerDomNode?.()?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      } catch (_) { /* editor not ready */ }
    }, 120);
    return () => clearTimeout(t);
  }, [codingPhase]);

  const handleEditorChange = (value) => {
    if (isRemoteUpdate.current || isLocked) return;
    
    const newCode = value || '';
    sendMessage('editor:change', { code: newCode, language });
    setCode(newCode);
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    if (isLocked) return;

    setLanguage(newLanguage);
    sendMessage('editor:change', { code, language: newLanguage });
  };

  const handleRunCode = () => {
    if (isLocked || isRunning) return;
    sendMessage('code:run', { code, language });
  };

  // Sync external code changes into Monaco
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentEditorValue = editor.getValue();

    if (code !== currentEditorValue) {
      isRemoteUpdate.current = true;
      const position = editor.getPosition();
      
      editor.setValue(code);
      
      if (position) editor.setPosition(position);
      isRemoteUpdate.current = false;
    }
  }, [code]);

  const fileExt = { javascript: 'js', typescript: 'ts', python: 'py', java: 'java', cpp: 'cpp', c: 'c' }[language] || 'txt';

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col overflow-hidden relative bg-white">
      {/* Dynamic Control Bar */}
      {role === 'interviewer' ? <InterviewControlBar /> : <CandidateStatusPanel />}

      {/* Top Bar for Language Selector & Run Button */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-black/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-xs font-medium text-gray-400 ml-1.5">main.{fileExt}</span>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={isLocked}
            className="ml-1 bg-[#3c3c3c] text-xs text-gray-100 rounded-md px-2.5 py-1.5 outline-none border border-white/10 hover:border-white/20 focus:border-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
          </select>
        </div>

        <button
          disabled={true}
          title="Code execution is temporarily disabled (Coming Soon)"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 cursor-not-allowed rounded-md"
        >
          <Play className="w-3.5 h-3.5 opacity-50" />
          Run Code
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-gray-400">Soon</span>
        </button>
      </div>

      {/* Pinned coding challenge (visible only during a coding round) */}
      <CodingChallengePanel />

      {/* Editor Container */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          width="100%"
          language={language}
          theme="vs-dark"
          defaultValue={code}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            readOnly: isLocked, // Hardware lock
          }}
        />

        {/* Offline Overlay */}
        {isOfflineLocked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg shadow-xl text-center max-w-sm">
              <svg className="w-12 h-12 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <h3 className="text-lg font-bold text-white mb-2">Connection Lost</h3>
              <p className="text-gray-400 text-sm">
                The editor is temporarily locked to prevent data loss. Waiting for reconnection...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Execution Output Panel */}
      <ExecutionPanel />
    </div>
  );
}
