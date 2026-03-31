import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const placeholderAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

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
          {matches.map((m) => (
            <li key={m.matchId}>
              <Link to={`/messages/${m.matchId}`} className="matches-row">
                <div
                  className="matches-avatar"
                  style={{
                    backgroundImage: `url(${m.peerAvatar || placeholderAvatar})`,
                  }}
                />
                <div className="matches-row-text">
                  <span className="matches-name">{m.peerName || 'Match'}</span>
                  <span className="matches-sub">Tap to open chat</span>
                </div>
                <span className="matches-chevron" aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
