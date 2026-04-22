import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { cssUrlValue } from '../imageUtils';

const placeholderAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

function formatMessageTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MatchesPage() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/matches');
        if (!cancelled) {
          setMatches(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || t('matches.errorLoad'));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  if (loading) {
    return (
      <div className="loading fade-in">
        <div className="pulse">{t('matches.loading')}</div>
      </div>
    );
  }

  return (
    <div className="fade-in matches-hub">
      <header className="matches-hub-header">
        <h1>{t('matches.title')}</h1>
        <p>{t('matches.subtitle')}</p>
      </header>

      {error && (
        <div className="matches-hub-error" role="alert">{error}</div>
      )}

      {matches.length === 0 ? (
        <div className="matches-hub-empty card card-surface">
          <span className="matches-hub-empty-icon" aria-hidden>💬</span>
          <h2>{t('matches.emptyTitle')}</h2>
          <p>{t('matches.emptyBody')}</p>
          <Link to="/" className="btn btn-primary">{t('matches.goDiscover')}</Link>
        </div>
      ) : (
        <ul className="matches-list">
          {matches.map((m) => {
            const unread = Number(m.unreadCount) || 0;
            const preview = m.lastMessageBody ? m.lastMessageBody : t('matches.previewEmpty');
            const timeLabel = formatMessageTime(m.lastMessageAt);
            return (
              <li key={m.matchId}>
                <Link to={`/messages/${m.matchId}`} className="matches-row">
                  <div
                    className="matches-avatar"
                    style={{
                      backgroundImage: cssUrlValue(m.peerAvatar || placeholderAvatar),
                    }}
                  />
                  <div className="matches-row-text">
                    <div className="matches-row-topline">
                      <span className="matches-name">{m.peerName || t('matches.peerFallback')}</span>
                      {timeLabel ? (
                        <span className="matches-time">{timeLabel}</span>
                      ) : null}
                    </div>
                    <span className={`matches-sub ${unread > 0 ? 'matches-sub-unread' : ''}`}>
                      {preview}
                    </span>
                  </div>
                  <div className="matches-row-right">
                    {unread > 0 ? (
                      <span className="matches-unread-badge" aria-label={t('matches.unreadAria', { count: unread })}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    ) : null}
                    <span className="matches-chevron" aria-hidden>›</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
