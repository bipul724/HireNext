'use client';

import React from 'react';
import { useConnectionStore } from '../../store/use-connection-store';

export function ConnectionBadge() {
  const status = useConnectionStore((state) => state.status);

  // Map status to styles and text
  const config = {
    disconnected: { color: 'bg-red-500', text: 'Offline', ping: false, chip: 'bg-red-50 text-red-600 border-red-100' },
    connecting: { color: 'bg-amber-500', text: 'Connecting…', ping: false, chip: 'bg-amber-50 text-amber-600 border-amber-100' },
    reconnecting: { color: 'bg-amber-500', text: 'Reconnecting…', ping: true, chip: 'bg-amber-50 text-amber-600 border-amber-100' },
    connected: { color: 'bg-emerald-500', text: 'Connected', ping: true, chip: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  };

  const current = config[status] || config.disconnected;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-colors ${current.chip}`}>
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
