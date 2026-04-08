/**
 * Real-time chat: connects to Spring WebSocket /ws/chat with JWT in query string.
 */

function deriveWsBase() {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) {
    return String(explicit).replace(/\/$/, '');
  }
  const api = import.meta.env.VITE_API_URL || 'http://localhost:8090';
  try {
    const u = new URL(api);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws/chat';
    u.search = '';
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return 'ws://localhost:8090/ws/chat';
  }
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
