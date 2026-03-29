import React, { useState, useEffect } from 'react';
import api from '../api';

export default function LikesPage() {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toUserId, setToUserId] = useState('');
  const [likeResult, setLikeResult] = useState(null);

  useEffect(() => {
    loadLikes();
  }, []);

  const loadLikes = async () => {
    try {
      const res = await api.get('/likes');
      setLikes(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load likes');
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!toUserId.trim()) return;

    setError(null);
    setLikeResult(null);

    try {
      const res = await api.post(`/likes/${toUserId}`);
      setLikeResult(res.data);
      setToUserId('');
      // Reload likes to show updated list
      loadLikes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send like');
    }
  };

  if (loading) return (
    <div className="loading fade-in">
      <div className="pulse">Loading your likes...</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="card">
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Your Likes
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          People you've liked and your matches
        </p>

        {/* Send Like Section */}
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '16px',
          borderRadius: 'var(--border-radius)',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '12px'
          }}>
            Send a Like
          </h3>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              value={toUserId}
              onChange={e => setToUserId(e.target.value)}
              placeholder="User ID"
              className="form-input"
              style={{ margin: 0, flex: 1 }}
            />
            <button
              onClick={handleLike}
              className="btn btn-primary"
              disabled={!toUserId.trim()}
            >
              ❤️ Like
            </button>
          </div>

          {likeResult && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 'var(--border-radius)',
              background: likeResult.matched ? 'rgba(0, 212, 170, 0.1)' : 'rgba(225, 112, 85, 0.1)',
              color: likeResult.matched ? 'var(--primary-color)' : '#e17055',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {likeResult.matched ? '🎉 It\'s a match!' : 'Like sent!'}
            </div>
          )}

          {error && (
            <div style={{
              color: '#e17055',
              fontSize: '14px',
              marginTop: '8px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Likes List */}
        {likes.length > 0 ? (
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px'
            }}>
              Your Activity ({likes.length})
            </h3>

            {likes.map((like, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--border-radius)',
                  marginBottom: '8px'
                }}
              >
                <div
                  className="avatar-small"
                  style={{
                    background: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginRight: '12px'
                  }}
                >
                  {(like.toUserName || like.toUserId || 'U')[0].toUpperCase()}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    {like.toUserName || `User ${like.toUserId}`}
                  </div>
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '12px'
                  }}>
                    {like.matched ? '💕 Matched!' : '❤️ Like sent'}
                  </div>
                </div>

                {like.matched && (
                  <div style={{
                    color: 'var(--primary-color)',
                    fontSize: '18px'
                  }}>
                    💕
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div>💔 No likes yet</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              Start liking profiles to find matches!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
