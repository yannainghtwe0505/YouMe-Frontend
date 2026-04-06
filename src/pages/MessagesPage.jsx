import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api';

/** How often to pull new messages while this chat is open (ms). */
const POLL_INTERVAL_MS = 3500;

export default function MessagesPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peer, setPeer] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const menuWrapRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const res = await api.get(`/matches/${matchId}/messages`);
        const raw = res.data?.content ?? res.data;
        const next = Array.isArray(raw) ? raw : [];
        setMessages(next);
        if (!silent) {
          setLoading(false);
        }
        setError(null);
        api.post(`/matches/${matchId}/read`).catch(() => {});
      } catch (err) {
        if (!silent) {
          setError(err.response?.status === 403 ? 'You are not part of this match.' : 'Failed to load messages');
          setLoading(false);
        }
      }
    },
    [matchId]
  );

  useEffect(() => {
    setLoading(true);
    loadMessages({ silent: false });
  }, [matchId, loadMessages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/matches');
        const rows = Array.isArray(res.data) ? res.data : [];
        const row = rows.find((x) => String(x.matchId) === String(matchId));
        if (!cancelled && row) {
          setPeer({
            userId: row.peerUserId,
            name: row.peerName,
            avatar: row.peerAvatar,
          });
        }
      } catch {
        if (!cancelled) setPeer(null);
      }
    })();
    return () => { cancelled = true; };
  }, [matchId]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      loadMessages({ silent: true });
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadMessages]);

  const scrollAnchor = useMemo(() => {
    if (!messages.length) return '';
    const m = messages[messages.length - 1];
    return `${messages.length}-${m.id ?? 'n'}-${m.body ?? ''}`;
  }, [messages]);

  useEffect(() => {
    if (!scrollAnchor) return;
    scrollToBottom();
  }, [scrollAnchor]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const unmatch = async () => {
    if (!window.confirm('Unmatch and delete this conversation?')) return;
    try {
      await api.delete(`/matches/${matchId}`);
      navigate('/messages');
    } catch {
      setError('Could not unmatch');
    }
    setMenuOpen(false);
  };

  const blockPeer = async () => {
    if (!peer?.userId) return;
    if (!window.confirm('Block this person? They will disappear from Discover and you will not be able to message each other.')) return;
    try {
      await api.post(`/blocks/${peer.userId}`);
      try {
        await api.delete(`/matches/${matchId}`);
      } catch {
        /* match may already be gone */
      }
      navigate('/messages');
    } catch {
      setError('Could not block user');
    }
    setMenuOpen(false);
  };

  const sendMessage = async () => {
    if (!body.trim()) return;

    setSending(true);
    setError(null);

    try {
      await api.post(`/matches/${matchId}/messages`, { body });
      setBody('');
      await loadMessages({ silent: true });
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return (
    <div className="loading fade-in">
      <div className="pulse">Loading messages...</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="card">
        <div className="chat-header">
          <Link to="/messages" className="chat-back" aria-label="Back to conversations">‹</Link>
          <div
            className="avatar-small chat-header-avatar"
            style={peer?.avatar ? {
              backgroundImage: `url(${peer.avatar})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : {}}
          >
            {peer?.avatar ? '' : '💬'}
          </div>
          <div className="chat-header-text">
            <h1>{peer?.name || 'Chat'}</h1>
            <p>{peer?.name ? 'Matched' : `Match #${matchId}`}</p>
          </div>
          <div className="chat-header-actions" ref={menuWrapRef}>
            <button
              type="button"
              className="chat-menu-trigger"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋮
            </button>
            {menuOpen ? (
              <div className="chat-menu" role="menu">
                <button type="button" className="chat-menu-item" role="menuitem" onClick={unmatch}>
                  Unmatch
                </button>
                <button type="button" className="chat-menu-item danger" role="menuitem" onClick={blockPeer}>
                  Block
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="message-list chat-thread">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={msg.id ?? `m-${index}`}
                className={`message-item ${msg.isFromCurrentUser ? 'own' : 'other'}`}
              >
                {msg.body}
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-light)',
              padding: '20px',
              fontSize: '14px'
            }}>
              👋 Start a conversation!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
          alignItems: 'flex-end'
        }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="form-input"
            style={{
              margin: 0,
              flex: 1,
              minHeight: '44px',
              maxHeight: '100px',
              resize: 'none'
            }}
            disabled={sending}
            rows={1}
          />
          <button
            onClick={sendMessage}
            className="btn btn-primary"
            disabled={!body.trim() || sending}
            style={{
              padding: '12px 16px',
              minWidth: '60px'
            }}
          >
            {sending ? '...' : '📤'}
          </button>
        </div>

        {error && (
          <div style={{
            color: '#e17055',
            fontSize: '14px',
            marginTop: '8px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
