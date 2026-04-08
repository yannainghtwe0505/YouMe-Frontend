import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { cssUrlValue } from '../imageUtils';

const FALLBACK_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

function formatLikeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function LikesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('inbound');
  const [inbound, setInbound] = useState([]);
  const [outbound, setOutbound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const likeBackInFlight = useRef(false);

  const loadAll = useCallback(async () => {
    try {
      const [inRes, outRes] = await Promise.all([
        api.get('/likes/inbound'),
        api.get('/likes'),
      ]);
      setInbound(Array.isArray(inRes.data) ? inRes.data : []);
      setOutbound(Array.isArray(outRes.data) ? outRes.data : []);
      setError(null);
    } catch {
      setError('Could not load likes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const likeBack = async (fromUserId) => {
    if (likeBackInFlight.current) return;
    likeBackInFlight.current = true;
    setActionBusyId(fromUserId);
    setActionMsg(null);
    try {
      const res = await api.post(`/likes/${fromUserId}`);
      if (res.data?.matched && res.data?.matchId) {
        setActionMsg({ type: 'ok', text: "It's a match! Opening chat…" });
        setTimeout(() => navigate(`/messages/${res.data.matchId}`), 500);
      } else {
        setActionMsg({ type: 'ok', text: 'Like sent — if they like you too, you will match.' });
      }
      await loadAll();
    } catch (err) {
      setActionMsg({
        type: 'err',
        text: err.response?.data?.error || err.message || 'Could not like back',
      });
    } finally {
      likeBackInFlight.current = false;
      setActionBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading fade-in">
        <div className="pulse">Loading your YouMe likes…</div>
      </div>
    );
  }

  return (
    <div className="fade-in likes-hub">
      <header className="matches-hub-header">
        <h1>YouMe likes</h1>
        <p>
          On YouMe, two lists keep things simple:
          <strong> Chose you</strong>
          {' '}
          is everyone who already liked you from Discover—like them back here to become a match.
          <strong> You chose</strong>
          {' '}
          is people you liked first; when they like you too, you will connect under Messages.
        </p>
      </header>

      {error ? (
        <div className="matches-hub-error" role="alert">{error}</div>
      ) : null}

      {actionMsg ? (
        <div
          className="likes-action-toast"
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            background: actionMsg.type === 'ok' ? 'rgba(39, 174, 96, 0.12)' : 'rgba(225, 112, 85, 0.12)',
            color: actionMsg.type === 'ok' ? 'var(--success, #27ae60)' : '#c0392b',
          }}
        >
          {actionMsg.text}
        </div>
      ) : null}

      <div className="likes-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'inbound'}
          className={`likes-tab ${tab === 'inbound' ? 'likes-tab-active' : ''}`}
          onClick={() => setTab('inbound')}
        >
          Chose you
          {inbound.length > 0 ? (
            <span className="likes-tab-badge">{inbound.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'outbound'}
          className={`likes-tab ${tab === 'outbound' ? 'likes-tab-active' : ''}`}
          onClick={() => setTab('outbound')}
        >
          You chose
          {outbound.length > 0 ? (
            <span className="likes-tab-badge muted">{outbound.length}</span>
          ) : null}
        </button>
      </div>

      {tab === 'inbound' ? (
        inbound.length === 0 ? (
          <div className="matches-hub-empty card card-surface">
            <span className="matches-hub-empty-icon" aria-hidden>✨</span>
            <h2>No one in Chose you yet</h2>
            <p>
              When a YouMe member likes you on Discover before you like them, they appear here so you can like
              back and match in one tap.
            </p>
            <Link to="/" className="btn btn-primary">Go to Discover</Link>
          </div>
        ) : (
          <>
            <p className="likes-count-label">
              {inbound.length === 1 ? '1 person on YouMe chose you' : `${inbound.length} people on YouMe chose you`}
            </p>
            <ul className="likes-list">
              {inbound.map((row) => {
                const name = row.fromUserName || 'Member';
                const avatarUrl = row.fromUserAvatar || FALLBACK_AVATAR;
                const when = formatLikeTime(row.createdAt);
                const id = row.fromUserId;
                return (
                  <li key={row.id ?? `${id}-${row.createdAt}`}>
                    <div className="likes-row card-surface likes-row-inbound">
                      <div
                        className="matches-avatar likes-avatar"
                        style={{ backgroundImage: cssUrlValue(avatarUrl) }}
                        aria-hidden
                      />
                      <div className="likes-row-body">
                        <div className="likes-row-top">
                          <span className="likes-name">{name}</span>
                          {when ? <span className="likes-when">{when}</span> : null}
                        </div>
                        <span className="likes-status likes-status-inbound">
                          {row.superLike ? '⭐ Super liked you' : '❤️ Liked you'}
                        </span>
                      </div>
                      <div className="likes-row-actions">
                        <button
                          type="button"
                          className="btn btn-primary likes-msg-btn"
                          disabled={actionBusyId != null}
                          onClick={() => likeBack(id)}
                        >
                          {actionBusyId === id ? '…' : 'Like back'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )
      ) : outbound.length === 0 ? (
        <div className="matches-hub-empty card card-surface">
          <span className="matches-hub-empty-icon" aria-hidden>❤️</span>
          <h2>Your You chose list is empty</h2>
          <p>
            Use the heart on Discover to show interest on YouMe. People you chose stay here until you match or
            they like you back.
          </p>
          <Link to="/" className="btn btn-primary">Go to Discover</Link>
        </div>
      ) : (
        <>
          <p className="likes-count-label">{outbound.length} {outbound.length === 1 ? 'person' : 'people'}</p>
          <ul className="likes-list">
            {outbound.map((like) => {
              const name = like.toUserName || 'Member';
              const avatarUrl = like.toUserAvatar || FALLBACK_AVATAR;
              const when = formatLikeTime(like.createdAt);
              return (
                <li key={like.id ?? `${like.toUserId}-${like.createdAt}`}>
                  <div className="likes-row card-surface">
                    <div
                      className="matches-avatar likes-avatar"
                      style={{ backgroundImage: cssUrlValue(avatarUrl) }}
                      aria-hidden
                    />
                    <div className="likes-row-body">
                      <div className="likes-row-top">
                        <span className="likes-name">{name}</span>
                        {when ? <span className="likes-when">{when}</span> : null}
                      </div>
                      <span className={`likes-status ${like.matched ? 'likes-status-match' : ''}`}>
                        {like.matched
                          ? 'Matched — you can message'
                          : (like.superLike ? 'Super like sent — waiting on them' : 'Liked — waiting on them')}
                      </span>
                    </div>
                    <div className="likes-row-actions">
                      {like.matched && like.matchId ? (
                        <Link to={`/messages/${like.matchId}`} className="btn btn-primary likes-msg-btn">
                          Message
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
