import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { normalizeToAppLocale } from '../lib/locale';
import api from '../api';

function ageToBirthdayIso(age) {
  if (age == null || age === '') return null;
  const n = Number(age);
  if (!Number.isFinite(n)) return null;
  const y = new Date().getFullYear() - Math.floor(n);
  if (y < 1920 || y > new Date().getFullYear()) return null;
  return `${y}-06-01`;
}

function pickAiEntitlement(data, key) {
  const e = data.aiEntitlements?.[key];
  if (!e || typeof e !== 'object') return null;
  return {
    usedToday: Number(e.usedToday) || 0,
    dailyLimit: Number(e.dailyLimit) || 0,
    remaining: Number(e.remaining ?? 0),
    fairUseCap: Boolean(e.fairUseCap),
  };
}

function normalizeProfile(data) {
  if (!data) return null;
  const photos = Array.isArray(data.photos) ? data.photos.filter(Boolean) : [];
  const interests = Array.isArray(data.interests) ? data.interests.filter(Boolean) : [];
  const legacyQuota = data.aiQuota && typeof data.aiQuota === 'object'
    ? {
        usedToday: Number(data.aiQuota.usedToday) || 0,
        dailyLimit: Number(data.aiQuota.dailyLimit) || 0,
        remaining: Number(data.aiQuota.remaining ?? 0),
        fairUseCap: Boolean(data.aiQuota.fairUseCap),
      }
    : null;
  const aiQuota = pickAiEntitlement(data, 'profile-ai')
    ?? pickAiEntitlement(data, 'chat-reply')
    ?? legacyQuota;
  let birthday = '';
  if (data.birthday) {
    birthday = String(data.birthday).trim().slice(0, 10);
  }
  return {
    userId: data.userId,
    email: data.email,
    name: data.name ?? data.displayName ?? '',
    bio: data.bio ?? '',
    age: data.age ?? '',
    birthday,
    gender: data.gender ?? '',
    interests,
    location: data.location ?? data.city ?? '',
    distance: data.distance ?? (data.distanceKm != null ? String(data.distanceKm) : ''),
    education: data.education ?? '',
    work: data.work ?? data.occupation ?? '',
    hobby: data.hobby ?? data.hobbies ?? '',
    isPremium: Boolean(data.isPremium),
    subscriptionPlan: String(data.subscriptionPlan || 'FREE').toUpperCase(),
    avatar: data.avatar ?? data.photoUrl,
    photos,
    latitude: data.latitude != null && Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
    longitude: data.longitude != null && Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
    aiQuota,
  };
}

function profileToPayload(fields) {
  const distanceKm = Number(fields.distance || 0);
  const lat = fields.latitude;
  const lon = fields.longitude;
  let birthday = null;
  if (fields.birthday && String(fields.birthday).trim()) {
    birthday = String(fields.birthday).trim().slice(0, 10);
  } else {
    birthday = ageToBirthdayIso(fields.age);
  }
  const tags = typeof fields.interestsText === 'string'
    ? fields.interestsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const payload = {
    displayName: fields.name,
    bio: fields.bio || null,
    distanceKm: Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : null,
    city: fields.location || null,
    education: fields.education || null,
    occupation: fields.work || null,
    hobbies: fields.hobby || null,
    birthday,
  };
  if (fields.gender && String(fields.gender).trim()) {
    payload.gender = String(fields.gender).trim();
  }
  if (tags.length > 0) {
    payload.interests = tags;
  }
  if (typeof lat === 'number' && Number.isFinite(lat)) payload.latitude = lat;
  if (typeof lon === 'number' && Number.isFinite(lon)) payload.longitude = lon;
  return payload;
}

