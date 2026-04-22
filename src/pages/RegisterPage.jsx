import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { labelTokyoWard } from '../tokyoWardI18n';

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

const REFERRAL_VALUES = ['TIKTOK', 'INSTAGRAM', 'FRIEND', 'YOUTUBE', 'GOOGLE', 'STORE', 'AD', 'OTHER'];

const HOBBY_PRESET_I18N = {
  Travel: 'travel',
  Gym: 'gym',
  Anime: 'anime',
  Movies: 'movies',
  Reading: 'reading',
  Music: 'music',
  Café: 'cafe',
  Hiking: 'hiking',
  Cooking: 'cooking',
  Gaming: 'gaming',
};

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

function parseError(err, t) {
  const d = err.response?.data;
  const fallback = t('errors.generic');
  if (d == null) return err.message || fallback;
  if (typeof d === 'string') return d;
  if (typeof d.error === 'string') return d.error;
  return err.message || fallback;
}

function ProgressBar({ phase, total, t }) {
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
        {t('register.stepProgress', { phase, total })}
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
  const { t: tr } = useTranslation();
  const navigate = useNavigate();
  const [booting, setBooting] = useState(() => Boolean(localStorage.getItem('token')));
  const [step, setStep] = useState('method');
  const [method, setMethod] = useState(null);
  const [contact, setContact] = useState('');
  const [optionalEmail, setOptionalEmail] = useState('');
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
      const ch = data.verificationChannel;
      if (ch === 'PHONE') {
        setMethod('phone');
        const pe = data.phoneE164;
        if (pe && typeof pe === 'string') {
          setContact(pe.startsWith('+81') ? `0${pe.slice(3)}` : pe);
        }
        if (data.accountEmail) setOptionalEmail(String(data.accountEmail));
      } else if (ch === 'EMAIL') {
        setMethod('email');
        if (data.accountEmail) setContact(String(data.accountEmail));
      }
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
    return tokyoList.filter((w) => {
      if (w.toLowerCase().includes(q)) return true;
      return labelTokyoWard(w, tr).toLowerCase().includes(q);
    });
  }, [tokyoList, wardQuery, tr]);

  const filteredHobbies = useMemo(() => {
    const q = interestSearch.trim().toLowerCase();
    if (!q) return HOBBY_PRESETS;
    return HOBBY_PRESETS.filter((h) => {
      if (h.toLowerCase().includes(q)) return true;
      const ik = HOBBY_PRESET_I18N[h];
      return ik && tr(`register.hobbyPreset.${ik}`).toLowerCase().includes(q);
    });
  }, [interestSearch, tr]);

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
          setError(tr('register.error.imagesOnly'));
          return prev;
        }
        if (file.size > MAX_BYTES) {
          setError(tr('register.error.photoTooLarge'));
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
      setError(tr('register.error.chooseVerifyMethod'));
      return;
    }
    const c = contact.trim();
    if (!c) {
      setError(method === 'email' ? tr('register.error.enterEmail') : tr('register.error.enterPhone'));
      return;
    }
    if (method === 'email') {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
      if (!ok) {
        setError(tr('register.error.invalidEmail'));
        return;
      }
    }
    const oe = optionalEmail.trim();
    if (method === 'phone' && oe) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(oe);
      if (!ok) {
        setError(tr('register.error.optionalEmailInvalid'));
        return;
      }
    }
    setLoading(true);
    try {
      if (method === 'email') {
        await api.post('/auth/registration/email/send', { email: c });
      } else {
        const body = { phone: c };
        if (oe) body.email = oe;
        await api.post('/auth/registration/phone/send', body);
      }
      setSendSuccess(method === 'email' ? 'email' : 'phone');
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[YouMe] Send code OK:', method, c);
      }
      setStep('verify');
    } catch (err) {
      setError(parseError(err, tr));
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
      setError(tr('register.error.enterSixDigit'));
      return;
    }
    if (!method) {
      setError(tr('register.methodError'));
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
      setError(parseError(err, tr));
    } finally {
      setLoading(false);
    }
  };

  const createPassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(tr('register.error.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(tr('register.error.passwordTooShort'));
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
          email: method === 'email' ? contact.trim() : optionalEmail.trim() || null,
          displayName: '',
          registrationComplete: false,
        });
      }
      setStep('gender');
    } catch (err) {
      setError(parseError(err, tr));
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
      setError(tr('register.error.addOnePhoto'));
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
      setError(parseError(err, tr));
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
              {tr('register.methodIntro')}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', marginBottom: '12px', fontWeight: 700 }}
              onClick={() => {
                setMethod('phone');
                setContact('');
                setOptionalEmail('');
                setStep('contact');
              }}
            >
              {tr('register.continueWithPhone')}
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
                setMethod('email');
                setContact('');
                setOptionalEmail('');
                setStep('contact');
              }}
            >
              {tr('register.signUpEmailOnly')}
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
                {method === 'email' ? tr('register.contact.emailLabel') : tr('register.contact.phoneLabel')}
                <span style={{ color: '#c0392b' }}> *</span>
              </label>
              <input
                className="form-input"
                style={{ width: '100%' }}
                type={method === 'email' ? 'email' : 'tel'}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={method === 'email' ? tr('register.contact.emailPlaceholder') : tr('register.contact.phonePlaceholder')}
                autoComplete={method === 'email' ? 'email' : 'tel'}
                disabled={loading}
              />
              {method === 'phone' ? (
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 8,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                    }}
                  >
                    {tr('register.contact.optionalEmailLabel')}
                    {' '}
                    <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{tr('common.optional')}</span>
                  </label>
                  <input
                    className="form-input"
                    style={{ width: '100%' }}
                    type="email"
                    value={optionalEmail}
                    onChange={(e) => setOptionalEmail(e.target.value)}
                    placeholder={tr('register.contact.emailPlaceholder')}
                    autoComplete="email"
                    disabled={loading}
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 8 }}>
                    {tr('register.contact.optionalEmailHint')}
                  </p>
                </div>
              ) : null}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 8 }}>
                {method === 'phone' ? tr('register.contact.hintPhone') : tr('register.contact.hintEmail')}
              </p>
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, fontWeight: 700 }} disabled={loading}>
              {loading ? tr('common.sending') : tr('register.sendCode')}
            </button>
            <button
              type="button"
              className="btn"
              style={{ marginTop: 12, width: '100%', background: 'transparent' }}
              onClick={() => setStep('method')}
            >
              {tr('common.back')}
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
                ✓ {tr('register.codeSentPrefix')}{' '}
                {sendSuccess === 'email' ? tr('register.postSend.email') : tr('register.postSend.phone')}
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
              >{tr('register.digitCodeLabel')}</label>
              <input
                className="form-input"
                style={{ width: '100%', letterSpacing: '0.3em', fontSize: '1.2rem' }}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={tr('register.codePlaceholder')}
                disabled={loading}
              />
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, fontWeight: 700 }} disabled={loading}>
              {loading ? tr('common.checking') : tr('register.verify')}
            </button>
            <button type="button" className="btn" style={{ marginTop: 12, width: '100%' }} onClick={goBack} disabled={loading}>
              {tr('common.back')}
            </button>
            <button
              type="button"
              className="btn"
              style={{ marginTop: 8, width: '100%', background: 'transparent', fontSize: '0.9rem' }}
              onClick={() => sendCode()}
              disabled={loading}
            >
              {tr('register.resendCode')}
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
              >{tr('auth.passwordLabel')}</label>
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
              >{tr('register.confirmPassword')}</label>
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
              {loading ? tr('common.saving') : tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
            </button>
          </form>
        );
      case 'gender':
        return (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)' }}>
              {tr('register.genderPrompt')}
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
                  {g === 'MALE' ? tr('profile.genderMale') : tr('profile.genderFemale')}
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
                  setError(parseError(err, tr));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
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
                setError(tr('register.error.enterBirthday'));
                return;
              }
              setLoading(true);
              try {
                await patchProfile({ birthday, onboardingStep: 'LOCATION' });
                setStep('location');
              } catch (err) {
                setError(parseError(err, tr));
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
              >{tr('profile.birthday')}</label>
              <input
                type="date"
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                disabled={loading}
              />
              <p style={{ fontSize: 'clamp(0.78rem, 2.5vw, 0.85rem)', color: 'var(--text-light)', marginTop: 8 }}>
                {tr('register.mustBe18')}
              </p>
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={primaryButtonStyle(loading)} disabled={loading}>
              {tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
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
              >{tr('register.title.location')}</label>
              <input
                className="form-input"
                style={{ width: '100%', marginBottom: 8, minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                placeholder={tr('register.placeholder.searchWard')}
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
                    <span style={{ flex: 1, lineHeight: 1.35 }}>{labelTokyoWard(w, tr)}</span>
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
                  setError(parseError(err, tr));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
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
                setError(tr('register.error.nicknameLength'));
                return;
              }
              setLoading(true);
              try {
                await patchProfile({ displayName: n, onboardingStep: 'LEGAL' });
                setStep('legal');
              } catch (err) {
                setError(parseError(err, tr));
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
                {tr('register.nickname.label')}
                {' '}
                <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{tr('register.nickname.publicHint')}</span>
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: -4, marginBottom: 10 }}>
                {tr('register.nickname.description')}
              </p>
              <input
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
                disabled={loading}
                placeholder={tr('register.nickname.placeholder')}
              />
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={primaryButtonStyle(loading)} disabled={loading}>
              {tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
            </button>
          </form>
        );
      case 'legal':
        return (
          <div>
            {[
              ['over18', legalOver18, setLegalOver18],
              ['tos', legalTos, setLegalTos],
              ['privacy', legalPrivacy, setLegalPrivacy],
            ].map(([key, checked, set]) => (
              <label
                key={key}
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
                <span style={{ fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)', lineHeight: 1.4, flex: 1 }}>{tr(`register.legal.${key}`)}</span>
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
                  setError(parseError(err, tr));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
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
                setError(tr('register.error.heightRange'));
                return;
              }
              if (!relationshipIntention.trim() || !drinking.trim() || !smoking.trim() || !living.trim()) {
                setError(tr('register.error.completeBasics'));
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
                setError(parseError(err, tr));
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
                {tr('register.basics.height')}
                <span style={{ color: '#c0392b' }}> *</span>
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
                {tr('profile.education')}
                {' '}
                <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{tr('common.optional')}</span>
              </label>
              <input
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder={tr('register.basics.educationPlaceholder')}
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
                {tr('register.basics.occupation')}
                {' '}
                <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{tr('common.optional')}</span>
              </label>
              <input
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={tr('register.basics.occupationPlaceholder')}
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
                {tr('register.basics.annualIncome')}
                {' '}
                <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{tr('common.optional')}</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={incomeBand}
                onChange={(e) => setIncomeBand(e.target.value)}
              >
                <option value="">{tr('register.income.preferNot')}</option>
                <option value="UNDER_4M">{tr('register.income.under4m')}</option>
                <option value="M4_6M">{tr('register.income.m4_6m')}</option>
                <option value="M6_8M">{tr('register.income.m6_8m')}</option>
                <option value="M8_10M">{tr('register.income.m8_10m')}</option>
                <option value="OVER_10M">{tr('register.income.over10m')}</option>
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
                {tr('register.basics.relationshipIntention')}
                <span style={{ color: '#c0392b' }}> *</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={relationshipIntention}
                onChange={(e) => setRelationshipIntention(e.target.value)}
              >
                <option value="">{tr('common.selectPlaceholder')}</option>
                <option value="CASUAL">{tr('register.relInt.casual')}</option>
                <option value="SERIOUS">{tr('register.relInt.serious')}</option>
                <option value="OPEN">{tr('register.relInt.open')}</option>
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
                {tr('discover.settings.filter.drinking')}
                <span style={{ color: '#c0392b' }}> *</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={drinking}
                onChange={(e) => setDrinking(e.target.value)}
              >
                <option value="">{tr('common.selectPlaceholder')}</option>
                <option value="NEVER">{tr('register.onboardDrinking.never')}</option>
                <option value="SOMETIMES">{tr('register.onboardDrinking.sometimes')}</option>
                <option value="OFTEN">{tr('register.onboardDrinking.often')}</option>
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
                {tr('discover.settings.filter.smoking')}
                <span style={{ color: '#c0392b' }}> *</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={smoking}
                onChange={(e) => setSmoking(e.target.value)}
              >
                <option value="">{tr('common.selectPlaceholder')}</option>
                <option value="NO">{tr('register.onboardSmoking.no')}</option>
                <option value="SOCIAL">{tr('register.onboardSmoking.social')}</option>
                <option value="YES">{tr('register.onboardSmoking.yes')}</option>
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
                {tr('register.basics.livingSituation')}
                <span style={{ color: '#c0392b' }}> *</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={living}
                onChange={(e) => setLiving(e.target.value)}
              >
                <option value="">{tr('common.selectPlaceholder')}</option>
                <option value="ALONE">{tr('register.living.alone')}</option>
                <option value="FAMILY">{tr('register.living.family')}</option>
                <option value="ROOMMATES">{tr('register.living.roommates')}</option>
                <option value="OTHER">{tr('register.living.other')}</option>
              </select>
            </div>
            {error ? (
              <div className="auth-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary" style={primaryButtonStyle(loading)} disabled={loading}>
              {tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
            </button>
          </form>
        );
      case 'interests':
        return (
          <div>
            <input
              className="form-input"
              style={{ width: '100%', marginBottom: 12, minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
              placeholder={tr('register.interests.searchPlaceholder')}
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
                  {tr(`register.hobbyPreset.${HOBBY_PRESET_I18N[h]}`)}
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
                  setError(parseError(err, tr));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
            </button>
          </div>
        );
      case 'attribution':
        return (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 'clamp(0.9rem, 2.8vw, 0.95rem)' }}>
              {tr('register.attribution.prompt')}
            </p>
            <div className="form-group">
              <select
                className="form-input"
                style={{ width: '100%', minHeight: 48, fontSize: 'clamp(16px, 4vw, 1rem)' }}
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
              >
                <option value="">{tr('register.income.preferNot')}</option>
                {REFERRAL_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {tr(`register.referral.${v}`)}
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
                  setError(parseError(err, tr));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {tr('common.continue')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
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
              {tr('register.photos.intro')}
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
                        {tr('register.photos.mainBadge')}
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
              {loading ? tr('register.creatingAccount') : tr('register.createAccount')}
            </button>
            <button type="button" className="btn" style={backButtonStyle(loading)} onClick={goBack} disabled={loading}>
              {tr('common.back')}
            </button>
          </form>
        );
      case 'done':
        return (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tr('register.done.headline')}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{tr('register.done.redirect')}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const title = tr(`register.title.${step}`, { defaultValue: tr('register.title.fallback') });

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
          {tr('register.booting')}
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
          {showProgress ? <ProgressBar phase={profileProgress.phase} total={profileProgress.total} t={tr} /> : null}
          <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem' }}>
            <Link to="/language?next=/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              {tr('lang.changeLink')}
            </Link>
          </p>
        </div>

        <div className="card auth-card-stagger" style={{ padding: 'clamp(24px, 5vw, 32px)' }}>
          {renderBody()}
          {['method', 'done'].includes(step) ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 24, marginBottom: 0, fontSize: '0.95rem' }}>
              {tr('register.footerHasAccount')}{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                {tr('register.footerSignIn')}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
