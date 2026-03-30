import React, { useEffect, useState } from 'react';
import api from './api';

const placeholderAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    api.get('/feed')
      .then(res => {
        setUsers(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleAction = (action) => {
    if (animating) return;

    setAnimating(true);
    setTimeout(() => {
      setCurrent((prev) => Math.min(prev + 1, users.length - 1));
      setAnimating(false);
    }, 300);

    // Send action to backend
    if (users[current]) {
      const userId = users[current].id || users[current].userId;

      if (action === 'like') {
        api.post(`/likes/${userId}`).catch(err => console.error('Like failed:', err));
      } else if (action === 'dislike') {
        api.post(`/dislikes/${userId}`).catch(err => console.error('Dislike failed:', err));
      } else if (action === 'super') {
        api.post(`/superlikes/${userId}`).catch(err => console.error('Super like failed:', err));
      }
    }
  };

  if (loading) return (
    <div className="loading fade-in" style={{ minHeight: '400px' }}>
      <div className="pulse" style={{ fontSize: '1.2rem' }}>🔍 Finding matches...</div>
    </div>
  );

  if (error) return (
    <div className="fade-in">
      <div className="card" style={{ background: 'rgba(255, 107, 107, 0.1)', border: '2px solid #ff6b6b' }}>
        <div style={{ textAlign: 'center', color: '#ff6b6b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>❌</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>Unable to load users</div>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{error}</div>
        </div>
      </div>
    </div>
  );

  if (users.length === 0) return (
    <div className="fade-in">
      <div className="empty">
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>No users found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Check back later for new matches!</p>
      </div>
    </div>
  );

  const user = users[current];
  const isLast = current === users.length - 1;
  const progress = ((current + 1) / users.length) * 100;

  return (
    <div className="fade-in" style={{ marginBottom: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          fontWeight: '700', 
          color: 'var(--text-primary)',
          marginBottom: '8px' 
        }}>
          🔥 Discover
        </h1>
        <p style={{ 
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          marginBottom: '12px'
        }}>
          Swipe to find your perfect match
        </p>

        {/* Progress Bar */}
        <div style={{ 
          height: '4px', 
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <div style={{
            height: '100%',
            background: `var(--gradient-primary)`,
            width: `${progress}%`,
            transition: 'width 0.5s ease-out'
          }}></div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
          {current + 1} of {users.length}
        </p>
      </div>

      <div className="tinder-stack">
        <div className={`tinder-card ${animating ? 'animating' : ''}`}>
          <div
            className="tinder-card-image"
            style={{
              backgroundImage: `url(${user.avatar || placeholderAvatar})`,
            }}
          >
            <div className="tinder-badge">{user.location ? `📍 ${user.location}` : '💙 Open to new connections'}</div>
          </div>

          <div className="tinder-meta">
            <div className="tinder-identity">
              <h2>{user.name || user.username || user.userId || 'Anonymous'}</h2>
              <span>{user.age ? `${user.age}` : ''}</span>
            </div>
            <div className="tinder-info">
              {user.bio ? <p>{user.bio}</p> : <p>Excited to meet people and create great stories.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="tinder-action-row">
        <button
          onClick={() => handleAction('dislike')}
          className="tinder-action dislike"
          disabled={animating}
          title="Pass"
        >
          ❌
        </button>

        <button
          onClick={() => handleAction('like')}
          className="tinder-action like"
          disabled={animating}
          title="Like"
        >
          💚
        </button>

        <button
          onClick={() => handleAction('super')}
          className="tinder-action super"
          disabled={animating}
          title="Super Like"
        >
          ✨
        </button>
      </div>

      {/* All Profiles Viewed */}
      {isLast && (
        <div
          className="fade-in"
          style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(9, 132, 227, 0.1) 100%)',
            borderRadius: 'var(--radius-xl)',
            border: '2px solid rgba(0, 212, 170, 0.2)',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ color: 'var(--primary)', fontWeight: '600', marginBottom: '8px' }}>
            You've seen all matches!
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0' }}>
            New matches appear daily. Come back soon! 💫
          </p>
        </div>
      )}
    </div>
  );
}


