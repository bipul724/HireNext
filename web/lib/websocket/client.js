import { useConnectionStore } from '../../store/use-connection-store';

export class WsClient {
  constructor() {
    this.ws = null;
    this.getUrlFn = null;
    this.reconnectAttempts = 0;
    this.onMessageCallback = null;
    this.reconnectTimeoutId = null;
    this.isIntentionallyDisconnected = false;
    this.isConnecting = false; // Prevents async overlapping connect() calls
    this.flushCallbacks = []; // Stores promises for editor:flush:ack

    // Bind methods
    this.handleOnline = this.handleOnline.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    // Setup browser listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  // Safely destroys any existing websocket to prevent ghost sockets
  teardown() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      // 1000 = Normal Closure
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Teardown');
      }
      this.ws = null;
    }
  }

  async connect(getUrlFn, onMessage) {
    // Prevent overlapping async connections
    if (this.isConnecting) {
      console.log('[WebSocket] Connection attempt already in progress, ignoring.');
      return;
    }
    
    this.isConnecting = true;
    this.getUrlFn = getUrlFn || this.getUrlFn;
    this.onMessageCallback = onMessage || this.onMessageCallback;
    this.isIntentionallyDisconnected = false;
    
    // Clear any pending reconnects
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    useConnectionStore.getState().setStatus('connecting');

    // Tear down any orphaned socket
    this.teardown();

    try {
      const url = await this.getUrlFn();
      if (!url) {
        console.error('[WebSocket] Failed to obtain URL from generator');
        this.isConnecting = false;
        this.attemptReconnect();
        return;
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0; // Reset counter on success
        this.isConnecting = false;  // Release lock
        useConnectionStore.getState().setStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.type === "editor:flush:ack") {
            const cb = this.flushCallbacks.shift();
            if (cb) {
              clearTimeout(cb.timeout);
              if (parsed.payload?.success) cb.resolve(true);
              else cb.reject(new Error(parsed.payload?.error || "Flush failed"));
            }
            return;
          }

          if (this.onMessageCallback) {
            this.onMessageCallback(parsed);
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false; // Release lock in case it dropped while connecting
        if (!this.isIntentionallyDisconnected) {
          console.log('[WebSocket] Disconnected unexpectedly');
          this.attemptReconnect();
        } else {
          console.log('[WebSocket] Disconnected cleanly');
          useConnectionStore.getState().setStatus('disconnected');
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error observed:', error);
        // We let onclose handle the reconnect logic, which typically fires immediately after onerror.
      };
    } catch (err) {
      console.error('[WebSocket] Connection initialization failed:', err);
      this.isConnecting = false; // Release lock
      this.attemptReconnect();
    }
  }

  sendMessage(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected yet:', type);
    }
  }

  flushEditor(payload) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error("WebSocket not connected"));
      }
      
      const timeout = setTimeout(() => {
        // Remove from callbacks to prevent memory leak
        const idx = this.flushCallbacks.findIndex(cb => cb.resolve === resolve);
        if (idx !== -1) this.flushCallbacks.splice(idx, 1);
        reject(new Error("Flush timeout"));
      }, 5000);

      this.flushCallbacks.push({ resolve, reject, timeout });
      this.sendMessage("editor:flush", payload);
    });
  }

  attemptReconnect() {
    if (this.isIntentionallyDisconnected) return;
    
    // If we are currently resolving the URL or opening the socket, do nothing
    if (this.isConnecting) return;

    // If a reconnect is already queued, let it run
    if (this.reconnectTimeoutId) return;

    useConnectionStore.getState().setStatus('reconnecting');

    let delaySeconds = Math.pow(2, this.reconnectAttempts);
    if (delaySeconds > 30) delaySeconds = 30;
    
    const timeout = delaySeconds * 1000;
    this.reconnectAttempts++;
    
    console.log(`[WebSocket] Reconnecting in ${timeout}ms... (Attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null; // Clear ID so we know it fired
      if (this.getUrlFn && this.onMessageCallback) {
        this.connect(this.getUrlFn, this.onMessageCallback);
      }
    }, timeout);
  }

  disconnect() {
    this.isIntentionallyDisconnected = true;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.teardown();
    this.isConnecting = false;
    useConnectionStore.getState().setStatus('disconnected');
  }

  // --- Browser Recovery Listeners ---
  handleOnline() {
    console.log('[WebSocket] Browser came online. Verifying connection...');
    if (!this.isIntentionallyDisconnected && (!this.ws || this.ws.readyState !== WebSocket.OPEN) && !this.isConnecting) {
      this.reconnectAttempts = 0; // Immediate attempt
      
      // Cancel pending long timeout if any
      if (this.reconnectTimeoutId) {
        clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = null;
      }
      this.attemptReconnect();
    }
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      console.log('[WebSocket] Browser tab visible. Verifying connection...');
      if (!this.isIntentionallyDisconnected && (!this.ws || this.ws.readyState !== WebSocket.OPEN) && !this.isConnecting) {
        this.reconnectAttempts = 0; // Immediate attempt
        
        // Cancel pending long timeout if any
        if (this.reconnectTimeoutId) {
          clearTimeout(this.reconnectTimeoutId);
          this.reconnectTimeoutId = null;
        }
        this.attemptReconnect();
      }
    }
  }
}

// Export a singleton instance to be used across the app
export const wsClient = new WsClient();
