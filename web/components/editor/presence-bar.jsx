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
    <div className="flex items-center gap-2 p-2 bg-white border-b border-gray-200">
      <span className="text-sm font-medium text-gray-500 mr-2">Connected:</span>
      {users.length === 0 && (
        <span className="text-sm text-gray-400 italic">No one else is here...</span>
      )}
      <div className="flex -space-x-2 overflow-hidden">
        {users.map((user) => (
          <div
            key={user.email}
            title={`${user.email} (${user.role})`}
            className="inline-block h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
            style={{ backgroundColor: stringToColor(user.email) }}
          >
            {user.email.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="ml-2 text-xs text-green-500 flex items-center gap-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        {users.length} Online
      </span>
    </div>
  );
}
