import { API_BASE_URL, WS_URL } from './config/urls.js';

/**
 * Real-time chat: connects to Spring WebSocket /ws/chat with JWT in query string.
 */

function deriveWsBase() {
  if (WS_URL) {
    return WS_URL.replace(/\/$/, '');
  }
  const base = API_BASE_URL;
  const u = base.startsWith('/')
    ? new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    : new URL(base);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = '/ws/chat';
  u.search = '';
  u.hash = '';
  return u.toString().replace(/\/$/, '');
}

/**
 * @param {() => string | null} getToken
 * @param {(payload: object) => void} onMessage
 * @returns {{ close: () => void, reconnect: () => void }}
 */
export function createMatchChatSocket(getToken, onMessage) {
  let ws = null;
  let closed = false;
  let reconnectTimer = null;

  const connect = () => {
    const token = getToken();
    if (!token || closed) return;
    const base = deriveWsBase();
    const url = `${base}?token=${encodeURIComponent(token)}`;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onMessage(data);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      ws = null;
      if (!closed && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        reconnectTimer = window.setTimeout(connect, 2500);
      }
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    },
    reconnect: () => {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      if (!closed) connect();
    },
  };
}
