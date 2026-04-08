import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;

const HOBBY_PRESETS = [
  'Travel',
  'Gym',
  'Anime',
  'Movies',
  'Reading',
  'Music',
  'Café',
  'Hiking',
  'Cooking',
  'Gaming',
];

const REFERRAL_OPTIONS = [
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FRIEND', label: 'Friend' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'GOOGLE', label: 'Google Search' },
  { value: 'STORE', label: 'App Store / Play Store' },
  { value: 'AD', label: 'Advertisement' },
  { value: 'OTHER', label: 'Other' },
];

const SERVER_TO_UI = {
  GENDER: 'gender',
  BIRTHDAY: 'birthday',
  LOCATION: 'location',
  NICKNAME: 'nickname',
  LEGAL: 'legal',
  BASICS: 'basics',
  INTERESTS: 'interests',
  ATTRIBUTION: 'attribution',
  PHOTOS: 'photos',
};

function parseError(err) {
  const d = err.response?.data;
  if (d == null) return err.message || 'Something went wrong.';
  if (typeof d === 'string') return d;
  if (typeof d.error === 'string') return d.error;
  return err.message || 'Something went wrong.';
}

function ProgressBar({ phase, total }) {
  const pct = Math.round((phase / total) * 100);
  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          height: '6px',
          borderRadius: '999px',
          background: 'var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--primary), #a78bfa)',
            transition: 'width 0.35s ease',
          }}
        />
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
        Step {phase} of {total}
      </p>
    </div>
  );
}

const STEP_ORDER = [
  'method',
  'contact',
  'verify',
  'password',
  'gender',
  'birthday',
  'location',
  'nickname',
  'legal',
  'basics',
  'interests',
  'attribution',
  'photos',
  'done',
];

