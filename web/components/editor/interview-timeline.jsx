import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../../providers/websocket-provider';
import { Clock, Code, Settings, User, AlertCircle, Play, CheckCircle2, XCircle } from 'lucide-react';

export function InterviewTimeline({ interviewId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { sessionToken } = useWebSocket();

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetch(`http://localhost:8080/api/interviews/${interviewId}/timeline`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch timeline');
        const data = await res.json();
        setTimeline(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (sessionToken && interviewId) fetchTimeline();
  }, [interviewId, sessionToken]);

  if (loading) return <div className="p-4 text-gray-500">Loading timeline...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (timeline.length === 0) return <div className="p-4 text-gray-500">No events recorded yet.</div>;

  const getEventIcon = (type) => {
    if (type.includes('Joined') || type.includes('Left')) return <User className="w-4 h-4 text-blue-500" />;
    if (type.includes('Started') || type.includes('Ended')) return <Clock className="w-4 h-4 text-purple-500" />;
    if (type.includes('Execution')) {
      if (type.includes('Succeeded')) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      if (type.includes('Failed')) return <XCircle className="w-4 h-4 text-red-500" />;
      return <Play className="w-4 h-4 text-blue-400" />;
    }
    if (type.includes('Locked')) return <Settings className="w-4 h-4 text-orange-500" />;
    if (type.includes('Language')) return <Code className="w-4 h-4 text-cyan-500" />;
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col h-full">
      <h2 className="text-lg font-bold mb-4 text-gray-800">Interview Timeline</h2>
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="relative border-l border-gray-200 ml-3 space-y-6 pb-4">
          {timeline.map((event, i) => (
            <div key={i} className="relative pl-6">
              <span className="absolute -left-3 top-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                {getEventIcon(event.eventType)}
              </span>
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-900">{event.eventType}</h3>
                <span className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                <span className="font-medium text-gray-800">{event.userEmail}</span> ({event.userRole})
              </p>
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="mt-2 text-xs bg-gray-50 rounded p-2 border border-gray-100 overflow-x-auto">
                  <pre className="text-gray-600">{JSON.stringify(event.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
