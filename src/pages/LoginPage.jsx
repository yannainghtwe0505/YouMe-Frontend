import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

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
    <div
      className="auth-page-root"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'var(--bg-gradient-auth)',
      }}
    >
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="auth-hero-stagger" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '16px',
          }}
          >❤️</div>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
          >
            {t('auth.loginTitle')}
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
          }}
          >
            {t('auth.loginSubtitle')}
          </p>
        </div>

        <div className="card auth-card-stagger" style={{ padding: 'clamp(24px, 5vw, 32px)' }}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
              }}
              >📧 {t('auth.emailOrPhoneLabel')}</label>
              <input
                type="text"
                inputMode="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder={t('auth.emailOrPhonePlaceholder')}
                autoComplete="username"
                required
                className="form-input"
                disabled={loading}
                style={{
                  width: '100%',
                }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                {t('auth.emailOrPhoneHint')}
              </p>
            </div>

            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
              }}
              >🔒 {t('auth.passwordLabel')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  className="form-input"
                  disabled={loading}
                  style={{ width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '0',
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                color: '#c0392b',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.9rem',
                animation: 'slideDown 0.3s ease-out',
              }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: '12px',
                fontSize: '1rem',
                fontWeight: '700',
              }}
              disabled={loading}
            >
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginBottom: '12px', fontSize: '0.9rem' }}>
            <Link
              to="/language?next=/login"
              style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              {t('lang.changeLink')}
            </Link>
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0',
            color: 'var(--text-light)',
          }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.85rem' }}>{t('common.or')}</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          <p style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '0',
            fontSize: '0.95rem',
          }}
          >
            {t('auth.noAccount')}
            {' '}
            <Link
              to="/register"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: '700',
                transition: 'color var(--transition-fast)',
              }}
            >
              {t('auth.createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
