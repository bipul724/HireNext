'use client';

import React from 'react';
import { usePresenceStore } from '../../store/use-presence-store';

// Helper to generate a consistent color based on email
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export function PresenceBar() {
  const usersMap = usePresenceStore((state) => state.users);
  const users = Object.values(usersMap);

  return (
    <div className="flex items-center gap-2.5 pl-3 pr-1.5 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
      {users.length === 0 ? (
        <span className="text-xs text-slate-400 italic pr-1.5">No one else here…</span>
      ) : (
        <div className="flex -space-x-2 overflow-hidden">
          {users.map((user) => (
            <div
              key={user.email}
              title={`${user.email} (${user.role})`}
              className="inline-flex h-7 w-7 rounded-full ring-2 ring-white items-center justify-center text-white text-[11px] font-bold shadow-sm"
              style={{ backgroundColor: stringToColor(user.email) }}
            >
              {user.email.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-600">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        {users.length} Online
      </span>
    </div>
  );
}
