import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
          setError(err.response?.data?.error || 'Could not load conversations');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="loading fade-in">
        <div className="pulse">Loading conversations…</div>
      </div>
    );
  }

  return (
    <div className="fade-in matches-hub">
      <header className="matches-hub-header">
        <h1>Messages</h1>
        <p>Chats with people you matched with</p>
      </header>

      {error && (
        <div className="matches-hub-error" role="alert">{error}</div>
      )}

      {matches.length === 0 ? (
        <div className="matches-hub-empty card card-surface">
          <span className="matches-hub-empty-icon" aria-hidden>💬</span>
          <h2>No conversations yet</h2>
          <p>When you match with someone on Discover, they will show up here.</p>
          <Link to="/" className="btn btn-primary">Go to Discover</Link>
        </div>
      ) : (
        <ul className="matches-list">
          {matches.map((m) => {
            const unread = Number(m.unreadCount) || 0;
            const preview = m.lastMessageBody || 'No messages yet';
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
                      <span className="matches-name">{m.peerName || 'Match'}</span>
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
                      <span className="matches-unread-badge" aria-label={`${unread} unread`}>
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
