import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHelp } from '../../context/HelpProvider';

const SLIDE_KEYS = [
  'welcome',
  'matching',
  'likes',
  'safety',
  'profile',
  'ai',
];

export default function ProductOnboarding() {
  const { t } = useTranslation();
  const { showOnboarding, completeOnboarding, setShowOnboarding } = useHelp();
  const [step, setStep] = useState(0);

  if (!showOnboarding) return null;

  const slideKey = SLIDE_KEYS[step];
  const isLast = step >= SLIDE_KEYS.length - 1;

  const onSkip = () => {
    void completeOnboarding(true);
    setStep(0);
  };

  const onLater = () => {
    setShowOnboarding(false);
    setStep(0);
  };

  const onNext = () => {
    if (isLast) {
      void completeOnboarding(false);
      setStep(0);
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="product-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="product-onboarding-card">
        <div className="product-onboarding-progress" aria-hidden>
          {SLIDE_KEYS.map((_, i) => (
            <span
              key={SLIDE_KEYS[i]}
              className={`product-onboarding-dot${i <= step ? ' active' : ''}`}
            />
          ))}
        </div>
        <div className={`product-onboarding-emoji product-onboarding-emoji--${slideKey}`} aria-hidden>
          {t(`help.onboarding.emoji.${slideKey}`)}
        </div>
        <h2 id="onboarding-title" className="product-onboarding-title">
          {t(`help.onboarding.slides.${slideKey}.title`)}
        </h2>
        <p className="product-onboarding-body">
          {t(`help.onboarding.slides.${slideKey}.body`)}
        </p>
        {slideKey === 'likes' ? (
          <div className="product-onboarding-actions-demo" aria-hidden>
            <span className="youme-action dislike demo">✕</span>
            <span className="youme-action super demo">★</span>
            <span className="youme-action like demo">♥</span>
          </div>
        ) : null}
        <div className="product-onboarding-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSkip}>
            {t('help.onboarding.skip')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onLater}>
            {t('help.onboarding.later')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {isLast ? t('help.onboarding.finish') : t('help.onboarding.next')}
          </button>
        </div>
        <p className="product-onboarding-more">
          <Link to="/help" onClick={() => setShowOnboarding(false)}>
            {t('help.onboarding.openHelpCenter')}
          </Link>
        </p>
      </div>
    </div>
  );
}
