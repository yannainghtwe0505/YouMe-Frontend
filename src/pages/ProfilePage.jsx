import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function ageToBirthdayIso(age) {
  if (age == null || age === '') return null;
  const n = Number(age);
  if (!Number.isFinite(n)) return null;
  const y = new Date().getFullYear() - Math.floor(n);
  if (y < 1920 || y > new Date().getFullYear()) return null;
  return `${y}-06-01`;
}

function normalizeProfile(data) {
  if (!data) return null;
  return {
    userId: data.userId,
    email: data.email,
    name: data.name ?? data.displayName ?? '',
    bio: data.bio ?? '',
    age: data.age ?? '',
    location: data.location ?? data.city ?? '',
    distance: data.distance ?? (data.distanceKm != null ? String(data.distanceKm) : ''),
    education: data.education ?? '',
    work: data.work ?? data.occupation ?? '',
    hobby: data.hobby ?? data.hobbies ?? '',
    isPremium: Boolean(data.isPremium),
    avatar: data.avatar ?? data.photoUrl,
  };
}

function profileToPayload(fields) {
  const distanceKm = Number(fields.distance || 0);
  return {
    displayName: fields.name,
    bio: fields.bio || null,
    distanceKm: Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : null,
    city: fields.location || null,
    education: fields.education || null,
    occupation: fields.work || null,
    hobbies: fields.hobby || null,
    birthday: ageToBirthdayIso(fields.age),
  };
}

export default function ProfilePage({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({ name: '', age: '', location: '', bio: '', distance: '', education: '', hobby: '', work: '', isPremium: false });
  const [newProfile, setNewProfile] = useState({ name: '', age: '', location: '', bio: '', distance: '', education: '', hobby: '', work: '' });
  const [creating, setCreating] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get('/me')
      .then(res => {
        setProfile(normalizeProfile(res.data));
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

  const startEdit = () => {
    if (!profile) return;
    setEditedProfile({
      name: profile.name || '',
      age: profile.age || '',
      location: profile.location || '',
      bio: profile.bio || '',
      distance: profile.distance || '',
      education: profile.education || '',
      hobby: profile.hobby || '',
      work: profile.work || '',
      isPremium: !!profile.isPremium
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.put('/me/profile', profileToPayload(editedProfile));
      const me = await api.get('/me');
      setProfile(normalizeProfile(me.data));
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data || err.message || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      await api.post('/me/upgrade');
      setProfile(prev => ({ ...prev, isPremium: true }));
    } catch (err) {
      setError(err.response?.data || 'Upgrade failed');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      await api.post('/me/profile', profileToPayload(newProfile));
      const me = await api.get('/me');
      setProfile(normalizeProfile(me.data));
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
              <input value={newProfile.distance} onChange={e => setNewProfile(prev => ({ ...prev, distance: e.target.value }))} placeholder="Distance (e.g., 10km)" className="form-input" />
            </div>
            <div className="form-group">
              <input value={newProfile.education} onChange={e => setNewProfile(prev => ({ ...prev, education: e.target.value }))} placeholder="Education" className="form-input" />
            </div>
            <div className="form-group">
              <input value={newProfile.work} onChange={e => setNewProfile(prev => ({ ...prev, work: e.target.value }))} placeholder="Work" className="form-input" />
            </div>
            <div className="form-group">
              <input value={newProfile.hobby} onChange={e => setNewProfile(prev => ({ ...prev, hobby: e.target.value }))} placeholder="Hobbies (comma-separated)" className="form-input" />
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
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          {profile.avatar ? (
            <div
              className="profile-hero-photo"
              style={{ backgroundImage: `url(${profile.avatar})` }}
              role="img"
              aria-label="Profile"
            />
          ) : (
            <div
              className="avatar avatar-small"
              style={{
                background: 'var(--primary)',
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
          )}
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginTop: '12px',
            marginBottom: '4px'
          }}>
            {profile.name || profile.username || 'Your Profile'}
          </h1>
          <div style={{ color: '#555', fontSize: '13px', marginBottom: '12px' }}>
            {profile.isPremium ? 'Premium Member 🌟' : 'Free Member'}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={saveEdit}>
            <div className="form-group">
              <input value={editedProfile.name} onChange={e => setEditedProfile(prev => ({ ...prev, name: e.target.value }))} placeholder="Name" className="form-input" required />
            </div>
            <div className="form-group">
              <input value={editedProfile.age} onChange={e => setEditedProfile(prev => ({ ...prev, age: e.target.value }))} placeholder="Age" className="form-input" type="number" required />
            </div>
            <div className="form-group">
              <input value={editedProfile.location} onChange={e => setEditedProfile(prev => ({ ...prev, location: e.target.value }))} placeholder="Location" className="form-input" />
            </div>
            <div className="form-group">
              <input value={editedProfile.distance} onChange={e => setEditedProfile(prev => ({ ...prev, distance: e.target.value }))} placeholder="Distance" className="form-input" />
            </div>
            <div className="form-group">
              <input value={editedProfile.education} onChange={e => setEditedProfile(prev => ({ ...prev, education: e.target.value }))} placeholder="Education" className="form-input" />
            </div>
            <div className="form-group">
              <input value={editedProfile.work} onChange={e => setEditedProfile(prev => ({ ...prev, work: e.target.value }))} placeholder="Work" className="form-input" />
            </div>
            <div className="form-group">
              <input value={editedProfile.hobby} onChange={e => setEditedProfile(prev => ({ ...prev, hobby: e.target.value }))} placeholder="Hobbies" className="form-input" />
            </div>
            <div className="form-group">
              <textarea value={editedProfile.bio} onChange={e => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))} placeholder="Bio" className="form-input" rows={3} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              <button type="button" onClick={cancelEdit} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              {renderProfileRow('Email', profile.email)}
              {renderProfileRow('Age', profile.age)}
              {renderProfileRow('Location', profile.location)}
              {renderProfileRow('Distance', profile.distance)}
              {renderProfileRow('Education', profile.education)}
              {renderProfileRow('Work', profile.work)}
              {renderProfileRow('Hobby', profile.hobby)}
              <div style={{ padding: '12px 0' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>Bio</span>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>{profile.bio || 'No bio yet.'}</p>
              </div>
            </div>

            <div className="profile-actions">
              <Link to="/" className="btn btn-ghost" style={{ textAlign: 'center' }}>Discover</Link>
              <Link to="/photos" className="btn btn-secondary" style={{ textAlign: 'center' }}>Photos</Link>
              <button type="button" className="btn btn-primary" onClick={startEdit}>Edit profile</button>
              <button type="button" className="btn btn-premium" onClick={handleUpgrade}>{profile.isPremium ? 'Premium Active' : 'Upgrade to Premium'}</button>
              <button type="button" className="btn btn-logout" onClick={handleLogout} style={{ gridColumn: '1 / -1' }}>Logout</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function renderProfileRow(label, value) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bg-secondary)' }}>
      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{value || 'Not set'}</span>
    </div>
  );
}
