import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { createMatchChatSocket } from '../chatSocket';
import { cssUrlValue } from '../imageUtils';

/** Backup polling when WebSocket is down (ms). */
const POLL_BACKUP_MS = 22000;

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
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [replyIdeas, setReplyIdeas] = useState([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const menuWrapRef = useRef(null);
  const icebreakerAttempted = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (matchId == null || matchId === '') {
        if (!silent) setLoading(false);
        return;
      }
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
    icebreakerAttempted.current = false;
  }, [matchId]);

  useEffect(() => {
    setLoading(true);
    loadMessages({ silent: false });
  }, [matchId, loadMessages]);

  useEffect(() => {
    if (!matchId) return undefined;
    const sock = createMatchChatSocket(
      () => localStorage.getItem('token'),
      (data) => {
        if (data?.type === 'chat' && String(data.matchId) === String(matchId)) {
          loadMessages({ silent: true });
        }
      },
    );
    return () => sock.close();
  }, [matchId, loadMessages]);

  useEffect(() => {
    api.get('/ai/capabilities')
      .then((res) => setLlmConfigured(Boolean(res.data?.llmConfigured)))
      .catch(() => setLlmConfigured(false));
  }, [matchId]);

  useEffect(() => {
    if (loading || !matchId) return;
    if (messages.length > 0) {
      icebreakerAttempted.current = true;
      return;
    }
    if (icebreakerAttempted.current) return;
    icebreakerAttempted.current = true;
    api.post(`/matches/${matchId}/assistant/icebreaker`).finally(() => {
      loadMessages({ silent: true });
    });
  }, [loading, matchId, messages.length, loadMessages]);

  const loadPeer = useCallback(async () => {
    if (matchId == null || matchId === '') return;
    try {
      const res = await api.get('/matches');
      const rows = Array.isArray(res.data) ? res.data : [];
      const row = rows.find((x) => String(x.matchId) === String(matchId));
      if (row) {
        setPeer({
          userId: row.peerUserId,
          name: row.peerName,
          avatar: row.peerAvatar,
        });
      }
    } catch {
      setPeer(null);
    }
  }, [matchId]);

  useEffect(() => {
    loadPeer();
  }, [loadPeer]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadPeer();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadPeer]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      loadMessages({ silent: true });
    };
    const id = setInterval(tick, POLL_BACKUP_MS);
    return () => clearInterval(id);
  }, [loadMessages]);

  const fetchReplyIdeas = async () => {
    if (!matchId) return;
    setReplyLoading(true);
    setReplyIdeas([]);
    try {
      const res = await api.post(`/matches/${matchId}/assistant/reply-ideas`, { tone: 'warm and playful' });
      setReplyIdeas(Array.isArray(res.data?.ideas) ? res.data.ideas : []);
    } catch {
      setReplyIdeas([]);
    } finally {
      setReplyLoading(false);
    }
  };

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
    } catch {
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
            className={`avatar-small chat-header-avatar${peer?.avatar ? '' : ' chat-header-avatar--placeholder'}`}
            style={peer?.avatar ? {
              backgroundImage: cssUrlValue(peer.avatar),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            {peer?.avatar ? '' : '💬'}
          </div>
          <div className="chat-header-text">
            <h1>{peer?.name || 'Chat'}</h1>
            <p>
              {peer?.name ? 'Matched' : `Match #${matchId}`}
              {llmConfigured ? <span className="chat-ai-badge">AI tips</span> : null}
            </p>
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
                className={`message-item ${msg.isAssistant ? 'assistant' : msg.isFromCurrentUser ? 'own' : 'other'}`}
              >
                {msg.isAssistant ? (
                  <span className="chat-assistant-label">YouMe coach</span>
                ) : null}
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
              👋 Say hi — a short YouMe coach note may appear when you match (and loads in real time).
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-ai-toolbar">
          <button
            type="button"
            className="btn btn-ghost btn-sm chat-ai-ideas-btn"
            onClick={fetchReplyIdeas}
            disabled={replyLoading}
          >
            {replyLoading ? 'Getting ideas…' : 'AI reply ideas'}
          </button>
          <span className="chat-ai-hint">
            {llmConfigured ? 'Powered by your configured model.' : 'Templates when no API key is set.'}
          </span>
        </div>
        {replyIdeas.length > 0 ? (
          <div className="chat-ai-chips" role="list">
            {replyIdeas.map((idea, i) => (
              <button
                type="button"
                key={`${i}-${idea.slice(0, 12)}`}
                className="chat-ai-chip"
                onClick={() => setBody(idea)}
              >
                {idea}
              </button>
            ))}
          </div>
        ) : null}

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
