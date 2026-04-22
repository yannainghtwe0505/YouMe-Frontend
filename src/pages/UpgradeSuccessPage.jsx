import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import './UpgradePage.css';

export default function UpgradeSuccessPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const planParam = (searchParams.get('plan') || '').toUpperCase();

  const [status, setStatus] = useState('working');
  const [planName, setPlanName] = useState(planParam);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionId) {
        try {
          const { data } = await api.post('/subscription/upgrade-confirm', { sessionId });
          if (cancelled) return;
          if (data?.ok && data?.plan) {
            setPlanName(String(data.plan).toUpperCase());
            setStatus('ok');
          } else {
            setStatus('err');
          }
        } catch {
          if (!cancelled) setStatus('err');
        }
        return;
      }
      if (planParam === 'PLUS' || planParam === 'GOLD') {
        setPlanName(planParam);
        setStatus('ok');
        return;
      }
      if (!cancelled) setStatus('err');
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, planParam]);

  const planLabel = (id) => {
    if (id === 'GOLD') return t('profile.planGold');
    if (id === 'PLUS') return t('profile.planPlus');
    return t('profile.planFree');
  };

  return (
    <div className="upgrade-page">
      <header className="upgrade-page__header">
        <Link to="/profile" className="upgrade-page__back">
          ← {t('subscription.backToProfile')}
        </Link>
      </header>

      {status === 'working' ? (
        <p className="loading" style={{ marginTop: 24 }}>
          {t('subscription.successWorking')}
        </p>
      ) : null}

      {status === 'ok' ? (
        <section className="upgrade-current" style={{ marginTop: 16 }}>
          <h1 className="upgrade-page__title" style={{ marginBottom: 12 }}>
            {t('subscription.successTitle')}
          </h1>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.5, margin: 0 }}>
            {t('subscription.successMessage', { plan: planLabel(planName) })}
          </p>
          <Link to="/profile" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>
            {t('subscription.successBack')}
          </Link>
        </section>
      ) : null}

      {status === 'err' ? (
        <div className="upgrade-banner upgrade-banner--err" style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 12px' }}>{t('subscription.successError')}</p>
          <Link to="/upgrade" className="btn btn-primary">
            {t('subscription.pageTitle')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
