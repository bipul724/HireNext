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

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col border border-gray-300 rounded overflow-hidden relative bg-white">
      {/* Dynamic Control Bar */}
      {role === 'interviewer' ? <InterviewControlBar /> : <CandidateStatusPanel />}

      {/* Top Bar for Language Selector & Run Button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-200">Editor</span>
          <select 
            value={language} 
            onChange={handleLanguageChange}
            disabled={isLocked}
            className="bg-gray-700 text-sm text-white rounded px-2 py-1 outline-none border border-gray-600 focus:border-blue-500 disabled:opacity-50"
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
          onClick={handleRunCode}
          disabled={isLocked || isRunning}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 rounded shadow-sm transition-colors"
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>

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