export default function ProfilePage({ onLogout }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    age: '',
    birthday: '',
    gender: '',
    interestsText: '',
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
    birthday: '',
    gender: '',
    interestsText: '',
    location: '',
    bio: '',
    distance: '',
    education: '',
    hobby: '',
    work: '',
    latitude: null,
    longitude: null,
  });
  const [profileTips, setProfileTips] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsMsg, setTipsMsg] = useState(null);
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
          setError(err.response?.data?.error || err.message || t('profile.fetchFailed'));
        }
      });
  }, [t]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || isEditing) return;
      api.get('/me')
        .then((res) => setProfile(normalizeProfile(res.data)))
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isEditing]);

  const startEdit = () => {
    if (!profile) return;
    setEditedProfile({
      name: profile.name || '',
      age: profile.age || '',
      birthday: profile.birthday || '',
      gender: profile.gender || '',
      interestsText: Array.isArray(profile.interests) ? profile.interests.join(', ') : '',
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

  const fetchProfileTips = async () => {
    setTipsMsg(null);
    setTipsLoading(true);
    try {
      const loc = normalizeToAppLocale(i18n.language);
      const res = await api.post('/me/assistant/profile-tips', { locale: loc });
      const raw = Array.isArray(res.data?.tips) ? res.data.tips : [];
      setProfileTips(
        raw.map((x) => ({
          title: x?.title || t('profile.tipDefaultTitle'),
          detail: x?.detail || '',
        })),
      );
      const me = await api.get('/me');
      setProfile(normalizeProfile(me.data));
    } catch (err) {
      if (err.response?.status === 429) {
        const q = err.response?.data?.aiQuota;
        if (q) {
          setProfile((prev) => (prev
            ? {
                ...prev,
                aiQuota: {
                  usedToday: Number(q.usedToday) || 0,
                  dailyLimit: Number(q.dailyLimit) || 0,
                  remaining: Number(q.remaining ?? 0),
                },
              }
            : prev));
        }
        const hint = err.response?.data?.upgradeHint;
        setTipsMsg({ type: 'err', text: hint || t('profile.quotaExhausted') });
      } else {
        setTipsMsg({
          type: 'err',
          text: err.response?.data?.error || err.message || t('errors.requestFailed'),
        });
      }
    } finally {
      setTipsLoading(false);
    }
  };

  const fillGeolocation = (setter) => {
    if (!navigator.geolocation) {
      setGeoMessage(t('profile.geoNotSupported'));
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
        setGeoMessage(t('profile.geoPermissionDenied'));
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
      setError(err.response?.data?.error || err.message || t('profile.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    if (!newProfile.birthday?.trim() && (newProfile.age === '' || newProfile.age == null)) {
      setError(t('profile.validationAgeOrBirthday'));
      return;
    }
    setCreating(true);

    try {
      await api.post('/me/profile', profileToPayload(newProfile));
      const me = await api.get('/me');
      setProfile(normalizeProfile(me.data));
      setNotFound(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('profile.createFailed'));
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
      setPwdMsg({ type: 'err', text: t('profile.pwdTooShort') });
      return;
    }
    setPwdBusy(true);
    try {
      await api.put('/me/password', { currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdCurrent('');
      setPwdNew('');
      setPwdMsg({ type: 'ok', text: t('profile.pwdUpdated') });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || t('profile.pwdChangeFailed');
      setPwdMsg({ type: 'err', text: msg });
    } finally {
      setPwdBusy(false);
    }
  };

  const submitDeleteAccount = async (e) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!profile?.email || deleteConfirmEmail.trim().toLowerCase() !== String(profile.email).toLowerCase()) {
      setPwdMsg({ type: 'err', text: t('profile.deleteEmailMismatch') });
      return;
    }
    if (!window.confirm(t('profile.deleteConfirm'))) return;
    setDeleteBusy(true);
    try {
      await api.delete('/me');
      localStorage.removeItem('token');
      if (onLogout) onLogout();
      navigate('/login');
    } catch (err) {
      setPwdMsg({ type: 'err', text: err.response?.data?.error || err.message || t('profile.deleteFailed') });
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading) return (
    <div className="loading fade-in">
      <div className="pulse">{t('profile.loading')}</div>
    </div>
  );

  if (error) return (
    <div className="error fade-in">
      <div>❌ {t('profile.loadError')}</div>
      <div style={{ fontSize: '14px', marginTop: '8px' }}>{error}</div>
    </div>
  );

  if (notFound && !profile) {
    return (
      <div className="fade-in">
        <div className="card">
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>{t('profile.createTitle')}</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <input value={newProfile.name} onChange={e => setNewProfile(prev => ({ ...prev, name: e.target.value }))} placeholder={t('profile.placeholderNickname')} className="form-input" required />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>{t('profile.gender')}</label>
              <select
                value={newProfile.gender}
                onChange={(e) => setNewProfile((prev) => ({ ...prev, gender: e.target.value }))}
                className="form-input"
              >
                <option value="">{t('profile.genderPlaceholder')}</option>
                <option value="MALE">{t('profile.genderMale')}</option>
                <option value="FEMALE">{t('profile.genderFemale')}</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>{t('profile.birthday')}</label>
              <input
                value={newProfile.birthday}
                onChange={(e) => setNewProfile((prev) => ({ ...prev, birthday: e.target.value }))}
                className="form-input"
                type="date"
              />
            </div>
            <div className="form-group">
              <input value={newProfile.age} onChange={e => setNewProfile(prev => ({ ...prev, age: e.target.value }))} placeholder={t('profile.age')} className="form-input" type="number" />
            </div>
            <div className="form-group">
              <input
                value={newProfile.interestsText}
                onChange={(e) => setNewProfile((prev) => ({ ...prev, interestsText: e.target.value }))}
                placeholder={t('profile.interestsHint')}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input value={newProfile.location} onChange={e => setNewProfile(prev => ({ ...prev, location: e.target.value }))} placeholder={t('profile.placeholderLocation')} className="form-input" />
            </div>
            <div className="form-group">
              <input value={newProfile.distance} onChange={e => setNewProfile(prev => ({ ...prev, distance: e.target.value }))} placeholder={t('profile.placeholderDistance')} className="form-input" />
            </div>
            <div className="form-group">
              <input value={newProfile.education} onChange={e => setNewProfile(prev => ({ ...prev, education: e.target.value }))} placeholder={t('profile.placeholderEducation')} className="form-input" />
            </div>
            <div className="form-group">
              <input value={newProfile.work} onChange={e => setNewProfile(prev => ({ ...prev, work: e.target.value }))} placeholder={t('profile.placeholderWork')} className="form-input" />
            </div>
            <div className="form-group">
              <input value={newProfile.hobby} onChange={e => setNewProfile(prev => ({ ...prev, hobby: e.target.value }))} placeholder={t('profile.placeholderHobby')} className="form-input" />
            </div>
            <div className="form-group">
              <textarea value={newProfile.bio} onChange={e => setNewProfile(prev => ({ ...prev, bio: e.target.value }))} placeholder={t('profile.placeholderBio')} className="form-input" rows={4} />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={locLoading}
                onClick={() => fillGeolocation(setNewProfile)}
              >
                {locLoading ? t('profile.geoGetting') : t('profile.geoUseLocation')}
              </button>
              {(newProfile.latitude != null && newProfile.longitude != null) ? (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {t('profile.geoWillSave', { lat: newProfile.latitude.toFixed(5), lon: newProfile.longitude.toFixed(5) })}
                </span>
              ) : null}
              {geoMessage ? (
                <span style={{ fontSize: '12px', color: '#e17055' }}>{geoMessage}</span>
              ) : null}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creating}>{creating ? t('profile.creating') : t('profile.createProfile')}</button>
          </form>
        </div>
      </div>
    );
  }

  if (!profile) return (
    <div className="empty fade-in">
      <div>👤 {t('profile.missingProfileTitle')}</div>
      <div style={{ fontSize: '14px', marginTop: '8px' }}>{t('profile.missingProfileHint')}</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          {profile.photos && profile.photos.length > 0 ? (
            <div className="profile-photo-grid" role="list" aria-label={t('profile.photosAria')}>
              {profile.photos.slice(0, 6).map((url, i) => (
                <div key={`${url}-${i}`} className="profile-photo-grid-cell" role="listitem">
                  <img src={url} alt="" loading="lazy" decoding="async" />
                </div>
              ))}
            </div>
          ) : profile.avatar ? (
            <img
              src={profile.avatar}
              alt=""
              className="profile-hero-photo profile-hero-photo-img"
              loading="lazy"
              decoding="async"
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
            {profile.name || profile.username || t('profile.yourProfileTitle')}
          </h1>
          <div className="profile-member-line">
            <span className={profile.subscriptionPlan === 'FREE' ? 'profile-plan-muted' : 'profile-premium-pill'}>
              {profile.subscriptionPlan === 'GOLD'
                ? t('profile.planGold')
                : profile.subscriptionPlan === 'PLUS'
                  ? t('profile.planPlus')
                  : t('profile.planFree')}
            </span>
          </div>
          <nav className="profile-quick-links" aria-label={t('profile.quickLinksAria')}>
            <Link to="/">{t('nav.discover')}</Link>
            <span className="profile-quick-sep" aria-hidden>·</span>
            <Link to="/photos">
              {t('profile.photosLink')}
              {' '}
              ({(profile.photos && profile.photos.length) || 0}/6)
            </Link>
            <span className="profile-quick-sep" aria-hidden>·</span>
            <Link to="/upgrade">{t('profile.upgradePlansLink')}</Link>
          </nav>
        </div>

        {isEditing ? (
          <form onSubmit={saveEdit}>
            <div className="form-group">
              <input value={editedProfile.name} onChange={e => setEditedProfile(prev => ({ ...prev, name: e.target.value }))} placeholder={t('profile.placeholderNickname')} className="form-input" required />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>{t('profile.gender')}</label>
              <select
                value={editedProfile.gender}
                onChange={(e) => setEditedProfile((prev) => ({ ...prev, gender: e.target.value }))}
                className="form-input"
              >
                <option value="">{t('profile.genderPlaceholder')}</option>
                <option value="MALE">{t('profile.genderMale')}</option>
                <option value="FEMALE">{t('profile.genderFemale')}</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--text-secondary)' }}>{t('profile.birthday')}</label>
              <input
                value={editedProfile.birthday}
                onChange={(e) => setEditedProfile((prev) => ({ ...prev, birthday: e.target.value }))}
                className="form-input"
                type="date"
              />
            </div>
            <div className="form-group">
              <input value={editedProfile.age} onChange={e => setEditedProfile(prev => ({ ...prev, age: e.target.value }))} placeholder={t('profile.age')} className="form-input" type="number" />
            </div>
            <div className="form-group">
              <input
                value={editedProfile.interestsText}
                onChange={(e) => setEditedProfile((prev) => ({ ...prev, interestsText: e.target.value }))}
                placeholder={t('profile.interestsHint')}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input value={editedProfile.location} onChange={e => setEditedProfile(prev => ({ ...prev, location: e.target.value }))} placeholder={t('profile.placeholderLocation')} className="form-input" />
            </div>
            <div className="form-group">
              <input value={editedProfile.distance} onChange={e => setEditedProfile(prev => ({ ...prev, distance: e.target.value }))} placeholder={t('profile.placeholderDistanceEdit')} className="form-input" />
            </div>
            <div className="form-group">
              <input value={editedProfile.education} onChange={e => setEditedProfile(prev => ({ ...prev, education: e.target.value }))} placeholder={t('profile.placeholderEducation')} className="form-input" />
            </div>
            <div className="form-group">
              <input value={editedProfile.work} onChange={e => setEditedProfile(prev => ({ ...prev, work: e.target.value }))} placeholder={t('profile.placeholderWork')} className="form-input" />
            </div>
            <div className="form-group">
              <input value={editedProfile.hobby} onChange={e => setEditedProfile(prev => ({ ...prev, hobby: e.target.value }))} placeholder={t('profile.placeholderHobby')} className="form-input" />
            </div>
            <div className="form-group">
              <textarea value={editedProfile.bio} onChange={e => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))} placeholder={t('profile.placeholderBio')} className="form-input" rows={3} />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={locLoading}
                onClick={() => fillGeolocation(setEditedProfile)}
              >
                {locLoading ? t('profile.geoGetting') : t('profile.geoUseLocation')}
              </button>
              {(editedProfile.latitude != null && editedProfile.longitude != null) ? (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {t('profile.geoCoordsOnSave', { lat: editedProfile.latitude.toFixed(5), lon: editedProfile.longitude.toFixed(5) })}
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {t('profile.geoPositionHelp')}
                </span>
              )}
              {geoMessage ? (
                <span style={{ fontSize: '12px', color: '#e17055' }}>{geoMessage}</span>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('common.save')}</button>
              <button type="button" onClick={cancelEdit} className="btn btn-ghost" style={{ flex: 1 }}>{t('common.cancel')}</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              {renderProfileRow(t('profile.email'), profile.email, t)}
              {renderProfileRow(t('profile.gender'), profile.gender === 'MALE' ? t('profile.genderMale') : profile.gender === 'FEMALE' ? t('profile.genderFemale') : null, t)}
              {renderProfileRow(t('profile.birthday'), profile.birthday || null, t)}
              {renderProfileRow(t('profile.age'), profile.age, t)}
              {renderProfileRow(t('profile.interests'), profile.interests?.length ? profile.interests.join(', ') : null, t)}
              {renderProfileRow(t('profile.location'), profile.location, t)}
              {(profile.latitude != null && profile.longitude != null) ? (
                renderProfileRow(t('profile.mapPositionLabel'), t('profile.mapPositionValue'), t)
              ) : null}
              {renderProfileRow(t('profile.discoverRadius'), profile.distance ? `${profile.distance} km` : null, t)}
              {renderProfileRow(t('profile.education'), profile.education, t)}
              {renderProfileRow(t('profile.work'), profile.work, t)}
              {renderProfileRow(t('profile.hobby'), profile.hobby, t)}
              <div style={{ padding: '12px 0' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>{t('profile.bio')}</span>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>{profile.bio || t('profile.noBioYet')}</p>
              </div>
            </div>

            <div
              style={{
                marginTop: '8px',
                paddingTop: '16px',
                borderTop: '1px solid var(--bg-secondary)',
              }}
            >
              <h3 style={{ fontSize: '1rem', marginBottom: '6px', color: 'var(--text-primary)' }}>
                {t('profile.aiTipsTitle')}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                {t('profile.aiTipsHint')}
              </p>
              {profile.aiQuota && (profile.aiQuota.dailyLimit > 0 || profile.aiQuota.fairUseCap) ? (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {profile.aiQuota.fairUseCap
                    ? t('profile.aiQuotaFairUse', {
                        remaining: profile.aiQuota.remaining,
                        limit: profile.aiQuota.dailyLimit,
                      })
                    : t('profile.aiQuota', {
                        remaining: profile.aiQuota.remaining,
                        limit: profile.aiQuota.dailyLimit,
                      })}
                </p>
              ) : null}
              {tipsMsg ? (
                <div
                  className={`profile-form-flash ${tipsMsg.type === 'err' ? 'profile-form-flash-err' : 'profile-form-flash-ok'}`}
                  style={{ marginBottom: '8px' }}
                >
                  {tipsMsg.text}
                </div>
              ) : null}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchProfileTips}
                disabled={tipsLoading}
              >
                {tipsLoading ? t('profile.aiTipsLoading') : t('profile.aiTipsButton')}
              </button>
              {profileTips.length > 0 ? (
                <ul
                  style={{
                    marginTop: '12px',
                    paddingLeft: '18px',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    lineHeight: 1.45,
                  }}
                >
                  {profileTips.map((tip, i) => (
                    <li key={`${i}-${tip.title}`} style={{ marginBottom: '10px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{tip.title}</strong>
                      {tip.detail ? ` — ${tip.detail}` : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="profile-actions-clean">
              <button type="button" className="btn btn-primary profile-btn-main" onClick={startEdit}>
                {t('profile.editProfile')}
              </button>
              <div className="profile-secondary-row">
                <Link to="/upgrade" className="profile-upgrade-btn">
                  {t('profile.upgradePlansLink')}
                </Link>
                <button type="button" className="profile-logout-text" onClick={handleLogout}>
                  {t('profile.logOut')}
                </button>
              </div>
            </div>

            <details className="profile-account-details">
              <summary>{t('profile.accountSecurity')}</summary>
              <div className="profile-account-body">
                {pwdMsg ? (
                  <div
                    className={`profile-form-flash ${pwdMsg.type === 'ok' ? 'profile-form-flash-ok' : 'profile-form-flash-err'}`}
                  >
                    {pwdMsg.text}
                  </div>
                ) : null}
                <form onSubmit={submitPasswordChange} className="profile-account-form">
                  <h3 className="profile-account-h3">{t('profile.changePassword')}</h3>
                  <div className="form-group">
                    <input
                      type="password"
                      className="form-input"
                      placeholder={t('profile.currentPasswordPlaceholder')}
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
                      placeholder={t('profile.newPasswordPlaceholder')}
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
                    {pwdBusy ? t('profile.savingPassword') : t('profile.updatePassword')}
                  </button>
                </form>
                <form onSubmit={submitDeleteAccount} className="profile-account-form profile-delete-form">
                  <h3 className="profile-account-h3">{t('profile.deleteAccount')}</h3>
                  <p className="profile-account-hint">
                    {t('profile.deleteHint')}
                    {' '}
                    <strong>{profile.email}</strong>
                  </p>
                  <div className="form-group">
                    <input
                      type="email"
                      className="form-input"
                      placeholder={t('profile.deleteEmailPlaceholder')}
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      disabled={deleteBusy}
                    />
                  </div>
                  <button type="submit" className="profile-delete-btn" disabled={deleteBusy}>
                    {deleteBusy ? t('common.deleting') : t('profile.deleteMyAccount')}
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

function renderProfileRow(label, value, t) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bg-secondary)' }}>
      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{value || t('profile.valueNotSet')}</span>
    </div>
  );
}
