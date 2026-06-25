'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { wsClient } from '../lib/websocket/client';
import { handleSocketEvent } from '../lib/websocket/event-registry';
import { supabase } from '@/services/supabaseClient';

// Create a Context so deeply nested components can access the sendMessage function
const WebSocketContext = createContext(null);

export function WebSocketProvider({ interviewId, children }) {
  const [role, setRole] = React.useState('candidate');

  useEffect(() => {
    if (!interviewId) return;

    let isMounted = true;

    const connectWebSocket = () => {
      const getUrlFn = async () => {
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data?.session?.access_token) {
          console.error('[WebSocket] Supabase auth error or no token found.');
          return null;
        }

        const token = data.session.access_token;
        const userEmail = data.session.user.email;
        let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
        if (!wsUrl) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error("NEXT_PUBLIC_WS_URL is required in production");
          }
          wsUrl = 'ws://localhost:8080';
        }
        
        // Dynamically determine role based on interview ownership
        const { data: interview, error: fetchError } = await supabase
          .from('Interviews')
          .select('userEmail')
          .eq('interview_id', interviewId)
          .single();

        if (fetchError) {
          console.error('[WebSocket] Failed to verify interview ownership:', fetchError);
          return null; // Fail safely rather than silently downgrading
        }

        let determinedRole = 'candidate';
        if (interview && interview.userEmail === userEmail) {
          determinedRole = 'interviewer';
        }

        if (isMounted) {
          setRole(determinedRole);
        }

        return `${wsUrl}?token=${token}&interviewId=${interviewId}&role=${determinedRole}`;
      };

      if (!isMounted) return;
      wsClient.connect(getUrlFn, handleSocketEvent);
    };

    connectWebSocket();

    // Cleanup: Disconnect when the user leaves the interview page or the component unmounts
    return () => {
      isMounted = false;
      wsClient.disconnect();
    };
  }, [interviewId]);

  // Expose the sendMessage method and role to children
  const contextValue = {
    role,
    sendMessage: (type, payload) => wsClient.sendMessage(type, payload),
    flushEditor: (payload) => wsClient.flushEditor(payload),
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook for easier consumption in child components
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
