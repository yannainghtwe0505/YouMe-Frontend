import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
  APP_LOCALES,
  LANG_STORAGE_KEY,
  markLanguageGateComplete,
  normalizeToAppLocale,
  resolveLocaleFromNavigator,
} from '../lib/locale';
import YouMeLogo from '../components/YouMeLogo';
import AuthShell from '../components/auth/AuthShell';

export default function LanguageSelectPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const detected = useMemo(() => resolveLocaleFromNavigator(), []);
  const [selected, setSelected] = useState(() => normalizeToAppLocale(i18n.language || detected));

  const nextPath = useMemo(() => {
    const raw = searchParams.get('next');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/login';
    return raw;
  }, [searchParams]);

  const applyAndContinue = async () => {
    const code = normalizeToAppLocale(selected);
    await i18n.changeLanguage(code);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
    markLanguageGateComplete();
    navigate(nextPath, { replace: true });
  };

  return (
    <AuthShell
      maxWidth={440}
      hero={(
        <>
          <YouMeLogo size={72} className="auth-hero-logo" />
          <h1 className="auth-hero__title">{t('lang.chooseTitle')}</h1>
          <p className="auth-hero__subtitle">{t('lang.chooseSubtitle')}</p>
        </>
      )}
    >
      <div className="glass-card auth-card-stagger">
        <p className="auth-field__hint" style={{ marginBottom: 14 }}>
          {t('lang.detectedHint', {
            label: APP_LOCALES.find((l) => l.code === detected)?.nativeLabel || 'English',
          })}
        </p>

        <div className="lang-options" role="radiogroup" aria-label={t('lang.chooseTitle')}>
          {APP_LOCALES.map(({ code, nativeLabel }) => {
            const active = selected === code;
            const suggested = detected === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelected(code)}
                className={`lang-option-btn ${active ? 'lang-option-btn--active' : ''}`}
                role="radio"
                aria-checked={active}
              >
                <span>{nativeLabel}</span>
                {suggested ? (
                  <span className="lang-option-btn__badge">{t('lang.suggested')}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="auth-field__hint" style={{ marginTop: 14 }}>
          {t('lang.privacyNote')}
        </p>

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 18 }}
          onClick={() => void applyAndContinue()}
        >
          {t('lang.continue')}
        </button>
      </div>
    </AuthShell>
  );
}
