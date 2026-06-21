'use client';

import React from 'react';
import { useConnectionStore } from '../../store/use-connection-store';

export function ConnectionBadge() {
  const status = useConnectionStore((state) => state.status);

  // Map status to styles and text
  const config = {
    disconnected: { color: 'bg-red-500', text: 'Offline', ping: false },
    connecting: { color: 'bg-yellow-500', text: 'Connecting...', ping: false },
    reconnecting: { color: 'bg-yellow-500', text: 'Reconnecting...', ping: true },
    connected: { color: 'bg-green-500', text: 'Connected', ping: true },
  };

  const current = config[status] || config.disconnected;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm text-xs font-medium text-gray-700">
      <span className="relative flex h-2 w-2">
        {current.ping && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${current.color} opacity-75`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.color}`}></span>
      </span>
      {current.text}
    </div>
  );
}
