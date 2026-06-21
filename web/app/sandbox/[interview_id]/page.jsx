"use client"
import React, { useState, use } from 'react';
import { WebSocketProvider } from '../../../providers/websocket-provider';
import { MonacoWorkspace } from '../../../components/editor/monaco-workspace';

import { PresenceBar } from '../../../components/editor/presence-bar';
import { ConnectionBadge } from '../../../components/editor/connection-badge';
import { InterviewTimeline } from '../../../components/editor/interview-timeline';
import { InterviewAnalytics } from '../../../components/editor/interview-analytics';

export default function SandboxPage({ params }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.interview_id;

  return (
    <SandboxContent interviewId={interviewId} />
  );
}

function SandboxContent({ interviewId }) {
  const [activeTab, setActiveTab] = useState('editor');

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 text-black">
      <header className="w-full bg-white border-b border-gray-200 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">HireNext: {interviewId}</h1>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'editor' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Code Editor
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Replay & Analytics
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionBadge />
          <span className="text-sm font-medium px-3 py-1 bg-green-100 text-green-800 rounded-full">
            Live
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col overflow-hidden">
        <WebSocketProvider interviewId={interviewId}>
          <div className="mb-2 rounded shadow-sm border border-gray-200 overflow-hidden">
            <PresenceBar />
          </div>
          
          <div className="w-full flex-1 rounded overflow-hidden border border-gray-200 shadow-lg relative bg-white">
            <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'editor' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <MonacoWorkspace />
            </div>
            <div className={`absolute inset-0 bg-gray-50 p-6 overflow-y-auto transition-opacity duration-300 ${activeTab === 'analytics' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                <InterviewTimeline interviewId={interviewId} />
                <InterviewAnalytics interviewId={interviewId} />
              </div>
            </div>
          </div>
        </WebSocketProvider>
      </main>
    </div>
  );
}
