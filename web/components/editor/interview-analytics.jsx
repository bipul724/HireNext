import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../../../providers/websocket-provider';
import { Timer, PlayCircle, CheckCircle, XCircle, Code2, Lock } from 'lucide-react';

export function InterviewAnalytics({ interviewId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { sessionToken } = useWebSocket();

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`http://localhost:8080/api/interviews/${interviewId}/analytics`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch analytics or unauthorized');
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (sessionToken && interviewId) fetchAnalytics();
  }, [interviewId, sessionToken]);

  if (loading) return <div className="p-4 text-gray-500">Loading analytics...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!analytics) return null;

  const cards = [
    { label: 'Active Duration', value: `${Math.floor(analytics.duration / 60)}m ${analytics.duration % 60}s`, icon: <Timer className="w-5 h-5 text-purple-500" /> },
    { label: 'Total Runs', value: analytics.executionCount, icon: <PlayCircle className="w-5 h-5 text-blue-500" /> },
    { label: 'Successful Runs', value: analytics.successfulRuns, icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
    { label: 'Failed Runs', value: analytics.failedRuns, icon: <XCircle className="w-5 h-5 text-red-500" /> },
    { label: 'Language Changes', value: analytics.languageChanges, icon: <Code2 className="w-5 h-5 text-cyan-500" /> },
    { label: 'Editor Locks', value: analytics.lockCount, icon: <Lock className="w-5 h-5 text-orange-500" /> },
  ];

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col h-full">
      <h2 className="text-lg font-bold mb-6 text-gray-800">Interview Analytics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
              {card.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Participants ({analytics.participants.length})</h3>
        <div className="flex flex-wrap gap-2">
          {analytics.participants.map(email => (
            <span key={email} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
              {email}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
