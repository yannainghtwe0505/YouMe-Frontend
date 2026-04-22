import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import './UpgradePage.css';

const PLAN_ORDER = ['FREE', 'PLUS', 'GOLD'];

function planRank(id) {
  const i = PLAN_ORDER.indexOf(id);
  return i >= 0 ? i : 0;
}

function formatMinor(amountMinor, currency) {
  const cur = (currency || 'jpy').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(amountMinor);
  } catch {
    return `${amountMinor} ${cur}`;
  }
}

function listFromI18n(t, path) {
  const arr = t(path, { returnObjects: true });
  return Array.isArray(arr) ? arr : [];
}

export default function UpgradePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('FREE');
  const [billing, setBilling] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [modalPlan, setModalPlan] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);

  const canceled = searchParams.get('canceled') === '1';

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [plansRes, curRes] = await Promise.all([
        api.get('/subscription/plans'),
        api.get('/subscription/current'),
      ]);
      setCatalog(plansRes.data);
      setBilling(curRes.data || null);
      setCurrentPlan(String(curRes.data?.plan || 'FREE').toUpperCase());
    } catch {
      setPageError(t('subscription.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const dismissCanceled = () => {
    searchParams.delete('canceled');
    setSearchParams(searchParams, { replace: true });
  };

  const openModal = (planId) => {
    if (!catalog?.plans) return;
    const card = catalog.plans.find((p) => p.id === planId);
    if (!card) return;
    setModalPlan({
      id: planId,
      monthlyPriceMinor: card.monthlyPriceMinor ?? 0,
      currency: catalog.currency || 'jpy',
    });
  };

  const closeModal = () => {
    if (!payLoading) setModalPlan(null);
  };

  useEffect(() => {
    if (!modalPlan) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !payLoading) setModalPlan(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalPlan, payLoading]);

  const confirmUpgrade = async () => {
    if (!modalPlan) return;
    setPayLoading(true);
    setPageError(null);
    try {
      const { data } = await api.post('/subscription/web/checkout-session', {
        targetPlan: modalPlan.id,
      });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.demoUpgradeAvailable) {
        await api.post('/me/upgrade', { plan: modalPlan.id });
        window.location.href = `/upgrade/success?plan=${encodeURIComponent(modalPlan.id)}`;
        return;
      }
      setPageError(t('subscription.paymentFailed'));
    } catch (err) {
      setPageError(apiErr(err));
    } finally {
      setPayLoading(false);
    }
  };

  const planLabel = (id) => {
    if (id === 'GOLD') return t('profile.planGold');
    if (id === 'PLUS') return t('profile.planPlus');
    return t('profile.planFree');
  };

  const apiErr = (err) =>
    err?.response?.data?.message || err?.response?.data?.error || err?.message || t('errors.generic');

  const handleCancel = async (immediate) => {
    setManageBusy(true);
    setPageError(null);
    try {
      await api.post('/subscription/cancel', { immediate });
      await load();
    } catch (err) {
      setPageError(apiErr(err));
    } finally {
      setManageBusy(false);
    }
  };

  const handleDowngrade = async () => {
    setManageBusy(true);
    setPageError(null);
    try {
      await api.post('/subscription/downgrade', { targetPlan: 'PLUS', effective: 'IMMEDIATE' });
      await load();
    } catch (err) {
      setPageError(apiErr(err));
    } finally {
      setManageBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="upgrade-page">
        <div className="loading">{t('subscription.loading')}</div>
      </div>
    );
  }

  const plans = (catalog?.plans || []).slice().sort(
    (a, b) => planRank(a.id) - planRank(b.id),
  );
  const comparison = catalog?.comparison || [];

  return (
    <div className="upgrade-page">
      <header className="upgrade-page__header">
        <Link to="/profile" className="upgrade-page__back">
          ← {t('subscription.backToProfile')}
        </Link>
        <h1 className="upgrade-page__title">{t('subscription.pageTitle')}</h1>
      </header>

      {canceled ? (
        <div className="upgrade-banner" role="status">
          {t('subscription.canceledHint')}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 12 }}
            onClick={() => dismissCanceled()}
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : null}

      {pageError ? (
        <div className="upgrade-banner upgrade-banner--err" role="alert">
          {pageError}
        </div>
      ) : null}

      <section className="upgrade-current" aria-label={t('subscription.currentPlanLabel')}>
        <div className="upgrade-current__label">{t('subscription.currentPlanLabel')}</div>
        <div className="upgrade-current__plan">
          {planLabel(currentPlan)}
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              fontWeight: 700,
              verticalAlign: 'middle',
              color: 'var(--primary, #e17055)',
            }}
          >
            {t('subscription.currentPlanBadge')}
          </span>
        </div>
        {billing?.lifecycleStatus && billing.lifecycleStatus !== 'NONE' && billing.plan !== 'FREE' ? (
          <p className="upgrade-current__meta">
            {t('subscription.lifecycleHint', {
              status: billing.lifecycleStatus,
              provider: billing.billingProvider || '—',
            })}
          </p>
        ) : null}
      </section>

      {billing?.plan && billing.plan !== 'FREE' && billing.lifecycleStatus && billing.lifecycleStatus !== 'NONE' ? (
        <section className="upgrade-manage" aria-label={t('subscription.manageTitle')}>
          <h2 className="upgrade-manage__title">{t('subscription.manageTitle')}</h2>
          {billing.billingProvider === 'STRIPE' ? (
            <div className="upgrade-manage__stripe">
              {billing.cancelAtPeriodEnd ? (
                <p className="upgrade-manage__note">{t('subscription.cancelScheduledNote')}</p>
              ) : null}
              <div className="upgrade-manage__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={manageBusy || billing.cancelAtPeriodEnd}
                  onClick={() => void handleCancel(false)}
                >
                  {t('subscription.cancelAtPeriodEnd')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={manageBusy}
                  onClick={() => void handleCancel(true)}
                >
                  {t('subscription.cancelImmediately')}
                </button>
                {billing.plan === 'GOLD' ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={manageBusy}
                    onClick={() => void handleDowngrade()}
                  >
                    {t('subscription.downgradeToPlusStripe')}
                  </button>
                ) : null}
              </div>
            </div>
          ) : billing.billingProvider === 'APPLE' || billing.billingProvider === 'GOOGLE' ? (
            <div className="upgrade-manage__native">
              <p className="upgrade-manage__note">{t('subscription.nativeBillingManage')}</p>
              <p className="upgrade-manage__note upgrade-manage__note--muted">{t('subscription.nativeRestoreHint')}</p>
            </div>
          ) : (
            <div className="upgrade-manage__demo">
              <p className="upgrade-manage__note">{t('subscription.demoBillingManage')}</p>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={manageBusy}
                onClick={() => void handleCancel(true)}
              >
                {t('subscription.demoResetFree')}
              </button>
            </div>
          )}
        </section>
      ) : null}

      <div className="upgrade-plans">
        {plans.map((p) => {
          const id = p.id;
          const isCurrent = id === currentPlan;
          const rankCur = planRank(currentPlan);
          const rankId = planRank(id);
          const isGold = id === 'GOLD';
          const includes = listFromI18n(t, `subscription.planCards.${id}.includes`);
          const limitations = listFromI18n(t, `subscription.planCards.${id}.limitations`);
          const badge = p.badge === 'RECOMMENDED'
            ? { className: 'upgrade-card__badge--recommended', text: t('subscription.badgeRecommended') }
            : p.badge === 'POPULAR'
              ? { className: 'upgrade-card__badge--popular', text: t('subscription.badgePopular') }
              : null;
          const priceLabel = id === 'FREE'
            ? t('subscription.freePrice')
            : formatMinor(p.monthlyPriceMinor ?? 0, catalog?.currency);

          let cta = null;
          if (isCurrent) {
            cta = (
              <button type="button" className="btn btn-secondary" disabled>
                {t('subscription.currentPlanCta')}
              </button>
            );
          } else if (rankId < rankCur) {
            cta = (
              <button type="button" className="btn btn-ghost" disabled>
                {t('subscription.lowerTier')}
              </button>
            );
          } else if (id === 'PLUS') {
            cta = (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openModal('PLUS')}
              >
                {t('subscription.upgradeToPlus')}
              </button>
            );
          } else if (id === 'GOLD') {
            cta = (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openModal('GOLD')}
              >
                {t('subscription.upgradeToGold')}
              </button>
            );
          }

          return (
            <article
              key={id}
              className={`upgrade-card${isCurrent ? ' upgrade-card--current' : ''}${isGold ? ' upgrade-card--gold' : ''}`}
            >
              {badge ? (
                <span className={`upgrade-card__badge ${badge.className}`}>{badge.text}</span>
              ) : null}
              <h2 className="upgrade-card__name">{planLabel(id)}</h2>
              <div className="upgrade-card__price">{priceLabel}</div>
              <div className="upgrade-card__cycle">
                {id === 'FREE' ? '—' : t('subscription.billingMonthly')}
              </div>
              <div className="upgrade-card__section-title">{t('subscription.includes')}</div>
              <ul className="upgrade-card__list">
                {includes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="upgrade-card__section-title">{t('subscription.limitations')}</div>
              <ul className="upgrade-card__list upgrade-card__list--limits">
                {limitations.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="upgrade-card__cta">{cta}</div>
            </article>
          );
        })}
      </div>

      <section aria-labelledby="upgrade-compare-heading">
        <h2 id="upgrade-compare-heading" style={{ fontSize: '1.05rem', marginBottom: 12 }}>
          {t('subscription.compareTitle')}
        </h2>
        <div className="upgrade-compare-wrap">
          <table className="upgrade-compare">
            <thead>
              <tr>
                <th className="upgrade-compare__feature">{t('subscription.compareFeature')}</th>
                <th>{t('subscription.compareFree')}</th>
                <th>{t('subscription.comparePlus')}</th>
                <th className="upgrade-compare__gold">{t('subscription.compareGold')}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.id}>
                  <td className="upgrade-compare__feature">{t(`subscription.compare.${row.id}`)}</td>
                  <td>{row.free}</td>
                  <td>{row.plus}</td>
                  <td>{row.gold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalPlan ? (
        <div
          className="upgrade-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="upgrade-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-modal-title"
          >
            <h2 id="upgrade-modal-title">{t('subscription.modalTitle')}</h2>
            <div className="upgrade-modal__row">
              <span>{t('subscription.modalPlan')}</span>
              <strong>{planLabel(modalPlan.id)}</strong>
            </div>
            <div className="upgrade-modal__row">
              <span>{t('subscription.modalPrice')}</span>
              <strong>
                {modalPlan.id === 'FREE'
                  ? t('subscription.freePrice')
                  : formatMinor(modalPlan.monthlyPriceMinor, modalPlan.currency)}
              </strong>
            </div>
            <div className="upgrade-modal__row">
              <span>{t('subscription.modalBilling')}</span>
              <span>{t('subscription.billingMonthly')}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.4 }}>
              {billing?.webCheckoutAvailable || catalog?.stripeConfigured
                ? t('subscription.checkoutContinue')
                : t('subscription.demoActivate')}
            </p>
            <div className="upgrade-modal__actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={payLoading}
                onClick={() => void confirmUpgrade()}
              >
                {payLoading ? t('common.sending') : t('subscription.modalConfirm')}
              </button>
              <button type="button" className="btn btn-ghost" disabled={payLoading} onClick={closeModal}>
                {t('subscription.modalCancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
