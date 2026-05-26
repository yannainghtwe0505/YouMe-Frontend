import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import YouMeLogo from '../components/YouMeLogo';
import AuthShell from '../components/auth/AuthShell';
import Icon from '../components/ui/Icon';
import { useLoginAmbientAudio } from '../hooks/useLoginAmbientAudio';

export default function LoginPage({ onLogin }) {
  const { t } = useTranslation();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { bindGesture } = useLoginAmbientAudio();

  const handleLogin = async (e) => {
    e.preventDefault();
    bindGesture();
    setError(null);
    setLoading(true);

    try {
      const id = loginId.trim();
      if (!id) {
        setError(t('auth.validationLoginId'));
        setLoading(false);
        return;
      }
      const looksLikeEmail = id.includes('@');
      const res = await api.post('/auth/login', {
        email: looksLikeEmail ? id : undefined,
        phone: looksLikeEmail ? undefined : id,
        password,
      });
      localStorage.setItem('token', res.data.token);
      const payload = {
        token: res.data.token,
        userId: res.data.userId,
        email: looksLikeEmail ? id : null,
        registrationComplete: res.data.registrationComplete !== false,
        onboardingStep: res.data.onboardingStep ?? '',
      };
      if (onLogin) onLogin(payload);
      if (res.data.registrationComplete === false) {
        navigate('/register', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('auth.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      variant="login"
      hero={(
        <>
          <YouMeLogo size={80} className="auth-hero-logo" />
          <h1 className="auth-hero__title text-title">{t('auth.loginTitle')}</h1>
          <p className="auth-hero__subtitle text-body">{t('auth.loginSubtitle')}</p>
        </>
      )}
    >
      <div
        className="glass-card auth-card-stagger"
        onPointerDown={bindGesture}
        onKeyDown={bindGesture}
        role="presentation"
      >
        <p className="login-audio-hint">{t('auth.ambientHint', { defaultValue: 'Ambient sound may play softly after interaction' })}</p>

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label className="auth-field__label text-label" htmlFor="login-id">
              <Icon name="mail" size="sm" />
              {t('auth.emailOrPhoneLabel')}
            </label>
            <input
              id="login-id"
              type="text"
              inputMode="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              onFocus={bindGesture}
              placeholder={t('auth.emailOrPhonePlaceholder')}
              autoComplete="username"
              required
              className="form-input"
              disabled={loading}
            />
            <p className="auth-field__hint text-caption">{t('auth.emailOrPhoneHint')}</p>
          </div>

          <div className="auth-field">
            <label className="auth-field__label text-label" htmlFor="login-password">
              <Icon name="lock" size="sm" />
              {t('auth.passwordLabel')}
            </label>
            <div className="auth-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={bindGesture}
                placeholder={t('auth.passwordPlaceholder')}
                required
                className="form-input"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? t('auth.hidePassword', { defaultValue: 'Hide password' })
                    : t('auth.showPassword', { defaultValue: 'Show password' })
                }
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size="sm" />
              </button>
            </div>
          </div>

          {error ? (
            <div className="auth-alert" role="alert">
              <Icon name="alert" size="sm" tone="danger" className="auth-alert__icon" />
              {error}
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary btn-block btn-text" disabled={loading}>
            {loading ? (
              <>
                <Icon name="loader" size="sm" tone="onPrimary" className="ui-icon--spin" />
                {t('auth.signingIn')}
              </>
            ) : (
              t('auth.signIn')
            )}
          </button>
        </form>

        <p className="auth-lang-link">
          <Link to="/language?next=/login" className="auth-link">
            {t('lang.changeLink')}
          </Link>
        </p>

        <div className="auth-divider" aria-hidden>
          <span>{t('common.or')}</span>
        </div>

        <p className="auth-footer text-caption">
          {t('auth.noAccount')}
          {' '}
          <Link to="/register" className="auth-link">
            {t('auth.createAccount')}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
