import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { normalizeToAppLocale } from '../lib/locale';
import HelpIcon from '../components/help/HelpIcon';
import api from '../api';
import { cssUrlValue } from '../imageUtils';
import Icon from '../components/ui/Icon';

const placeholderAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

function localeTag() {
  const code = normalizeToAppLocale(i18n.language);
  if (code === 'ja') return 'ja-JP';
  if (code === 'my') return 'my-MM';
  return 'en-US';
}

function formatMessageTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const loc = localeTag();
  if (sameDay) {
    return d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
}

function formatLastActive(iso, t) {
  if (!iso) return t('matches.offlineUnknown');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t('matches.offlineUnknown');
  const diffMs = Date.now() - d.getTime();
  const min = Math.max(1, Math.floor(diffMs / 60000));
  if (min < 60) return t('matches.lastActiveMin', { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t('matches.lastActiveHour', { count: hr });
  const day = Math.floor(hr / 24);
  return t('matches.lastActiveDay', { count: day });
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
        <div className="matches-hub-header-row">
          <div>
            <h1>{t('matches.title')}</h1>
            <p>{t('matches.subtitle')}</p>
          </div>
          <HelpIcon className="matches-help-trigger" articleId="after_match" />
        </div>
      </header>

      {error && (
        <div className="matches-hub-error" role="alert">{error}</div>
      )}

      {matches.length === 0 ? (
        <div className="matches-hub-empty card card-surface">
          <div className="empty-state-head">
            <h2>{t('matches.emptyTitle')}</h2>
            <span className="matches-hub-empty-icon empty-state-icon" aria-hidden>
              <Icon name="messages" size="xl" tone="active" />
            </span>
          </div>
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
                    <div className="matches-presence-row">
                      <span className={`matches-presence-dot ${m.peerOnline ? 'online' : ''}`} />
                      <span className="matches-presence-text">
                        {m.peerOnline ? t('matches.onlineNow') : formatLastActive(m.peerLastActiveAt, t)}
                      </span>
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
