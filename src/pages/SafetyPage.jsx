import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { cssUrlValue } from '../imageUtils';

function formatWhen(iso, t) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SafetyPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [busyUserId, setBusyUserId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/me/safety');
      setBlockedUsers(Array.isArray(res.data?.blockedUsers) ? res.data.blockedUsers : []);
      setMyReports(Array.isArray(res.data?.myReports) ? res.data.myReports : []);
    } catch (err) {
      setError(err.response?.data?.error || t('safety.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const unblock = async (userId) => {
    if (!window.confirm(t('safety.confirmUnblock'))) return;
    setBusyUserId(userId);
    try {
      await api.delete(`/blocks/${userId}`);
      await load();
    } catch {
      setError(t('safety.errorUnblock'));
    } finally {
      setBusyUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading fade-in">
        <div className="pulse">{t('safety.loading')}</div>
      </div>
    );
  }

  return (
    <div className="fade-in safety-page">
      <header className="safety-header card-surface">
        <Link to="/profile" className="safety-back">‹ {t('safety.backToProfile')}</Link>
        <h1>{t('safety.title')}</h1>
        <p>{t('safety.subtitle')}</p>
      </header>

      {error ? <div className="safety-error" role="alert">{error}</div> : null}

      <section className="card card-surface safety-section">
        <h2>{t('safety.blockedTitle')}</h2>
        <p className="safety-section-lead">{t('safety.blockedLead')}</p>
        {blockedUsers.length === 0 ? (
          <p className="safety-empty">{t('safety.blockedEmpty')}</p>
        ) : (
          <ul className="safety-list">
            {blockedUsers.map((u) => (
              <li key={u.userId} className="safety-row">
                <div
                  className="safety-avatar"
                  style={u.avatar ? {
                    backgroundImage: cssUrlValue(u.avatar),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                />
                <div className="safety-row-text">
                  <span className="safety-row-name">{u.displayName || t('safety.memberFallback')}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busyUserId === u.userId}
                  onClick={() => unblock(u.userId)}
                >
                  {busyUserId === u.userId ? t('common.saving') : t('safety.unblock')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card card-surface safety-section">
        <h2>{t('safety.reportsTitle')}</h2>
        <p className="safety-section-lead">{t('safety.reportsLead')}</p>
        {myReports.length === 0 ? (
          <p className="safety-empty">{t('safety.reportsEmpty')}</p>
        ) : (
          <ul className="safety-list safety-reports-list">
            {myReports.map((r) => (
              <li key={r.id} className="safety-report-row">
                <div className="safety-report-top">
                  <span className="safety-report-target">
                    {r.targetDisplayName || t('safety.memberFallback')}
                  </span>
                  <span className="safety-report-when">{formatWhen(r.createdAt, t)}</span>
                </div>
                <p className="safety-report-reason">
                  {t(`safety.reason.${r.reason}`, { defaultValue: r.reason })}
                </p>
                {r.details ? <p className="safety-report-details">{r.details}</p> : null}
                <span className="safety-report-status">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
