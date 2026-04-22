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
    <div
      className="auth-page-root fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        minHeight: '100dvh',
        background: 'var(--bg-gradient-auth)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.75rem', marginBottom: 12 }}>🌐</div>
          <h1
            style={{
              fontSize: 'clamp(1.35rem, 4.5vw, 1.75rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
              lineHeight: 1.25,
            }}
          >
            {t('lang.chooseTitle')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
            {t('lang.chooseSubtitle')}
          </p>
        </div>

        <div className="card" style={{ padding: 'clamp(20px, 4vw, 28px)' }}>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              marginBottom: 14,
              lineHeight: 1.45,
            }}
          >
            {t('lang.detectedHint', {
              label: APP_LOCALES.find((l) => l.code === detected)?.nativeLabel || 'English',
            })}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} role="radiogroup" aria-label={t('lang.chooseTitle')}>
            {APP_LOCALES.map(({ code, nativeLabel }) => {
              const active = selected === code;
              const suggested = detected === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelected(code)}
                  className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                  role="radio"
                  aria-checked={active}
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                    display: 'flex',
                    alignItems: 'center',
                    textAlign: 'left',
                    fontWeight: 600,
                    padding: '14px 16px',
                  }}
                >
                  <span>{nativeLabel}</span>
                  {suggested ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        opacity: 0.95,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: active ? 'rgba(255,255,255,0.22)' : 'var(--accent-soft)',
                        color: active ? '#fff' : 'var(--accent)',
                      }}
                    >
                      {t('lang.suggested')}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 14, lineHeight: 1.4 }}>
            {t('lang.privacyNote')}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 18, padding: '14px', fontWeight: 700 }}
            onClick={() => void applyAndContinue()}
          >
            {t('lang.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