/** Mobile-friendly tap targets (WCAG ~44px). */
const tap = { WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' };
const checkSize = { width: 22, height: 22, minWidth: 22, flexShrink: 0, accentColor: 'var(--primary)' };
const radioSize = { width: 22, height: 22, minWidth: 22, flexShrink: 0, accentColor: 'var(--primary)' };

const STEP_BACK = {
  verify: 'contact',
  password: 'verify',
  gender: 'password',
  birthday: 'gender',
  location: 'birthday',
  nickname: 'location',
  legal: 'nickname',
  basics: 'legal',
  interests: 'basics',
  attribution: 'interests',
  photos: 'attribution',
};

function backButtonStyle(disabled) {
  return {
    width: '100%',
    padding: 'clamp(12px, 3.5vw, 14px)',
    marginTop: 12,
    minHeight: 48,
    fontSize: 'clamp(0.9rem, 2.8vw, 1rem)',
    ...tap,
    opacity: disabled ? 0.6 : 1,
  };
}

function primaryButtonStyle(disabled) {
  return {
    width: '100%',
    padding: 'clamp(12px, 3.5vw, 14px)',
    fontWeight: 700,
    minHeight: 48,
    fontSize: 'clamp(0.95rem, 3vw, 1rem)',
    ...tap,
    opacity: disabled ? 0.6 : 1,
  };
}

export default function RegisterPage({ onRegister }) {
  const navigate = useNavigate();
  const [booting, setBooting] = useState(() => Boolean(localStorage.getItem('token')));
  const [step, setStep] = useState('method');
  const [method, setMethod] = useState(null);
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [pendingSessionToken, setPendingSessionToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [ward, setWard] = useState('');
  const [wardQuery, setWardQuery] = useState('');
  const [tokyoList, setTokyoList] = useState([]);
  const [nickname, setNickname] = useState('');
  const [legalOver18, setLegalOver18] = useState(false);
  const [legalTos, setLegalTos] = useState(false);
  const [legalPrivacy, setLegalPrivacy] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [education, setEducation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [incomeBand, setIncomeBand] = useState('');
  const [relationshipIntention, setRelationshipIntention] = useState('');
  const [drinking, setDrinking] = useState('');
  const [smoking, setSmoking] = useState('');
  const [living, setLiving] = useState('');
  const [interests, setInterests] = useState([]);
  const [interestSearch, setInterestSearch] = useState('');
  const [referralSource, setReferralSource] = useState('');

  const [photoFiles, setPhotoFiles] = useState([]);
  const [error, setError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const photoFilesRef = useRef([]);
  photoFilesRef.current = photoFiles;

  useEffect(() => () => {
    photoFilesRef.current.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
  }, []);

  const loadTokyo = useCallback(async () => {
    try {
      const res = await api.get('/auth/registration/tokyo-wards');
      setTokyoList(res.data?.wards || []);
    } catch {
      setTokyoList([]);
    }
  }, []);

  const hydrateIncompleteRegistration = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    try {
      const meRes = await api.get('/me');
      if (meRes.data?.registrationComplete !== false) return;
      const { data } = await api.get('/auth/registration/status');
      if (data.registrationComplete) {
        navigate('/', { replace: true });
        return;
      }
      setGender(data.gender || '');
      setBirthday(data.birthday || '');
      if (data.city && data.city.includes(' - ')) {
        setWard(data.city.split(' - ')[1] || '');
      }
      setNickname(data.displayName || '');
      setLegalOver18(Boolean(data.tosAccepted));
      setLegalTos(Boolean(data.tosAccepted));
      setLegalPrivacy(Boolean(data.privacyAccepted));
      const life = data.lifestyle || {};
      if (life.heightCm != null) setHeightCm(String(life.heightCm));
      if (life.education) setEducation(String(life.education));
      if (life.occupation) setOccupation(String(life.occupation));
      if (life.incomeBand) setIncomeBand(String(life.incomeBand));
      if (life.relationshipIntention) setRelationshipIntention(String(life.relationshipIntention));
      if (life.drinking) setDrinking(String(life.drinking));
      if (life.smoking) setSmoking(String(life.smoking));
      if (life.living) setLiving(String(life.living));
      if (life.referralSource) setReferralSource(String(life.referralSource));
      if (Array.isArray(data.interests)) setInterests(data.interests);
      const s = data.onboardingStep || 'GENDER';
      setStep(SERVER_TO_UI[s] || 'gender');
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
      }
    }
  }, [navigate]);

  useEffect(() => {
    loadTokyo();
  }, [loadTokyo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!localStorage.getItem('token')) {
        if (!cancelled) setBooting(false);
        return;
      }
      await hydrateIncompleteRegistration();
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateIncompleteRegistration]);

  const filteredWards = useMemo(() => {
    const q = wardQuery.trim().toLowerCase();
    if (!q) return tokyoList;
    return tokyoList.filter((w) => w.toLowerCase().includes(q));
  }, [tokyoList, wardQuery]);

  const filteredHobbies = useMemo(() => {
    const q = interestSearch.trim().toLowerCase();
    const base = HOBBY_PRESETS.filter((h) => !q || h.toLowerCase().includes(q));
    return base;
  }, [interestSearch]);

  const patchProfile = async (body) => {
    await api.put('/auth/registration/profile', body);
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter(Boolean);
    if (incoming.length === 0) return;
    setError(null);
    setPhotoFiles((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_PHOTOS) break;
        if (!file.type || !file.type.startsWith('image/')) {
          setError('Please choose image files only (JPEG, PNG, WebP, etc.).');
          return prev;
        }
        if (file.size > MAX_BYTES) {
          setError('Each photo must be 5 MB or smaller.');
          return prev;
        }
        next.push({
          file,
          previewUrl: URL.createObjectURL(file),
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        });
      }
      return next;
    });
  };

  const removePhoto = (id) => {
    setPhotoFiles((prev) => {
      const row = prev.find((p) => p.id === id);
      if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const profileProgress = useMemo(() => {
    const i = STEP_ORDER.indexOf(step);
    if (i < 4) return { phase: 1, total: 9 };
    const n = i - 3;
    return { phase: Math.min(9, Math.max(1, n)), total: 9 };
  }, [step]);

  const sendCode = async () => {
    setError(null);
    setSendSuccess(null);
    if (!method) {
      setError('Go back and choose Email or Phone.');
      return;
    }
    const c = contact.trim();
    if (!c) {
      setError(method === 'email' ? 'Enter your email address.' : 'Enter your phone number.');
      return;
    }
    if (method === 'email') {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
      if (!ok) {
        setError('Enter a valid email address.');
        return;
      }
    }
    setLoading(true);
    try {
      if (method === 'email') {
        await api.post('/auth/registration/email/send', { email: c });
      } else {
        await api.post('/auth/registration/phone/send', { phone: c });
      }
      const hint =
        method === 'email'
          ? 'Check your inbox (and spam). If SMTP is not set up yet, the code is printed in the server log.'
          : 'SMS is simulated until you add a provider — the code is printed in the server log.';
      setSendSuccess(hint);
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[YouMe] Send code OK:', method, c);
      }
      setStep('verify');
    } catch (err) {
      setError(parseError(err));
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[YouMe] Send code failed:', err.response?.status, err.response?.data || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    const digits = code.trim();
    if (digits.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    if (!method) {
      setError('Go back and choose Email or Phone.');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (method === 'email') {
        res = await api.post('/auth/registration/email/verify', { email: contact.trim(), code: digits });
      } else {
        res = await api.post('/auth/registration/phone/verify', { phone: contact.trim(), code: digits });
      }
      setPendingSessionToken(res.data.pendingSessionToken);
      setStep('password');
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const createPassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/registration/password', {
        pendingSessionToken,
        password,
      });
      localStorage.setItem('token', res.data.token);
      if (onRegister) {
        onRegister({
          token: res.data.token,
          userId: res.data.userId ?? null,
          email: method === 'email' ? contact.trim() : null,
          displayName: '',
          registrationComplete: false,
        });
      }
      setStep('gender');
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (tag) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const finishOnboarding = async (e) => {
    e.preventDefault();
    setError(null);
    if (photoFiles.length < 1) {
      setError('Add at least one profile photo to continue.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      photoFiles.forEach(({ file }) => fd.append('photos', file));
      const res = await api.post('/auth/registration/complete', fd);
      localStorage.setItem('token', res.data.token);
      const me = await api.get('/me');
      const d = me.data || {};
      if (onRegister) {
        onRegister({
          token: res.data.token,
          userId: res.data.userId,
          email: d.email,
          displayName: d.name,
          registrationComplete: true,
        });
      }
      setStep('done');
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError(null);
    setSendSuccess(null);
    const prev = STEP_BACK[step];
    if (prev) setStep(prev);
  };

  const renderBody = () => {
    switch (step) {
      case 'method':
        return (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
              Choose how you’d like to verify your account.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', marginBottom: '12px', fontWeight: 700 }}
              onClick={() => {
                setMethod('email');
                setStep('contact');
              }}
            >
              Continue with Email
            </button>
            <button
              type="button"
              className="btn"
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: '12px',
                fontWeight: 700,
                border: '2px solid var(--primary)',
                color: 'var(--primary)',
                background: 'transparent',
              }}
              onClick={() => {
                setMethod('phone');
                setStep('contact');
              }}
            >
              Continue with Phone
            </button>
          </>
        );
      case 'contact':
        return (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                }}
              >
                {method === 'email' ? '📧 Email' : '📱 Phone'}
                <span style={{ color: '#c0392b' }}> *</span>
              </label>
              <input
                className="form-input"
                style={{ width: '100%' }}
                type={method === 'email' ? 'email' : 'tel'}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={method === 'email' ? 'you@example.com' : '090-1234-5678'}
                autoComplete={method === 'email' ? 'email' : 'tel'}
                disabled={loading}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 8 }}>
                {method === 'phone'
                  ? 'Japan numbers only for this Tokyo launch. SMS is simulated in dev — check server logs for the code, or use dev OTP 123456 if configured.'
                  : 'We’ll send a 6-digit code. In dev, the code is logged on the server; you can also use dev OTP 123456 if configured.'}
              </p>
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, fontWeight: 700 }} disabled={loading}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
            <button
              type="button"
              className="btn"
              style={{ marginTop: 12, width: '100%', background: 'transparent' }}
              onClick={() => setStep('method')}
            >
              Back
            </button>
          </form>
        );
      case 'verify':
        return (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void verifyCode();
            }}
          >
            {sendSuccess ? (
              <div
                style={{
                  background: 'rgba(39, 174, 96, 0.12)',
                  border: '1px solid rgba(39, 174, 96, 0.35)',
                  color: '#1e8449',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  fontSize: '0.9rem',
                }}
              >
                ✓ Code sent. {sendSuccess}
              </div>
            ) : null}
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                }}
              >6-digit code</label>
              <input
                className="form-input"
                style={{ width: '100%', letterSpacing: '0.3em', fontSize: '1.2rem' }}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                disabled={loading}
              />
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, fontWeight: 700 }} disabled={loading}>
              {loading ? 'Checking…' : 'Verify'}
            </button>
            <button type="button" className="btn" style={{ marginTop: 12, width: '100%' }} onClick={goBack} disabled={loading}>
              Back
            </button>
            <button
              type="button"
              className="btn"
              style={{ marginTop: 8, width: '100%', background: 'transparent', fontSize: '0.9rem' }}
              onClick={() => sendCode()}
              disabled={loading}
            >
              Resend code
            </button>
          </form>
        );
      case 'password':
        return (
          <form
            noValidate
            onSubmit={createPassword}
          >
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    minWidth: 44,
                    minHeight: 44,
                    ...tap,
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >Confirm password</label>
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={primaryButtonStyle(loading)} disabled={loading}>
              {loading ? 'Saving…' : 'Continue'}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </form>
        );
      case 'gender':
        return (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)' }}>
              How do you identify?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['MALE', 'FEMALE'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className="btn"
                  style={{
                    padding: 'clamp(14px, 4vw, 18px)',
                    textAlign: 'left',
                    border: gender === g ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: gender === g ? 'rgba(109, 94, 247, 0.08)' : 'var(--card-bg)',
                    fontWeight: 600,
                    minHeight: 52,
                    width: '100%',
                    fontSize: 'clamp(0.95rem, 3vw, 1rem)',
                    ...tap,
                  }}
                >
                  {g === 'MALE' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginTop: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              style={{ ...primaryButtonStyle(!gender || loading), marginTop: 20 }}
              disabled={!gender || loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  await patchProfile({ gender, onboardingStep: 'BIRTHDAY' });
                  setStep('birthday');
                } catch (err) {
                  setError(parseError(err));
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </div>
        );
      case 'birthday':
        return (
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              if (!birthday) {
                setError('Please enter your birthday.');
                return;
              }
              setLoading(true);
              try {
                await patchProfile({ birthday, onboardingStep: 'LOCATION' });
                setStep('location');
              } catch (err) {
                setError(parseError(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >Birthday</label>
              <input
                type="date"
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                disabled={loading}
              />
              <p style={{ fontSize: 'clamp(0.78rem, 2.5vw, 0.85rem)', color: 'var(--text-light)', marginTop: 8 }}>
                You must be 18 or older.
              </p>
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={primaryButtonStyle(loading)} disabled={loading}>
              Continue
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </form>
        );
      case 'location':
        return (
          <div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                }}
              >Tokyo area</label>
              <input
                className="form-input"
                style={{ width: '100%', marginBottom: 8, minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                placeholder="Search ward / city…"
                value={wardQuery}
                onChange={(e) => setWardQuery(e.target.value)}
              />
              <div
                style={{
                  maxHeight: 'min(50vh, 280px)',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {filteredWards.map((w) => (
                  <label
                    key={w}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 'clamp(12px, 3vw, 14px) clamp(12px, 3vw, 16px)',
                      minHeight: 48,
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: ward === w ? 'rgba(109, 94, 247, 0.06)' : 'transparent',
                      fontSize: 'clamp(0.88rem, 2.6vw, 0.95rem)',
                      ...tap,
                    }}
                  >
                    <input
                      type="radio"
                      name="ward"
                      checked={ward === w}
                      onChange={() => setWard(w)}
                      style={radioSize}
                    />
                    <span style={{ flex: 1, lineHeight: 1.35 }}>{w}</span>
                  </label>
                ))}
              </div>
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              style={primaryButtonStyle(!ward || loading)}
              disabled={!ward || loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  await patchProfile({ city: ward, onboardingStep: 'NICKNAME' });
                  setStep('nickname');
                } catch (err) {
                  setError(parseError(err));
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </div>
        );
      case 'nickname':
        return (
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const n = nickname.trim();
              if (n.length < 2 || n.length > 30) {
                setError('Nickname must be 2–30 characters.');
                return;
              }
              setLoading(true);
              try {
                await patchProfile({ displayName: n, onboardingStep: 'LEGAL' });
                setStep('legal');
              } catch (err) {
                setError(parseError(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >Nickname</label>
              <input
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
                disabled={loading}
                placeholder="How you appear on YouMe"
              />
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={primaryButtonStyle(loading)} disabled={loading}>
              Continue
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </form>
        );
      case 'legal':
        return (
          <div>
            {[
              ['I am 18 or older', legalOver18, setLegalOver18],
              ['I agree to the Terms of Service', legalTos, setLegalTos],
              ['I agree to the Privacy Policy', legalPrivacy, setLegalPrivacy],
            ].map(([label, checked, set]) => (
              <label
                key={label}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  marginBottom: 12,
                  cursor: 'pointer',
                  minHeight: 48,
                  padding: '8px 0',
                  ...tap,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => set(e.target.checked)}
                  style={checkSize}
                />
                <span style={{ fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)', lineHeight: 1.4, flex: 1 }}>{label}</span>
              </label>
            ))}
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              style={primaryButtonStyle(!legalOver18 || !legalTos || !legalPrivacy || loading)}
              disabled={!legalOver18 || !legalTos || !legalPrivacy || loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  await patchProfile({
                    acceptTos: true,
                    acceptPrivacy: true,
                    onboardingStep: 'BASICS',
                  });
                  setStep('basics');
                } catch (err) {
                  setError(parseError(err));
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </div>
        );
      case 'basics':
        return (
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const h = parseInt(heightCm, 10);
              if (!Number.isFinite(h) || h < 120 || h > 230) {
                setError('Enter a valid height between 120 and 230 cm.');
                return;
              }
              if (!relationshipIntention.trim() || !drinking.trim() || !smoking.trim() || !living.trim()) {
                setError('Please complete relationship intention, drinking, smoking, and living situation.');
                return;
              }
              setLoading(true);
              try {
                const lifestyle = {
                  heightCm: h,
                  relationshipIntention: relationshipIntention.trim(),
                  drinking: drinking.trim(),
                  smoking: smoking.trim(),
                  living: living.trim(),
                };
                const ed = education.trim();
                if (ed) lifestyle.education = ed;
                const occ = occupation.trim();
                if (occ) lifestyle.occupation = occ;
                if (incomeBand) lifestyle.incomeBand = incomeBand;
                await patchProfile({
                  lifestyle,
                  onboardingStep: 'INTERESTS',
                });
                setStep('interests');
              } catch (err) {
                setError(parseError(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >
                Height (cm)<span style={{ color: '#c0392b' }}> *</span>
              </label>
              <input
                type="number"
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                min={120}
                max={230}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >
                Education <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional)</span>
              </label>
              <input
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. University"
              />
            </div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >
                Occupation <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional)</span>
              </label>
              <input
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Engineer"
              />
            </div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >
                Annual income <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional)</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={incomeBand}
                onChange={(e) => setIncomeBand(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="UNDER_4M">Under ¥4M</option>
                <option value="M4_6M">¥4M – ¥6M</option>
                <option value="M6_8M">¥6M – ¥8M</option>
                <option value="M8_10M">¥8M – ¥10M</option>
                <option value="OVER_10M">¥10M+</option>
              </select>
            </div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >
                Relationship intention<span style={{ color: '#c0392b' }}> *</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={relationshipIntention}
                onChange={(e) => setRelationshipIntention(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="CASUAL">Casual dating</option>
                <option value="SERIOUS">Serious / marriage-minded</option>
                <option value="OPEN">Open to both</option>
              </select>
            </div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >
                Drinking<span style={{ color: '#c0392b' }}> *</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={drinking}
                onChange={(e) => setDrinking(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="NEVER">Never</option>
                <option value="SOMETIMES">Sometimes</option>
                <option value="OFTEN">Often</option>
              </select>
            </div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >
                Smoking<span style={{ color: '#c0392b' }}> *</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={smoking}
                onChange={(e) => setSmoking(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="NO">No</option>
                <option value="SOCIAL">Socially</option>
                <option value="YES">Yes</option>
              </select>
            </div>
            <div className="form-group">
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)',
                }}
              >
                Living situation<span style={{ color: '#c0392b' }}> *</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={living}
                onChange={(e) => setLiving(e.target.value)}
              >
                <option value="">Select…</option>
                <option value="ALONE">Live alone</option>
                <option value="FAMILY">With family</option>
                <option value="ROOMMATES">Roommates</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={primaryButtonStyle(loading)} disabled={loading}>
              Continue
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </form>
        );
      case 'interests':
        return (
          <div>
            <input
              className="form-input"
              style={{ width: '100%', marginBottom: 12, minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
              placeholder="Search interests…"
              value={interestSearch}
              onChange={(e) => setInterestSearch(e.target.value)}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(8px, 2vw, 10px)' }}>
              {filteredHobbies.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleInterest(h)}
                  style={{
                    padding: 'clamp(10px, 2.5vw, 12px) clamp(14px, 3.5vw, 18px)',
                    borderRadius: 999,
                    border: interests.includes(h) ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: interests.includes(h) ? 'rgba(109, 94, 247, 0.12)' : 'var(--card-bg)',
                    cursor: 'pointer',
                    fontSize: 'clamp(0.85rem, 2.6vw, 0.95rem)',
                    minHeight: 44,
                    ...tap,
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginTop: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              style={{ ...primaryButtonStyle(interests.length < 1 || loading), marginTop: 20 }}
              disabled={interests.length < 1 || loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  await patchProfile({ interests, onboardingStep: 'ATTRIBUTION' });
                  setStep('attribution');
                } catch (err) {
                  setError(parseError(err));
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </div>
        );
      case 'attribution':
        return (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)' }}>
              How did you find YouMe? (optional)
            </p>
            <div className="form-group">
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                {REFERRAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ ...primaryButtonStyle(loading), marginTop: 8 }}
              disabled={loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  const body = { onboardingStep: 'PHOTOS' };
                  if (referralSource) body.referralSource = referralSource;
                  await patchProfile(body);
                  setStep('photos');
                } catch (err) {
                  setError(parseError(err));
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </div>
        );
      case 'photos':
        return (
          <form noValidate onSubmit={finishOnboarding}>
            <p
              style={{
                fontSize: 'clamp(0.88rem, 2.6vw, 0.95rem)',
                color: 'var(--text-secondary)',
                marginBottom: 12,
                lineHeight: 1.45,
              }}
            >
              Add at least one clear photo. The first photo is your main profile picture. This is the last step — then
              your account is created.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={loading || photoFiles.length >= MAX_PHOTOS}
              className="form-input"
              style={{ width: '100%', padding: 12, minHeight: 48, fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)' }}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {photoFiles.length > 0 ? (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '12px 0 0 0',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'clamp(8px, 2vw, 12px)',
                }}
              >
                {photoFiles.map((p, idx) => (
                  <li
                    key={p.id}
                    style={{
                      position: 'relative',
                      width: 'clamp(72px, 22vw, 96px)',
                      height: 'clamp(72px, 22vw, 96px)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: idx === 0 ? '2px solid var(--primary)' : '2px solid rgba(109, 94, 247, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    {idx === 0 ? (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          left: 2,
                          fontSize: 10,
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: 4,
                          zIndex: 1,
                        }}
                      >
                        Main
                      </span>
                    ) : null}
                    <img src={p.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      disabled={loading}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 28,
                        height: 28,
                        minWidth: 28,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                        fontSize: 18,
                        ...tap,
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {error ? (
              <div className="auth-error-banner" style={{ marginTop: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ ...primaryButtonStyle(photoFiles.length < 1 || loading), marginTop: 16 }}
              disabled={photoFiles.length < 1 || loading}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              Back
            </button>
          </form>
        );
      case 'done':
        return (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>You’re in!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Taking you to Discover…</p>
          </div>
        );
      default:
        return null;
    }
  };

  const title =
    step === 'method'
      ? 'Join YouMe'
      : step === 'contact' || step === 'verify'
        ? 'Verify it’s you'
        : step === 'password'
          ? 'Set your password'
          : step === 'gender'
            ? 'Gender'
            : step === 'birthday'
              ? 'Birthday'
              : step === 'location'
                ? 'Tokyo area'
                : step === 'nickname'
                  ? 'Nickname'
                  : step === 'legal'
                    ? 'Terms & safety'
                    : step === 'basics'
                      ? 'About you'
                      : step === 'interests'
                        ? 'Interests'
                        : step === 'attribution'
                          ? 'Almost there'
                          : step === 'photos'
                            ? 'Photos'
                            : step === 'done'
                              ? 'Welcome'
                              : 'Sign up';

  const showProgress = !['method', 'contact', 'verify', 'password', 'done'].includes(step);

  if (booting) {
    return (
      <div
        className="auth-page-root"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        padding: 'clamp(12px, 4vw, 20px)',
        background: 'var(--bg-gradient-auth)',
      }}
    >
      <div className="loading" style={{ color: 'var(--text-secondary)' }}>
          Loading your sign-up…
        </div>
      </div>
    );
  }

  return (
    <div
      className="auth-page-root"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(12px, 4vw, 20px)',
        background: 'var(--bg-gradient-auth)',
      }}
    >
      <div className="fade-in" style={{ width: '100%', maxWidth: 'min(100vw - 24px, 480px)', margin: '0 auto' }}>
        <div className="auth-hero-stagger" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
          <h1
            style={{
              fontSize: 'clamp(1.35rem, 5vw, 1.75rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            {title}
          </h1>
          {showProgress ? <ProgressBar phase={profileProgress.phase} total={profileProgress.total} /> : null}
        </div>

        <div className="card auth-card-stagger" style={{ padding: 'clamp(24px, 5vw, 32px)' }}>
          {renderBody()}
          {['method', 'done'].includes(step) ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 24, marginBottom: 0, fontSize: '0.95rem' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
