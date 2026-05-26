import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import YouMeLogo from '../components/YouMeLogo';
import AuthShell from '../components/auth/AuthShell';

export default function LoginPage({ onLogin }) {
  const { t } = useTranslation();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
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
      hero={(
        <>
          <YouMeLogo size={80} className="auth-hero-logo" />
          <h1 className="auth-hero__title">{t('auth.loginTitle')}</h1>
          <p className="auth-hero__subtitle">{t('auth.loginSubtitle')}</p>
        </>
      )}
    >
      <div className="glass-card auth-card-stagger">
        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="login-id">
              <span aria-hidden>📧</span>
              {t('auth.emailOrPhoneLabel')}
            </label>
            <input
              id="login-id"
              type="text"
              inputMode="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder={t('auth.emailOrPhonePlaceholder')}
              autoComplete="username"
              required
              className="form-input"
              disabled={loading}
            />
            <p className="auth-field__hint">{t('auth.emailOrPhoneHint')}</p>
          </div>

          <div className="auth-field">
            <label className="auth-field__label" htmlFor="login-password">
              <span aria-hidden>🔒</span>
              {t('auth.passwordLabel')}
            </label>
            <div className="auth-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                aria-label={showPassword ? t('auth.hidePassword', { defaultValue: 'Hide password' }) : t('auth.showPassword', { defaultValue: 'Show password' })}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error ? (
            <div className="auth-alert" role="alert">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
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

        <p className="auth-footer">
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
