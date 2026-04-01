import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

const placeholderAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

function cardUserId(user) {
  return user?.id ?? user?.userId;
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
  if (!open || !user) return null;

  const name = user.name || user.displayName || 'Member';
  const age = user.age != null ? user.age : null;
  const interests = normalizeInterests(user.interests);
  const photo = user.avatar || user.photoUrl || ph;

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
    || user.isPremium;

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
        <div
          className="discover-detail-hero"
          style={{ backgroundImage: `url(${photo})` }}
        >
          <div className="discover-detail-hero-shade" />
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
              <DetailRow icon="📏" label="Distance" value={user.distanceKm != null ? `${user.distanceKm} km away` : null} />
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

      <header className="discover-header">
        <h1>Discover</h1>
        <p>Swipe-style matching — pass, like, or super like</p>
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
            <div
              className="youme-card-image"
              style={{
                backgroundImage: `url(${nextUser.avatar || nextUser.photoUrl || placeholderAvatar})`,
              }}
            >
              <div className="youme-badge">
                {nextUser.location ? `📍 ${nextUser.location}` : 'New nearby'}
              </div>
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
          <div
            className="youme-card-image"
            style={{
              backgroundImage: `url(${user.avatar || user.photoUrl || placeholderAvatar})`,
            }}
          >
            <div className="youme-badge">
              {user.location ? `📍 ${user.location}` : '💙 Open to chat'}
            </div>
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
