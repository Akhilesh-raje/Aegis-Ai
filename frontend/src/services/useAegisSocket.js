/**
 * AegisAI — WebSocket Real-Time Hook
 * Single persistent connection with channel-based subscriptions.
 * Replaces all REST polling with event-driven updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Singleton WebSocket Manager
// ---------------------------------------------------------------------------
class AegisSocketManager {
  constructor() {
    this._ws = null;
    this._subscribers = new Map(); // channel -> Set<callback>
    this._channelData = new Map(); // channel -> latest data
    this._reconnectDelay = 1000;
    this._maxReconnectDelay = 30000;
    this._isConnected = false;
    this._statusCallbacks = new Set();
    this._shouldReconnect = true;
  }

  connect() {
    if (this._ws && this._ws.readyState <= 1) return; // CONNECTING or OPEN

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    console.log('[AegisSocket] Connecting to', wsUrl);
    this._ws = new WebSocket(wsUrl);

    this._ws.onopen = () => {
      console.log('[AegisSocket] ✅ Connected');
      this._isConnected = true;
      this._reconnectDelay = 1000; // Reset backoff
      this._notifyStatus();
    };

    this._ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { channel, data } = msg;
        if (!channel) return;

        // Store latest data per channel
        this._channelData.set(channel, data);

        // Notify subscribers for this channel
        const subs = this._subscribers.get(channel);
        if (subs) {
          subs.forEach((cb) => cb(data));
        }
      } catch (err) {
        console.error('[AegisSocket] Parse error:', err);
      }
    };

    this._ws.onclose = () => {
      console.log('[AegisSocket] Disconnected');
      this._isConnected = false;
      this._ws = null;
      this._notifyStatus();

      if (this._shouldReconnect) {
        console.log(`[AegisSocket] Reconnecting in ${this._reconnectDelay}ms...`);
        setTimeout(() => this.connect(), this._reconnectDelay);
        // Exponential backoff capped at 30s
        this._reconnectDelay = Math.min(this._reconnectDelay * 2, this._maxReconnectDelay);
      }
    };

    this._ws.onerror = (err) => {
      console.error('[AegisSocket] Error:', err);
      // onclose will fire after this
    };
  }

  disconnect() {
    this._shouldReconnect = false;
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._isConnected = false;
    this._notifyStatus();
  }

  /**
   * Send a JSON message upstream on a specific channel.
   */
  sendMessage(channel, payload) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ channel, ...payload });
      this._ws.send(msg);
    } else {
      console.warn(`[AegisSocket] Cannot send message on ${channel}, socket not connected.`);
    }
  }

  /**
   * Subscribe to a channel. Returns unsubscribe function.
   */
  subscribe(channel, callback) {
    if (!this._subscribers.has(channel)) {
      this._subscribers.set(channel, new Set());
    }
    this._subscribers.get(channel).add(callback);

    // Immediately deliver latest cached data if available
    const cached = this._channelData.get(channel);
    if (cached !== undefined) {
      callback(cached);
    }

    return () => {
      const subs = this._subscribers.get(channel);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this._subscribers.delete(channel);
        }
      }
    };
  }

  onStatusChange(callback) {
    this._statusCallbacks.add(callback);
    return () => this._statusCallbacks.delete(callback);
  }

  _notifyStatus() {
    this._statusCallbacks.forEach((cb) => cb(this._isConnected));
  }

  get isConnected() {
    return this._isConnected;
  }
}

// Global singleton
const socketManager = new AegisSocketManager();

// Auto-connect on module load
if (typeof window !== 'undefined') {
  socketManager.connect();
  window._aegisSocket = socketManager;
}


// ---------------------------------------------------------------------------
// React Hook: useAegisSocket(channel)
// ---------------------------------------------------------------------------
/**
 * Subscribe to a WebSocket channel with debounced state updates.
 * @param {string} channel - Channel name (e.g. 'TELEMETRY', 'STATS')
 * @param {number} debounceMs - Debounce interval in ms (default: 200)
 * @returns {{ data: any, isConnected: boolean }}
 */
export function useAegisSocket(channel, debounceMs = 200) {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(socketManager.isConnected);
  const debounceRef = useRef(null);
  const latestDataRef = useRef(null);

  useEffect(() => {
    // Debounced setter to prevent React re-render storms
    const updateState = (newData) => {
      if (debounceMs <= 0) {
        setData(newData);
        return;
      }
      
      latestDataRef.current = newData;
      if (debounceRef.current) return; // Already scheduled

      debounceRef.current = setTimeout(() => {
        setData(latestDataRef.current);
        debounceRef.current = null;
      }, debounceMs);
    };

    const unsubChannel = socketManager.subscribe(channel, updateState);
    const unsubStatus = socketManager.onStatusChange(setIsConnected);

    return () => {
      unsubChannel();
      unsubStatus();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [channel, debounceMs]);

  const sendMessage = useCallback((payload) => {
    socketManager.sendMessage(channel, payload);
  }, [channel]);

  return { data, isConnected, sendMessage };
}


// ---------------------------------------------------------------------------
// React Hook: useSocketStatus()
// ---------------------------------------------------------------------------
/**
 * Get WebSocket connection status for UI indicators.
 * @returns {{ isConnected: boolean }}
 */
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(socketManager.isConnected);

  useEffect(() => {
    return socketManager.onStatusChange(setIsConnected);
  }, []);

  return { isConnected };
}

export default socketManager;
