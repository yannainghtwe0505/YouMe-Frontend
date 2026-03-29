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
      }
      // Dislike doesn't need to be sent to backend in this implementation
    }
  };

  if (loading) return (
    <div className="loading fade-in">
      <div className="pulse">🔍 Finding matches...</div>
    </div>
  );

  if (error) return (
    <div className="error fade-in">
      <div>❌ Unable to load users</div>
      <div style={{ fontSize: '14px', marginTop: '8px' }}>{error}</div>
    </div>
  );

  if (users.length === 0) return (
    <div className="empty fade-in">
      <div>👥 No users found</div>
      <div style={{ fontSize: '14px', marginTop: '8px' }}>Check back later for new matches!</div>
    </div>
  );

  const user = users[current];
  const isLast = current === users.length - 1;

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          Discover
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
          Find your perfect match
        </p>
      </div>

      <div className={`swipe-card ${animating ? 'pulse' : ''}`}>
        <img
          src={user.avatar || placeholderAvatar}
          alt="Profile"
          className="avatar"
        />

        <div style={{ marginBottom: '16px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            {user.name || user.username || user.userId || 'Anonymous'}
          </h2>

          <div style={{
            fontSize: '18px',
            color: 'var(--primary-color)',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            {user.age ? `${user.age} years old` : ''}
            {user.location ? ` • ${user.location}` : ''}
          </div>

          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            {user.bio || 'This person hasn\'t written a bio yet.'}
          </p>
        </div>

        <div className="swipe-actions">
          <button
            onClick={() => handleAction('dislike')}
            className="btn btn-icon btn-dislike"
            aria-label="Pass"
          >
            ✕
          </button>

          <button
            onClick={() => handleAction('like')}
            className="btn btn-icon btn-like"
            aria-label="Like"
          >
            ♥
          </button>
        </div>

        {isLast && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius)',
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            🎉 You've seen all available matches!
            <br />
            <span style={{ fontSize: '12px' }}>New matches appear daily</span>
          </div>
        )}
      </div>
    </div>
  );
}
