import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import DiscoverSettingsPanel from './DiscoverSettingsPanel';
import { mergeDiscoveryFromApi, mergeLifestyleFromApi } from './discoveryDefaults';

const placeholderAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

function cardUserId(user) {
  return user?.id ?? user?.userId;
}

function galleryUrls(user, placeholder) {
  const list = user?.photos;
  if (Array.isArray(list) && list.length > 0) return list.filter(Boolean);
  const one = user?.avatar || user?.photoUrl;
  return one ? [one] : [placeholder];
}

function distanceBadgeLabel(user) {
  if (user?.distanceFromYouKm != null) return `📍 ${user.distanceFromYouKm} km away`;
  const loc = user?.city || user?.location;
  if (loc) return `📍 ${loc}`;
  return '💙 Open to chat';
}

function IconSliders({ size = 22 }) {
  /* Three horizontal tracks with knobs - reads as "filters / discovery" */
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="6" r="2.5" fill="currentColor" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="12" r="2.5" fill="currentColor" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="18" r="2.5" fill="currentColor" />
    </svg>
  );
}

function DiscoverCardPhotos({ user, placeholder }) {
  const uid = cardUserId(user);
  const gallery = useMemo(() => galleryUrls(user, placeholder), [user, placeholder]);
  const [idx, setIdx] = useState(0);
  const [srcFailed, setSrcFailed] = useState(false);
  const n = gallery.length;

  useEffect(() => {
    setIdx(0);
  }, [uid]);

  useEffect(() => {
    setSrcFailed(false);
  }, [uid, idx]);

  const prev = (e) => {
    e?.stopPropagation?.();
    setIdx((i) => (i - 1 + n) % n);
  };
  const next = (e) => {
    e?.stopPropagation?.();
    setIdx((i) => (i + 1) % n);
  };

  const rawSrc = gallery[idx];
  const imgSrc = srcFailed ? placeholder : rawSrc;

  return (
    <>
      <img
        src={imgSrc}
        alt=""
        className="youme-card-image-bg"
        onError={() => setSrcFailed(true)}
        loading="lazy"
        decoding="async"
      />
      {n > 1 ? (
        <>
          <button type="button" className="youme-photo-tap youme-photo-tap--prev" onClick={prev} aria-label="Previous photo" />
          <button type="button" className="youme-photo-tap youme-photo-tap--next" onClick={next} aria-label="Next photo" />
          <div className="youme-photo-dots" aria-label="Photos">
            {gallery.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`youme-photo-dot${i === idx ? ' active' : ''}`}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === idx ? 'true' : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx(i);
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

function normalizeInterests(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return [];
}

function IconChevronUp({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M7 14.5L12 9.5l5 5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDown({ size = 24 }) {
  /* Filled shape — stroke-only chevrons can disappear on white buttons (inherit / subpixel). */
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#0f0f14"
        d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"
      />
    </svg>
  );
}

function DetailRow({ icon, label, value }) {
  if (value == null || String(value).trim() === '') return null;
  return (
    <div className="discover-detail-row">
      <span className="discover-detail-row-icon" aria-hidden>{icon}</span>
      <div className="discover-detail-row-text">
        <div className="discover-detail-row-label">{label}</div>
        <div className="discover-detail-row-value">{value}</div>
      </div>
    </div>
  );
}

function ProfileDetailOverlay({
  user,
  open,
  onClose,
  onDislike,
  onLike,
  onSuper,
  animating,
  placeholderAvatar: ph,
}) {
  const uid = user ? cardUserId(user) : null;
  const gallery = useMemo(
    () => (user ? galleryUrls(user, ph) : [ph]),
    [user, ph],
  );
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroFailed, setHeroFailed] = useState(false);

  useEffect(() => {
    if (open) setHeroIdx(0);
  }, [open, uid]);

  useEffect(() => {
    setHeroFailed(false);
  }, [open, uid, heroIdx]);

  if (!open || !user) return null;

  const name = user.name || user.displayName || 'Member';
  const age = user.age != null ? user.age : null;
  const interests = normalizeInterests(user.interests);
  const n = gallery.length;

  const lookingParts = [];
  if (user.minAge != null && user.maxAge != null) {
    lookingParts.push(`Ages ${user.minAge}–${user.maxAge}`);
  } else if (user.minAge != null) {
    lookingParts.push(`From age ${user.minAge}`);
  } else if (user.maxAge != null) {
    lookingParts.push(`Up to age ${user.maxAge}`);
  }
  if (user.distanceKm != null) {
    lookingParts.push(`Within ~${user.distanceKm} km`);
  }

  const hasEssentials =
    age != null
    || (user.gender && String(user.gender).trim())
    || (user.city && String(user.city).trim())
    || (user.location && String(user.location).trim())
    || (user.education && String(user.education).trim())
    || (user.occupation && String(user.occupation).trim())
    || (user.hobbies && String(user.hobbies).trim())
    || user.distanceKm != null
    || user.distanceFromYouKm != null
    || user.isPremium;

  const distanceDetailValue =
    user.distanceFromYouKm != null
      ? `About ${user.distanceFromYouKm} km from you`
      : user.distanceKm != null
        ? `${user.distanceKm} km`
        : null;

  const heroPrev = (e) => {
    e?.stopPropagation?.();
    setHeroIdx((i) => (i - 1 + n) % n);
  };
  const heroNext = (e) => {
    e?.stopPropagation?.();
    setHeroIdx((i) => (i + 1) % n);
  };

  return (
    <div
      className="discover-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discover-detail-title"
      onClick={onClose}
    >
      <div
        className="discover-detail-inner"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="discover-detail-scroll">
        <div className="discover-detail-hero">
          <img
            src={heroFailed ? ph : gallery[heroIdx]}
            alt=""
            className="discover-detail-hero-bg"
            onError={() => setHeroFailed(true)}
            loading="lazy"
            decoding="async"
          />
          <div className="discover-detail-hero-shade" />
          {n > 1 ? (
            <>
              <button
                type="button"
                className="youme-photo-tap youme-photo-tap--prev"
                onClick={heroPrev}
                aria-label="Previous photo"
              />
              <button
                type="button"
                className="youme-photo-tap youme-photo-tap--next"
                onClick={heroNext}
                aria-label="Next photo"
              />
              <div className="youme-photo-dots" aria-label="Photos">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`youme-photo-dot${i === heroIdx ? ' active' : ''}`}
                    aria-label={`Photo ${i + 1}`}
                    aria-current={i === heroIdx ? 'true' : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHeroIdx(i);
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="discover-detail-header">
          <div className="discover-detail-header-text">
            <h2 id="discover-detail-title" className="discover-detail-name-age">
              <span className="discover-detail-name">{name}</span>
              {age != null ? <span className="discover-detail-age">{age}</span> : null}
            </h2>
          </div>
          <button
            type="button"
            className="discover-detail-close"
            onClick={onClose}
            aria-label="Close profile details"
          >
            <IconChevronDown />
          </button>
        </div>

        {lookingParts.length > 0 && (
          <section className="discover-detail-card">
            <h3 className="discover-detail-section-title">
              <span className="discover-detail-section-emoji" aria-hidden>🔎</span>
              Looking for
            </h3>
            <p className="discover-detail-pill-text">{lookingParts.join(' · ')}</p>
          </section>
        )}

        {(user.bio || '').trim() !== '' && (
          <section className="discover-detail-card">
            <h3 className="discover-detail-section-title">
              <span className="discover-detail-section-emoji" aria-hidden>❝</span>
              About me
            </h3>
            <p className="discover-detail-bio">{user.bio}</p>
          </section>
        )}

        {hasEssentials ? (
          <section className="discover-detail-card">
            <h3 className="discover-detail-section-title">
              <span className="discover-detail-section-emoji" aria-hidden>📋</span>
              Essentials
            </h3>
            <div className="discover-detail-rows">
              <DetailRow icon="🎂" label="Age" value={age != null ? `${age}` : null} />
              <DetailRow icon="⚧" label="Gender" value={user.gender} />
              <DetailRow icon="📍" label="Location" value={user.city || user.location} />
              <DetailRow icon="🎓" label="Education" value={user.education} />
              <DetailRow icon="💼" label="Work" value={user.occupation} />
              <DetailRow icon="✨" label="Hobbies" value={user.hobbies} />
              <DetailRow icon="📏" label="Distance" value={distanceDetailValue} />
              {user.isPremium ? (
                <DetailRow icon="⭐" label="Member" value="Premium" />
              ) : null}
            </div>
          </section>
        ) : null}

        {interests.length > 0 && (
          <section className="discover-detail-card">
            <h3 className="discover-detail-section-title">
              <span className="discover-detail-section-emoji" aria-hidden>💜</span>
              Interests
            </h3>
            <div className="discover-detail-chips">
              {interests.map((tag, i) => (
                <span key={`${tag}-${i}`} className="discover-detail-chip">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {(() => {
          const life = user.lifestyle && typeof user.lifestyle === 'object' ? user.lifestyle : null;
          if (!life) return null;
          const labels = {
            lookingFor: 'Looking for',
            zodiac: 'Zodiac',
            education: 'Education',
            familyPlans: 'Family plans',
            communicationStyle: 'Communication',
            loveStyle: 'Love style',
            pets: 'Pets',
            drinking: 'Drinking',
            smoking: 'Smoking',
            workout: 'Workout',
            socialMedia: 'Social media',
          };
          const langs = Array.isArray(life.languages) ? life.languages.filter(Boolean).join(', ') : '';
          const rows = Object.keys(labels)
            .map((k) => ({ k, v: life[k] }))
            .filter(({ v }) => v != null && String(v).trim() !== '');
          if (rows.length === 0 && !langs) return null;
          return (
            <section className="discover-detail-card">
              <h3 className="discover-detail-section-title">
                <span className="discover-detail-section-emoji" aria-hidden>✨</span>
                Lifestyle
              </h3>
              <div className="discover-detail-rows">
                {rows.map(({ k, v }) => (
                  <DetailRow key={k} icon="•" label={labels[k]} value={String(v)} />
                ))}
                {langs ? <DetailRow icon="🌐" label="Languages" value={langs} /> : null}
              </div>
            </section>
          );
        })()}

        {lookingParts.length === 0 && (user.bio || '').trim() === '' && !hasEssentials && interests.length === 0 && (
          <section className="discover-detail-card discover-detail-card-muted">
            <p className="discover-detail-muted-text">They haven&apos;t added much yet — start a chat after you match to learn more.</p>
          </section>
        )}
      </div>

      <div className="discover-detail-footer">
        <div className="youme-action-row discover-detail-actions">
          <button
            type="button"
            onClick={onDislike}
            className="youme-action dislike"
            disabled={animating}
            title="Pass"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={onSuper}
            className="youme-action super"
            disabled={animating}
            title="Super Like"
          >
            ★
          </button>
          <button
            type="button"
            onClick={onLike}
            className="youme-action like"
            disabled={animating}
            title="Like"
          >
            ♥
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [swipeClass, setSwipeClass] = useState('');
  const [matchModal, setMatchModal] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [discoveryLimited, setDiscoveryLimited] = useState(false);
  const [activeRadiusKm, setActiveRadiusKm] = useState(null);
  const [viewerHasCoords, setViewerHasCoords] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [maxKm, setMaxKm] = useState(50);
  const [settingsHasCoords, setSettingsHasCoords] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [geoHint, setGeoHint] = useState(null);
  const [discoverySettings, setDiscoverySettings] = useState(() => mergeDiscoveryFromApi(null));
  const [lifestyle, setLifestyle] = useState(() => mergeLifestyleFromApi(null));
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(35);

  const loadFeed = useCallback(() => {
    setLoading(true);
    setError(null);
    setCurrent(0);
    return api
      .get('/feed')
      .then((feedRes) => {
        setUsers(Array.isArray(feedRes.data) ? feedRes.data : []);
        setLoading(false);
        return api.get('/me').catch(() => null);
      })
      .then((meRes) => {
        if (!meRes) return;
        const d = meRes.data;
        const km = d?.distanceKm;
        const lim = km != null && km > 0;
        setDiscoveryLimited(lim);
        setActiveRadiusKm(lim && typeof km === 'number' ? km : null);
        const lat = d?.latitude;
        const lon = d?.longitude;
        setViewerHasCoords(
          lat != null && lon != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)),
        );
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Request failed');
        setLoading(false);
      });
  }, []);

  const openDiscoverySettings = useCallback(() => {
    setSettingsOpen(true);
    setSettingsError(null);
    setGeoHint(null);
    api.get('/me')
      .then((res) => {
        const data = res.data;
        const km = data?.distanceKm;
        const limited = km != null && km > 0;
        setLimitEnabled(limited);
        setMaxKm(limited && typeof km === 'number' ? km : 50);
        const lat = data?.latitude;
        const lon = data?.longitude;
        setSettingsHasCoords(
          lat != null && lon != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)),
        );
        setDiscoverySettings(mergeDiscoveryFromApi(data));
        setLifestyle(mergeLifestyleFromApi(data));
        const a = data?.minAge;
        const b = data?.maxAge;
        if (typeof a === 'number' && Number.isFinite(a)) setMinAge(Math.max(18, Math.min(80, a)));
        if (typeof b === 'number' && Number.isFinite(b)) setMaxAge(Math.max(18, Math.min(80, b)));
      })
      .catch(() => {
        setSettingsError('Could not load your settings.');
      });
  }, []);

  const saveDiscoverySettings = useCallback(async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      let a = minAge;
      let b = maxAge;
      if (a > b) [a, b] = [b, a];
      await api.put('/me/discovery-settings', {
        maxDistanceKm: limitEnabled ? maxKm : null,
        minAge: a,
        maxAge: b,
        discoverySettings,
        lifestyle,
      });
      setSettingsOpen(false);
      await loadFeed();
    } catch (err) {
      setSettingsError(err.response?.data?.error || err.message || 'Could not save');
    } finally {
      setSettingsSaving(false);
    }
  }, [limitEnabled, maxKm, minAge, maxAge, discoverySettings, lifestyle, loadFeed]);

  const useDiscoveryLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoHint('Location is not supported in this browser.');
      return;
    }
    setLocLoading(true);
    setGeoHint(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.put('/me/discovery-settings', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setSettingsHasCoords(true);
        } catch (err) {
          setGeoHint(err.response?.data?.error || err.message || 'Could not save location');
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        setGeoHint('Could not read your location. Check browser permissions.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    setDetailOpen(false);
  }, [current]);

  useEffect(() => {
    if (!detailOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setDetailOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [detailOpen]);

  const advance = useCallback(() => {
    setCurrent((prev) => prev + 1);
  }, []);

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

  const closeDetailAnd = (fn) => {
    setDetailOpen(false);
    fn();
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

  const deckExhausted = users.length === 0 || current >= users.length;

  if (deckExhausted) {
    return (
      <div className="fade-in">
        <DiscoverSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          discoverySettings={discoverySettings}
          setDiscoverySettings={setDiscoverySettings}
          lifestyle={lifestyle}
          setLifestyle={setLifestyle}
          minAge={minAge}
          maxAge={maxAge}
          setMinAge={setMinAge}
          setMaxAge={setMaxAge}
          limitEnabled={limitEnabled}
          setLimitEnabled={setLimitEnabled}
          maxKm={maxKm}
          setMaxKm={setMaxKm}
          hasCoords={settingsHasCoords}
          locLoading={locLoading}
          geoHint={geoHint}
          onUseLocation={useDiscoveryLocation}
          onSave={saveDiscoverySettings}
          saving={settingsSaving}
          saveError={settingsError}
        />
        <div className="empty discover-empty">
          <div className="discover-empty-icon" aria-hidden>✨</div>
          <h2>You&apos;re all caught up</h2>
          {discoveryLimited ? (
            <p>
              Strong discovery filters (distance, age, modes, or deal-breakers) may be hiding everyone. Loosen
              filters in
              {' '}
              <strong>Discovery settings</strong>
              {' '}
              and refresh.
            </p>
          ) : (
            <p>Passes and likes clear from this list. Check back later or refresh.</p>
          )}
          <div className="discover-empty-actions">
            <button type="button" className="btn btn-secondary" onClick={openDiscoverySettings}>
              Discovery settings
            </button>
            <button type="button" className="btn btn-primary" onClick={loadFeed}>Refresh deck</button>
          </div>
        </div>
      </div>
    );
  }

  const user = users[current];
  const nextUser = users[current + 1];
  const progress = ((current + 1) / users.length) * 100;

  return (
    <div className="fade-in discover-root">
      <DiscoverSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        discoverySettings={discoverySettings}
        setDiscoverySettings={setDiscoverySettings}
        lifestyle={lifestyle}
        setLifestyle={setLifestyle}
        minAge={minAge}
        maxAge={maxAge}
        setMinAge={setMinAge}
        setMaxAge={setMaxAge}
        limitEnabled={limitEnabled}
        setLimitEnabled={setLimitEnabled}
        maxKm={maxKm}
        setMaxKm={setMaxKm}
        hasCoords={settingsHasCoords}
        locLoading={locLoading}
        geoHint={geoHint}
        onUseLocation={useDiscoveryLocation}
        onSave={saveDiscoverySettings}
        saving={settingsSaving}
        saveError={settingsError}
      />
      <ProfileDetailOverlay
        user={user}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDislike={() => closeDetailAnd(() => handleAction('dislike'))}
        onLike={() => closeDetailAnd(() => handleAction('like'))}
        onSuper={() => closeDetailAnd(() => handleAction('super'))}
        animating={animating}
        placeholderAvatar={placeholderAvatar}
      />

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

      <header className="discover-header discover-header--toolbar">
        <div className="discover-header-top">
          <button
            type="button"
            className="discover-settings-trigger"
            onClick={openDiscoverySettings}
            aria-label="Discovery settings"
            title="Discovery settings"
          >
            <IconSliders />
          </button>
          <div className="discover-header-main">
            <h1>Discover</h1>
            <p>Swipe-style matching — pass, like, or super like</p>
            {discoveryLimited && activeRadiusKm != null ? (
              <p className={`discover-filter-chip${viewerHasCoords ? '' : ' discover-filter-chip-warn'}`}>
                {viewerHasCoords ? (
                  <>
                    Within ~
                    {activeRadiusKm}
                    {' '}
                    km — adjust with the filter button
                  </>
                ) : (
                  <>
                    ~
                    {activeRadiusKm}
                    {' '}
                    km selected — add your location in Discovery settings for this to apply
                  </>
                )}
              </p>
            ) : null}
          </div>
          <div className="discover-settings-trigger-spacer" aria-hidden />
        </div>
        <div className="discover-progress-track">
          <div className="discover-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="discover-progress-label">{current + 1} / {users.length}</span>
      </header>

      <div className="youme-stack">
        {nextUser && (
          <div
            className="youme-card next"
            aria-hidden
          >
            <div className="youme-card-image">
              <DiscoverCardPhotos user={nextUser} placeholder={placeholderAvatar} />
              <div className="youme-badge">{distanceBadgeLabel(nextUser)}</div>
            </div>
          <div className="youme-meta">
            <div className="youme-meta-top">
              <div className="youme-identity">
                <h2 className="youme-name-age">
                  <span className="youme-display-name">{nextUser.name || nextUser.displayName || 'Member'}</span>
                  {nextUser.age != null ? (
                    <span className="youme-display-age">{nextUser.age}</span>
                  ) : null}
                </h2>
              </div>
            </div>
            <div className="youme-info">
              <p>{nextUser.bio || 'Say hi and see where it goes.'}</p>
            </div>
          </div>
          </div>
        )}

        <div className={`youme-card ${animating ? `animating ${swipeClass}` : ''}`}>
          <div className="youme-card-image">
            <DiscoverCardPhotos user={user} placeholder={placeholderAvatar} />
            <div className="youme-badge">{distanceBadgeLabel(user)}</div>
          </div>

          <div className="youme-meta">
            <div className="youme-meta-top">
              <div className="youme-identity">
                <h2 className="youme-name-age">
                  <span className="youme-display-name">{user.name || user.displayName || 'Member'}</span>
                  {user.age != null ? (
                    <span className="youme-display-age">{user.age}</span>
                  ) : null}
                </h2>
              </div>
              <button
                type="button"
                className="discover-expand-btn"
                onClick={() => setDetailOpen(true)}
                aria-label="View full profile"
                title="View full profile"
              >
                <IconChevronUp />
              </button>
            </div>
            <div className="youme-info">
              <p>{user.bio || 'Excited to meet people and create great stories.'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="youme-action-row">
        <button
          type="button"
          onClick={() => handleAction('dislike')}
          className="youme-action dislike"
          disabled={animating}
          title="Pass"
        >
          ✕
        </button>

        <button
          type="button"
          onClick={() => handleAction('super')}
          className="youme-action super"
          disabled={animating}
          title="Super Like"
        >
          ★
        </button>

        <button
          type="button"
          onClick={() => handleAction('like')}
          className="youme-action like"
          disabled={animating}
          title="Like"
        >
          ♥
        </button>
      </div>

    </div>
  );
}
