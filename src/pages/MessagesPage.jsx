import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { createMatchChatSocket } from '../chatSocket';
import { cssUrlValue } from '../imageUtils';

/** Backup polling when WebSocket is down (ms). */
const POLL_BACKUP_MS = 22000;

const SUGGESTION_ICONS = {
  emotional_support: '❤️',
  advice: '🧠',
  casual: '💬',
  flirty: '😏',
  question: '❓',
  suggestion: '✨',
};

const ALLOWED_TYPES = new Set(Object.keys(SUGGESTION_ICONS));

/**
 * API may return legacy string[] or { text, type }[].
 */
function normalizeReplyIdeas(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      let text = '';
      let type = 'suggestion';
      if (typeof item === 'string') {
        text = item;
      } else if (item && typeof item === 'object') {
        text = typeof item.text === 'string' ? item.text : '';
        const t = typeof item.type === 'string'
          ? item.type.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_')
          : '';
        if (ALLOWED_TYPES.has(t)) type = t;
      }
      text = text.trim();
      if (!text) return null;
      const id = `s-${i}-${text.slice(0, 32)}`;
      return { id, text, type };
    })
    .filter(Boolean);
}

export default function MessagesPage() {
  const { t } = useTranslation();
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
  const [aiQuota, setAiQuota] = useState(null);
  /** Fade-out then clear suggestions after user sends a message */
  const [ideasExiting, setIdeasExiting] = useState(false);
  /** Bumps when a new suggestion batch loads (enter animation) */
  const [suggestionsBatchKey, setSuggestionsBatchKey] = useState(0);
  const messagesEndRef = useRef(null);
  const menuWrapRef = useRef(null);
  const icebreakerAttempted = useRef(false);
  const exitTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearSuggestionsAfterExit = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    exitTimerRef.current = window.setTimeout(() => {
      setReplyIdeas([]);
      setIdeasExiting(false);
      exitTimerRef.current = null;
    }, 240);
  }, []);

  useEffect(() => () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
  }, []);

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
          setError(err.response?.status === 403 ? t('messages.errorForbidden') : t('messages.errorLoadMessages'));
          setLoading(false);
        }
      }
    },
    [matchId, t]
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
    api.get('/me')
      .then((r) => {
        const cr = r.data?.aiEntitlements?.['chat-reply'];
        const q = cr && typeof cr === 'object' ? cr : r.data?.aiQuota;
        if (q && typeof q === 'object') {
          setAiQuota({
            remaining: Number(q.remaining ?? 0),
            dailyLimit: Number(q.dailyLimit) || 0,
            fairUseCap: Boolean(q.fairUseCap),
          });
        }
      })
      .catch(() => {});
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

  const suggestionLabel = useCallback(
    (type) => t(`messages.suggestionType.${type}`, { defaultValue: t('messages.suggestionType.suggestion') }),
    [t],
  );

  const fetchReplyIdeas = async () => {
    if (!matchId) return;
    setIdeasExiting(false);
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setReplyLoading(true);
    setReplyIdeas([]);
    setError(null);
    try {
      const res = await api.post(`/matches/${matchId}/assistant/reply-ideas`, { tone: 'warm and playful' });
      const next = normalizeReplyIdeas(res.data?.ideas);
      setSuggestionsBatchKey((k) => k + 1);
      setReplyIdeas(next);
      const q = res.data?.aiQuota;
      if (q && typeof q === 'object') {
        setAiQuota({
          remaining: Number(q.remaining ?? 0),
          dailyLimit: Number(q.dailyLimit) || 0,
          fairUseCap: Boolean(q.fairUseCap),
        });
      }
    } catch (err) {
      setReplyIdeas([]);
      if (err.response?.status === 429) {
        const q = err.response?.data?.aiQuota;
        if (q && typeof q === 'object') {
          setAiQuota({
            remaining: Number(q.remaining ?? 0),
            dailyLimit: Number(q.dailyLimit) || 0,
            fairUseCap: Boolean(q.fairUseCap),
          });
        }
        const hint = err.response?.data?.upgradeHint;
        setError(hint || t('messages.quotaError'));
      }
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
    if (!window.confirm(t('messages.confirmUnmatch'))) return;
    try {
      await api.delete(`/matches/${matchId}`);
      navigate('/messages');
    } catch {
      setError(t('messages.errorUnmatch'));
    }
    setMenuOpen(false);
  };

  const blockPeer = async () => {
    if (!peer?.userId) return;
    if (!window.confirm(t('messages.confirmBlock'))) return;
    try {
      await api.post(`/blocks/${peer.userId}`);
      try {
        await api.delete(`/matches/${matchId}`);
      } catch {
        /* match may already be gone */
      }
      navigate('/messages');
    } catch {
      setError(t('messages.errorBlock'));
    }
    setMenuOpen(false);
  };

  const sendMessage = async () => {
    if (!body.trim()) return;

    const hadSuggestions = replyIdeas.length > 0;
    setSending(true);
    setError(null);

    try {
      await api.post(`/matches/${matchId}/messages`, { body });
      setBody('');
      if (hadSuggestions) {
        setIdeasExiting(true);
        clearSuggestionsAfterExit();
      }
      await loadMessages({ silent: true });
    } catch {
      setError(t('messages.errorSend'));
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

  const pickSuggestion = (text) => {
    setBody(text);
  };

  if (loading) return (
    <div className="loading fade-in">
      <div className="pulse">{t('messages.loading')}</div>
    </div>
  );

  const showSuggestionRail = replyIdeas.length > 0;

  return (
    <div className="fade-in">
      <div className="card chat-page-card">
        <div className="chat-header">
          <Link to="/messages" className="chat-back" aria-label={t('messages.backToListAria')}>‹</Link>
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
            <h1>{peer?.name || t('messages.chatFallbackTitle')}</h1>
            <p>
              {peer?.name ? t('messages.matched') : t('messages.matchNumber', { id: matchId })}
              {llmConfigured ? <span className="chat-ai-badge">{t('messages.aiTipsBadge')}</span> : null}
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
                  {t('messages.menuUnmatch')}
                </button>
                <button type="button" className="chat-menu-item danger" role="menuitem" onClick={blockPeer}>
                  {t('messages.menuBlock')}
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
                  <span className="chat-assistant-label">{t('messages.assistantLabel')}</span>
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
              {t('messages.emptyThread')}
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
            {replyLoading ? t('messages.gettingIdeas') : t('messages.aiReplyIdeas')}
          </button>
          <span className="chat-ai-hint">
            {llmConfigured && aiQuota && (aiQuota.dailyLimit > 0 || aiQuota.fairUseCap)
              ? `${t('messages.aiQuotaBadge', { remaining: aiQuota.remaining })}${
                aiQuota.fairUseCap ? ` ${t('messages.aiFairUseNote')}` : ''
              } · `
              : ''}
            {llmConfigured ? t('messages.aiPowered') : t('messages.aiTemplates')}
          </span>
        </div>

        {showSuggestionRail ? (
          <div
            className={`chat-ai-suggestions-wrap${ideasExiting ? ' chat-ai-suggestions-wrap--exiting' : ''}`}
            aria-live="polite"
          >
            <p className="chat-ai-suggestions-heading">{t('messages.suggestionsHeading')}</p>
            <div className="chat-ai-suggestions-scroller chat-ai-suggestions-pop" key={suggestionsBatchKey}>
              <div className="chat-ai-suggestions-track" role="list">
                {replyIdeas.map((idea) => (
                  <button
                    type="button"
                    key={idea.id}
                    className="chat-ai-suggestion-card"
                    role="listitem"
                    onClick={() => pickSuggestion(idea.text)}
                    aria-label={`${suggestionLabel(idea.type)}: ${idea.text}`}
                  >
                    <span className="chat-ai-suggestion-label">
                      <span className="chat-ai-suggestion-icon" aria-hidden>
                        {SUGGESTION_ICONS[idea.type] ?? SUGGESTION_ICONS.suggestion}
                      </span>
                      <span className="chat-ai-suggestion-type">{suggestionLabel(idea.type)}</span>
                    </span>
                    <span className="chat-ai-suggestion-text">{idea.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="chat-composer-row">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('messages.composerPlaceholder')}
            className="form-input chat-composer-input"
            disabled={sending}
            rows={1}
          />
          <button
            type="button"
            onClick={sendMessage}
            className="btn btn-primary chat-composer-send"
            disabled={!body.trim() || sending}
            aria-label={t('messages.send')}
          >
            {sending ? t('messages.sending') : '📤'}
          </button>
        </div>

        {error && (
          <div className="chat-inline-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
