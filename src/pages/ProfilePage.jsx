import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const photos = Array.isArray(data.photos) ? data.photos.filter(Boolean) : [];
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
    photos,
    latitude: data.latitude != null && Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
    longitude: data.longitude != null && Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
  };
}

function profileToPayload(fields) {
  const distanceKm = Number(fields.distance || 0);
  const lat = fields.latitude;
  const lon = fields.longitude;
  const payload = {
    displayName: fields.name,
    bio: fields.bio || null,
    distanceKm: Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : null,
    city: fields.location || null,
    education: fields.education || null,
    occupation: fields.work || null,
    hobbies: fields.hobby || null,
    birthday: ageToBirthdayIso(fields.age),
  };
  if (typeof lat === 'number' && Number.isFinite(lat)) payload.latitude = lat;
  if (typeof lon === 'number' && Number.isFinite(lon)) payload.longitude = lon;
  return payload;
}

export default function ProfilePage({ onLogout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    age: '',
    location: '',
    bio: '',
    distance: '',
    education: '',
    hobby: '',
    work: '',
    isPremium: false,
    latitude: null,
    longitude: null,
  });
  const [newProfile, setNewProfile] = useState({
    name: '',
    age: '',
    location: '',
    bio: '',
    distance: '',
    education: '',
    hobby: '',
    work: '',
    latitude: null,
    longitude: null,
  });
  const [locLoading, setLocLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState(null);
  const [creating, setCreating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

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
      isPremium: !!profile.isPremium,
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
    });
    setIsEditing(true);
  };

  const fillGeolocation = (setter) => {
    if (!navigator.geolocation) {
      setGeoMessage('Location is not supported in this browser.');
      return;
    }
    setLocLoading(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setter((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLocLoading(false);
      },
      () => {
        setGeoMessage('Could not read your location. Check browser permissions.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
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

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if ((pwdNew || '').length < 6) {
      setPwdMsg({ type: 'err', text: 'New password must be at least 6 characters.' });
      return;
    }
    setPwdBusy(true);
    try {
      await api.put('/me/password', { currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdCurrent('');
      setPwdNew('');
      setPwdMsg({ type: 'ok', text: 'Password updated.' });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not change password';
      setPwdMsg({ type: 'err', text: msg });
    } finally {
      setPwdBusy(false);
    }
  };

  const submitDeleteAccount = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!profile?.email || deleteConfirmEmail.trim().toLowerCase() !== String(profile.email).toLowerCase()) {
      setPwdMsg({ type: 'err', text: 'Type your email exactly to confirm deletion.' });
      return;
    }
    if (!window.confirm('Permanently delete your account and all data? This cannot be undone.')) return;
    setDeleteBusy(true);
    try {
      await api.delete('/me');
      localStorage.removeItem('token');
      if (onLogout) onLogout();
      navigate('/login');
    } catch (err) {
      setPwdMsg({ type: 'err', text: err.response?.data?.error || err.message || 'Could not delete account' });
    } finally {
      setDeleteBusy(false);
    }
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
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={locLoading}
                onClick={() => fillGeolocation(setNewProfile)}
              >
                {locLoading ? 'Getting location…' : 'Use my current location'}
              </button>
              {(newProfile.latitude != null && newProfile.longitude != null) ? (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Will save: {newProfile.latitude.toFixed(5)}, {newProfile.longitude.toFixed(5)}
                </span>
              ) : null}
              {geoMessage ? (
                <span style={{ fontSize: '12px', color: '#e17055' }}>{geoMessage}</span>
              ) : null}
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
          {profile.photos && profile.photos.length > 0 ? (
            <div className="profile-photo-grid" role="list" aria-label="Profile photos">
              {profile.photos.slice(0, 6).map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="profile-photo-grid-cell"
                  style={{ backgroundImage: `url(${url})` }}
                  role="listitem"
                />
              ))}
            </div>
          ) : profile.avatar ? (
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
          <h1 className="profile-name-title">
            {profile.name || profile.username || 'Your Profile'}
          </h1>
          <div className="profile-member-line">
            {profile.isPremium ? (
              <span className="profile-premium-pill">YouMe Premium</span>
            ) : (
              <span className="profile-plan-muted">Free plan</span>
            )}
          </div>
          <nav className="profile-quick-links" aria-label="Profile shortcuts">
            <Link to="/">Discover</Link>
            <span className="profile-quick-sep" aria-hidden>·</span>
            <Link to="/photos">
              Photos
              {' '}
              ({(profile.photos && profile.photos.length) || 0}/6)
            </Link>
          </nav>
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
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={locLoading}
                onClick={() => fillGeolocation(setEditedProfile)}
              >
                {locLoading ? 'Getting location…' : 'Use my current location'}
              </button>
              {(editedProfile.latitude != null && editedProfile.longitude != null) ? (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Coordinates saved on next save: {editedProfile.latitude.toFixed(5)}, {editedProfile.longitude.toFixed(5)}
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Sharing your position helps show approximate distance to others in Discover.
                </span>
              )}
              {geoMessage ? (
                <span style={{ fontSize: '12px', color: '#e17055' }}>{geoMessage}</span>
              ) : null}
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
              {(profile.latitude != null && profile.longitude != null) ? (
                renderProfileRow('Map position', 'Saved (used for distance in Discover)')
              ) : null}
              {renderProfileRow('Distance', profile.distance)}
              {renderProfileRow('Education', profile.education)}
              {renderProfileRow('Work', profile.work)}
              {renderProfileRow('Hobby', profile.hobby)}
              <div style={{ padding: '12px 0' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>Bio</span>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>{profile.bio || 'No bio yet.'}</p>
              </div>
            </div>

            <div className="profile-actions-clean">
              <button type="button" className="btn btn-primary profile-btn-main" onClick={startEdit}>
                Edit profile
              </button>
              <div className="profile-secondary-row">
                {!profile.isPremium ? (
                  <button type="button" className="profile-upgrade-btn" onClick={handleUpgrade}>
                    Upgrade to Premium
                  </button>
                ) : (
                  <span className="profile-secondary-spacer" />
                )}
                <button type="button" className="profile-logout-text" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>

            <details className="profile-account-details">
              <summary>Account &amp; security</summary>
              <div className="profile-account-body">
                {pwdMsg ? (
                  <div
                    className={`profile-form-flash ${pwdMsg.type === 'ok' ? 'profile-form-flash-ok' : 'profile-form-flash-err'}`}
                  >
                    {pwdMsg.text}
                  </div>
                ) : null}
                <form onSubmit={submitPasswordChange} className="profile-account-form">
                  <h3 className="profile-account-h3">Change password</h3>
                  <div className="form-group">
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Current password"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      autoComplete="current-password"
                      disabled={pwdBusy}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="password"
                      className="form-input"
                      placeholder="New password (min 6 characters)"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      autoComplete="new-password"
                      disabled={pwdBusy}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm profile-btn-narrow"
                    disabled={pwdBusy || !pwdCurrent || !pwdNew}
                  >
                    {pwdBusy ? 'Saving…' : 'Update password'}
                  </button>
                </form>
                <form onSubmit={submitDeleteAccount} className="profile-account-form profile-delete-form">
                  <h3 className="profile-account-h3">Delete account</h3>
                  <p className="profile-account-hint">
                    Type your email (
                    {profile.email}
                    ) to confirm.
                  </p>
                  <div className="form-group">
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Your email"
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      disabled={deleteBusy}
                    />
                  </div>
                  <button type="submit" className="profile-delete-btn" disabled={deleteBusy}>
                    {deleteBusy ? 'Deleting…' : 'Delete my account'}
                  </button>
                </form>
              </div>
            </details>
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
