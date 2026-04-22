import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { cssUrlValue } from '../imageUtils';

const FALLBACK_AVATAR = 'https://randomuser.me/api/portraits/lego/1.jpg';

function formatLikeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function LikesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('inbound');
  /** @type {{ plan?: string, likes_count?: number, locked?: boolean, placeholders?: Array<{ slot: number }>, likes?: object[], gold_features?: object } | null} */
  const [inboundPayload, setInboundPayload] = useState(null);
  const [outbound, setOutbound] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);
  /** @type {{ type: 'ok' | 'err', key?: string, text?: string } | null} */
  const [actionMsg, setActionMsg] = useState(null);
  const likeBackInFlight = useRef(false);

  const loadAll = useCallback(async () => {
    try {
      const [inRes, outRes] = await Promise.all([
        api.get('/likes/inbound'),
        api.get('/likes'),
      ]);
      const rawIn = inRes.data;
      if (Array.isArray(rawIn)) {
        setInboundPayload({
          plan: 'plus',
          likes_count: rawIn.length,
          locked: false,
          likes: rawIn,
        });
      } else {
        setInboundPayload(rawIn && typeof rawIn === 'object' ? rawIn : {});
      }
      setOutbound(Array.isArray(outRes.data) ? outRes.data : []);
      setError(null);
    } catch {
      setError(t('likes.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const likeBack = async (fromUserId) => {
    if (likeBackInFlight.current) return;
    likeBackInFlight.current = true;
    setActionBusyId(fromUserId);
    setActionMsg(null);
    try {
      const res = await api.post(`/likes/${fromUserId}`);
      if (res.data?.matched && res.data?.matchId) {
        setActionMsg({ type: 'ok', key: 'toastMatchOpening' });
        setTimeout(() => navigate(`/messages/${res.data.matchId}`), 500);
      } else {
        setActionMsg({ type: 'ok', key: 'toastLikeSent' });
      }
      await loadAll();
    } catch (err) {
      setActionMsg({
        type: 'err',
        text: err.response?.data?.error || err.message || t('likes.toastLikeBackErr'),
      });
    } finally {
      likeBackInFlight.current = false;
      setActionBusyId(null);
    }
  };

  const inboundLocked = Boolean(inboundPayload?.locked);
  const inboundCount = Number(inboundPayload?.likes_count) || 0;
  const inboundList = inboundLocked ? [] : (Array.isArray(inboundPayload?.likes) ? inboundPayload.likes : []);
  const inboundPlaceholders = inboundLocked
    ? (Array.isArray(inboundPayload?.placeholders) && inboundPayload.placeholders.length > 0
      ? inboundPayload.placeholders
      : Array.from({ length: Math.min(inboundCount, 24) }, (_, i) => ({ slot: i })))
    : [];
  const showGoldTeaser = !inboundLocked && inboundPayload?.plan === 'gold' && inboundPayload?.gold_features;
  const unlockedDisplayCount =
    inboundPayload?.likes_count != null && !Number.isNaN(Number(inboundPayload.likes_count))
      ? Number(inboundPayload.likes_count)
      : inboundList.length;

  if (loading) {
    return (
      <div className="loading fade-in">
        <div className="pulse">{t('likes.loading')}</div>
      </div>
    );
  }

  const actionDisplay = actionMsg
    ? actionMsg.type === 'ok' && actionMsg.key
      ? t(`likes.${actionMsg.key}`)
      : actionMsg.text
    : null;

  return (
    <div className="fade-in likes-hub">
      <header className="matches-hub-header">
        <h1>{t('likes.title')}</h1>
        <p>
          {t('likes.introLine1')}
          {' '}
          {t('likes.introLine2')}
          {' '}
          {t('likes.introLine3')}
        </p>
      </header>

      {error ? (
        <div className="matches-hub-error" role="alert">{error}</div>
      ) : null}

      {actionMsg ? (
        <div
          className="likes-action-toast"
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            background: actionMsg.type === 'ok' ? 'rgba(39, 174, 96, 0.12)' : 'rgba(225, 112, 85, 0.12)',
            color: actionMsg.type === 'ok' ? 'var(--success, #27ae60)' : '#c0392b',
          }}
        >
          {actionDisplay}
        </div>
      ) : null}

      <div className="likes-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'inbound'}
          className={`likes-tab ${tab === 'inbound' ? 'likes-tab-active' : ''}`}
          onClick={() => setTab('inbound')}
        >
          {t('likes.tabLikedYou')}
          {inboundCount > 0 ? (
            <span className="likes-tab-badge">{inboundCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'outbound'}
          className={`likes-tab ${tab === 'outbound' ? 'likes-tab-active' : ''}`}
          onClick={() => setTab('outbound')}
        >
          {t('likes.tabYouLiked')}
          {outbound.length > 0 ? (
            <span className="likes-tab-badge muted">{outbound.length}</span>
          ) : null}
        </button>
      </div>

      {tab === 'inbound' ? (
        inboundCount === 0 ? (
          <div className="matches-hub-empty card card-surface">
            <span className="matches-hub-empty-icon" aria-hidden>✨</span>
            <h2>{t('likes.emptyInboundTitle')}</h2>
            <p>{t('likes.emptyInboundBody')}</p>
            <Link to="/" className="btn btn-primary">{t('likes.goDiscover')}</Link>
          </div>
        ) : inboundLocked ? (
          <>
            <div className="likes-locked-banner card-surface">
              <p className="likes-locked-title">{t('likes.freeUpgradeTitle')}</p>
              <p className="likes-locked-body">{t('likes.freeUpgradeBody')}</p>
              <Link to="/upgrade" className="btn btn-primary">{t('profile.upgradePlansLink')}</Link>
            </div>
            <p className="likes-count-label">
              {t('likes.countChoseYou', { count: inboundCount })}
            </p>
            <p className="likes-locked-hint">{t('likes.lockedPreviewHint')}</p>
            <ul className="likes-list likes-list-locked" aria-hidden="true">
              {inboundPlaceholders.map((ph) => (
                <li key={`ph-${ph.slot}`}>
                  <div className="likes-row card-surface likes-row-inbound likes-row-blurred">
                    <div className="matches-avatar likes-avatar likes-avatar-placeholder" aria-hidden />
                    <div className="likes-row-body">
                      <div className="likes-row-top">
                        <span className="likes-name likes-name-blur">{t('likes.anonymousMember')}</span>
                      </div>
                      <span className="likes-status likes-status-inbound likes-text-blur">
                        {t('likes.statusLikedYouBlurred')}
                      </span>
                    </div>
                    <div className="likes-row-actions">
                      <button type="button" className="btn btn-secondary likes-msg-btn" disabled>
                        {t('likes.likeBack')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {showGoldTeaser ? (
              <p className="likes-gold-teaser" role="status">{t('likes.goldTeaser')}</p>
            ) : null}
            <p className="likes-count-label">
              {t('likes.countChoseYou', { count: unlockedDisplayCount })}
            </p>
            <ul className="likes-list">
              {inboundList.map((row) => {
                const name = row.fromUserName || t('feed.detail.member');
                const avatarUrl = row.fromUserAvatar || FALLBACK_AVATAR;
                const when = formatLikeTime(row.createdAt);
                const id = row.fromUserId;
                return (
                  <li key={row.id ?? `${id}-${row.createdAt}`}>
                    <div className="likes-row card-surface likes-row-inbound">
                      <div
                        className="matches-avatar likes-avatar"
                        style={{ backgroundImage: cssUrlValue(avatarUrl) }}
                        aria-hidden
                      />
                      <div className="likes-row-body">
                        <div className="likes-row-top">
                          <span className="likes-name">{name}</span>
                          {when ? <span className="likes-when">{when}</span> : null}
                        </div>
                        <span className="likes-status likes-status-inbound">
                          {row.superLike ? t('likes.statusSuperLikedYou') : t('likes.statusLikedYou')}
                        </span>
                        <Link to="/" className="likes-profile-link">{t('likes.discoverLink')}</Link>
                      </div>
                      <div className="likes-row-actions">
                        <button
                          type="button"
                          className="btn btn-primary likes-msg-btn"
                          disabled={actionBusyId != null}
                          onClick={() => likeBack(id)}
                        >
                          {actionBusyId === id ? '…' : t('likes.likeBack')}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )
      ) : outbound.length === 0 ? (
        <div className="matches-hub-empty card card-surface">
          <span className="matches-hub-empty-icon" aria-hidden>❤️</span>
          <h2>{t('likes.emptyOutboundTitle')}</h2>
          <p>{t('likes.emptyOutboundBody')}</p>
          <Link to="/" className="btn btn-primary">{t('likes.goDiscover')}</Link>
        </div>
      ) : (
        <>
          <p className="likes-count-label">{t('likes.countYouLiked', { count: outbound.length })}</p>
          <ul className="likes-list">
            {outbound.map((like) => {
              const name = like.toUserName || t('feed.detail.member');
              const avatarUrl = like.toUserAvatar || FALLBACK_AVATAR;
              const when = formatLikeTime(like.createdAt);
              return (
                <li key={like.id ?? `${like.toUserId}-${like.createdAt}`}>
                  <div className="likes-row card-surface">
                    <div
                      className="matches-avatar likes-avatar"
                      style={{ backgroundImage: cssUrlValue(avatarUrl) }}
                      aria-hidden
                    />
                    <div className="likes-row-body">
                      <div className="likes-row-top">
                        <span className="likes-name">{name}</span>
                        {when ? <span className="likes-when">{when}</span> : null}
                      </div>
                      <span className={`likes-status ${like.matched ? 'likes-status-match' : ''}`}>
                        {like.matched
                          ? t('likes.statusMatched')
                          : (like.superLike ? t('likes.statusSuperWaiting') : t('likes.statusLikedWaiting'))}
                      </span>
                    </div>
                    <div className="likes-row-actions">
                      {like.matched && like.matchId ? (
                        <Link to={`/messages/${like.matchId}`} className="btn btn-primary likes-msg-btn">
                          {t('likes.message')}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
