import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

const placeholderAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

function cardUserId(user) {
  return user?.id ?? user?.userId;
}

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [swipeClass, setSwipeClass] = useState('');
  const [matchModal, setMatchModal] = useState(null);

  const loadFeed = useCallback(() => {
    setLoading(true);
    setError(null);
    setCurrent(0);
    return api.get('/feed')
      .then((res) => {
        setUsers(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Request failed');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const advance = useCallback(() => {
    setCurrent((prev) => Math.min(prev + 1, users.length - 1));
  }, [users.length]);

  const handleAction = async (action) => {
    if (animating || !users[current]) return;

    const uid = cardUserId(users[current]);
    if (uid == null) return;

    setAnimating(true);
    if (action === 'dislike') setSwipeClass('swipe-left');
    else if (action === 'like') setSwipeClass('swipe-right');
    else if (action === 'super') setSwipeClass('swipe-up');

    try {
      if (action === 'dislike') {
        await api.post(`/dislikes/${uid}`);
      } else if (action === 'like') {
        const res = await api.post(`/likes/${uid}`);
        if (res.data?.matched) {
          setMatchModal({
            name: users[current].name || users[current].displayName || 'Someone',
            matchId: res.data.matchId,
          });
        }
      } else if (action === 'super') {
        const res = await api.post(`/superlikes/${uid}`);
        if (res.data?.matched) {
          setMatchModal({
            name: users[current].name || users[current].displayName || 'Someone',
            matchId: res.data.matchId,
          });
        }
      }
    } catch (err) {
      console.error('Swipe action failed:', err);
    }

    setTimeout(() => {
      advance();
      setSwipeClass('');
      setAnimating(false);
    }, 320);
  };

  if (loading) {
    return (
      <div className="loading fade-in" style={{ minHeight: '400px' }}>
        <div className="pulse" style={{ fontSize: '1.2rem' }}>Finding people near you…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in">
        <div className="card card-surface discover-error">
          <div className="discover-error-icon" aria-hidden>❌</div>
          <h2>Unable to load discover</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={loadFeed}>Try again</button>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="fade-in">
        <div className="empty discover-empty">
          <div className="discover-empty-icon" aria-hidden>✨</div>
          <h2>You&apos;re all caught up</h2>
          <p>Passes and likes clear from this list. Check back later or refresh.</p>
          <button type="button" className="btn btn-primary" onClick={loadFeed}>Refresh deck</button>
        </div>
      </div>
    );
  }

  const user = users[current];
  const nextUser = users[current + 1];
  const isLast = current === users.length - 1;
  const progress = ((current + 1) / users.length) * 100;

  return (
    <div className="fade-in discover-root">
      {matchModal && (
        <div className="match-overlay" role="dialog" aria-modal="true" aria-labelledby="match-title">
          <div className="match-overlay-card">
            <h2 id="match-title">It&apos;s a match!</h2>
            <p>You and <strong>{matchModal.name}</strong> liked each other.</p>
            <div className="match-overlay-actions">
              {matchModal.matchId ? (
                <Link to={`/messages/${matchModal.matchId}`} className="btn btn-primary" onClick={() => setMatchModal(null)}>
                  Send a message
                </Link>
              ) : (
                <Link to="/messages" className="btn btn-primary" onClick={() => setMatchModal(null)}>
                  Go to messages
                </Link>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setMatchModal(null)}>
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="discover-header">
        <h1>Discover</h1>
        <p>Swipe-style matching — pass, like, or super like</p>
        <div className="discover-progress-track">
          <div className="discover-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="discover-progress-label">{current + 1} / {users.length}</span>
      </header>

      <div className="tinder-stack">
        {nextUser && (
          <div
            className="tinder-card next"
            aria-hidden
          >
            <div
              className="tinder-card-image"
              style={{
                backgroundImage: `url(${nextUser.avatar || nextUser.photoUrl || placeholderAvatar})`,
              }}
            >
              <div className="tinder-badge">
                {nextUser.location ? `📍 ${nextUser.location}` : 'New nearby'}
              </div>
            </div>
            <div className="tinder-meta">
              <div className="tinder-identity">
                <h2>{nextUser.name || nextUser.displayName || 'Member'}</h2>
                <span>{nextUser.age != null ? `${nextUser.age}` : ''}</span>
              </div>
              <div className="tinder-info">
                <p>{nextUser.bio || 'Say hi and see where it goes.'}</p>
              </div>
            </div>
          </div>
        )}

        <div className={`tinder-card ${animating ? `animating ${swipeClass}` : ''}`}>
          <div
            className="tinder-card-image"
            style={{
              backgroundImage: `url(${user.avatar || user.photoUrl || placeholderAvatar})`,
            }}
          >
            <div className="tinder-badge">
              {user.location ? `📍 ${user.location}` : '💙 Open to chat'}
            </div>
          </div>

          <div className="tinder-meta">
            <div className="tinder-identity">
              <h2>{user.name || user.displayName || 'Member'}</h2>
              <span>{user.age != null ? `${user.age}` : ''}</span>
            </div>
            <div className="tinder-info">
              <p>{user.bio || 'Excited to meet people and create great stories.'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="tinder-action-row">
        <button
          type="button"
          onClick={() => handleAction('dislike')}
          className="tinder-action dislike"
          disabled={animating}
          title="Pass"
        >
          ✕
        </button>

        <button
          type="button"
          onClick={() => handleAction('super')}
          className="tinder-action super"
          disabled={animating}
          title="Super Like"
        >
          ★
        </button>

        <button
          type="button"
          onClick={() => handleAction('like')}
          className="tinder-action like"
          disabled={animating}
          title="Like"
        >
          ♥
        </button>
      </div>

      {isLast && (
        <div className="discover-done card card-surface">
          <span className="discover-done-icon" aria-hidden>🎉</span>
          <h3>End of the line</h3>
          <p>You&apos;ve seen everyone for now. Refresh to check for new people.</p>
          <button type="button" className="btn btn-secondary" onClick={loadFeed}>Refresh deck</button>
        </div>
      )}
    </div>
  );
}
