import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ProfilePage({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newProfile, setNewProfile] = useState({ name: '', age: '', location: '', bio: '' });
  const [creating, setCreating] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get('/me')
      .then(res => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(err.response?.data?.error || err.message || 'Could not fetch profile');
        }
      });
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const payload = {
        ...newProfile,
        age: Number(newProfile.age || 0),
      };
      const res = await api.post('/me/profile', payload);
      setProfile(res.data);
      setNotFound(false);
    } catch (err) {
      setError(err.response?.data || 'Could not create profile');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  if (loading) return (
    <div className="loading fade-in">
      <div className="pulse">Loading your profile...</div>
    </div>
  );

  if (error) return (
    <div className="error fade-in">
      <div>❌ Unable to load profile</div>
      <div style={{ fontSize: '14px', marginTop: '8px' }}>{error}</div>
    </div>
  );

  if (notFound && !profile) {
    return (
      <div className="fade-in">
        <div className="card">
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Create Your Profile</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <input value={newProfile.name} onChange={e => setNewProfile(prev => ({ ...prev, name: e.target.value }))} placeholder="Name" className="form-input" required />
            </div>
            <div className="form-group">
              <input value={newProfile.age} onChange={e => setNewProfile(prev => ({ ...prev, age: e.target.value }))} placeholder="Age" className="form-input" type="number" required />
            </div>
            <div className="form-group">
              <input value={newProfile.location} onChange={e => setNewProfile(prev => ({ ...prev, location: e.target.value }))} placeholder="Location" className="form-input" />
            </div>
            <div className="form-group">
              <textarea value={newProfile.bio} onChange={e => setNewProfile(prev => ({ ...prev, bio: e.target.value }))} placeholder="Bio" className="form-input" rows={4} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creating}>{creating ? 'Creating...' : 'Create Profile'}</button>
          </form>
        </div>
      </div>
    );
  }

  if (!profile) return (
    <div className="empty fade-in">
      <div>👤 Profile not found</div>
      <div style={{ fontSize: '14px', marginTop: '8px' }}>Please try logging in again or create a fresh account.</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            className="avatar avatar-small"
            style={{
              background: 'var(--primary-color)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            {(profile.name || profile.username || profile.email || 'U')[0].toUpperCase()}
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginTop: '16px',
            marginBottom: '8px'
          }}>
            {profile.name || profile.username || 'Your Profile'}
          </h1>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid var(--bg-secondary)'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Email</span>
            <span style={{ color: 'var(--text-secondary)' }}>{profile.email || 'Not set'}</span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid var(--bg-secondary)'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Age</span>
            <span style={{ color: 'var(--text-secondary)' }}>{profile.age || 'Not set'}</span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid var(--bg-secondary)'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Location</span>
            <span style={{ color: 'var(--text-secondary)' }}>{profile.location || 'Not set'}</span>
          </div>

          <div style={{
            padding: '12px 0'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>Bio</span>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              {profile.bio || 'No bio yet. Tell others about yourself!'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ width: '100%' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
