import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
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
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      if (onLogin) onLogin(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)'
    }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '16px'
          }}>❤️</div>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            Welcome Back
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem'
          }}>
            Sign in to find your perfect match
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 'clamp(24px, 5vw, 32px)' }}>
          <form onSubmit={handleLogin}>
            {/* Email Field */}
            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}>📧 Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="form-input"
                disabled={loading}
                style={{
                  width: '100%'
                }}
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}>🔒 Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
                    padding: '0'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                color: '#c0392b',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.9rem',
                animation: 'slideDown 0.3s ease-out'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: '16px',
                fontSize: '1rem',
                fontWeight: '700'
              }}
              disabled={loading}
            >
              {loading ? '⏳ Signing in...' : '✓ Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0',
            color: 'var(--text-light)'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            <span style={{ fontSize: '0.85rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>

          {/* Sign Up Link */}
          <p style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginBottom: '0',
            fontSize: '0.95rem'
          }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: '700',
                transition: 'color var(--transition-fast)'
              }}
            >
              Create one now!
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
