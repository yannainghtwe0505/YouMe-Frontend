import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import api from './api';
import {
  LOCALE_CYCLE_ORDER,
  LANG_STORAGE_KEY,
  normalizeToAppLocale,
  isLanguageGateComplete,
} from './lib/locale';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import LikesPage from './pages/LikesPage';
import MatchesPage from './pages/MatchesPage';
import MessagesPage from './pages/MessagesPage';
import PhotosPage from './pages/PhotosPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LanguageSelectPage from './pages/LanguageSelectPage';
import UpgradePage from './pages/UpgradePage';
import UpgradeSuccessPage from './pages/UpgradeSuccessPage';

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.registrationComplete === false) {
    return <Navigate to="/register" replace />;
  }
  return children;
}

/** First-time visitors (no JWT) must confirm language before login/register. */
function LanguageGate({ children }) {
  const location = useLocation();
  const hasToken = Boolean(typeof localStorage !== 'undefined' && localStorage.getItem('token'));
  if (hasToken || isLanguageGateComplete()) {
    return children;
  }
  const next = `${location.pathname}${location.search || ''}` || '/login';
  return <Navigate to={`/language?next=${encodeURIComponent(next)}`} replace />;
}

function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const location = useLocation();

  const fetchMe = useCallback(async (token) => {
    try {
      const res = await api.get('/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data || {};
      if (d.locale === 'ja' || d.locale === 'en' || d.locale === 'my') {
        i18n.changeLanguage(d.locale);
        try {
          localStorage.setItem(LANG_STORAGE_KEY, d.locale);
        } catch {
          /* ignore */
        }
      }
      return {
        token,
        userId: d.userId,
        email: d.email,
        displayName: d.name,
        registrationComplete: d.registrationComplete !== false,
        onboardingStep: d.onboardingStep ?? '',
        locale: d.locale,
      };
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const onAuthLost = () => setUser(null);
    window.addEventListener('youme:auth-lost', onAuthLost);
    return () => window.removeEventListener('youme:auth-lost', onAuthLost);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) setInitializing(false);
        return;
      }
      const me = await fetchMe(token);
      if (!cancelled) {
        if (me) setUser(me);
        setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchMe]);

  const refreshMessagesUnread = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await api.get('/matches/unread-total');
      setMessagesUnread(res.data?.total ?? 0);
    } catch {
      setMessagesUnread(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMessagesUnread(0);
      document.title = t('app.title');
      return undefined;
    }
    if (user.registrationComplete === false) {
      setMessagesUnread(0);
      document.title = t('app.title');
      return undefined;
    }
    refreshMessagesUnread();
    const id = setInterval(refreshMessagesUnread, 30000);
    const onFocus = () => refreshMessagesUnread();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, refreshMessagesUnread, location.pathname, t]);

  useEffect(() => {
    if (!user || user.registrationComplete === false) {
      document.title = t('app.title');
      return;
    }
    document.title = messagesUnread > 0 ? t('app.titleUnread', { count: messagesUnread }) : t('app.title');
  }, [user, messagesUnread, t]);

  const handleLogin = (userData) => {
    const token = userData?.token ?? localStorage.getItem('token');
    if (!token) {
      setUser(userData);
      return;
    }
    fetchMe(token).then((me) => {
      setUser(me ? { ...userData, ...me, token } : { ...userData, token });
    });
  };

  const toggleLanguage = useCallback(async () => {
    const cur = normalizeToAppLocale(i18n.language);
    const idx = LOCALE_CYCLE_ORDER.indexOf(cur);
    const next = LOCALE_CYCLE_ORDER[(idx + 1) % LOCALE_CYCLE_ORDER.length];
    await i18n.changeLanguage(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const token = localStorage.getItem('token');
    if (token && user && user.registrationComplete !== false) {
      try {
        await api.put('/me/locale', { locale: next });
      } catch {
        /* offline or session; UI language still switched */
      }
    }
  }, [user]);

  useEffect(() => {
    const applyHtmlLang = (lng) => {
      const code = normalizeToAppLocale(lng);
      document.documentElement.lang = code === 'my' ? 'my' : code === 'ja' ? 'ja' : 'en';
    };
    applyHtmlLang(i18n.language);
    const handler = (lng) => applyHtmlLang(lng);
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (initializing) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="app">
      <div className="app-content">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <FeedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute user={user}>
                <ProfilePage onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/likes"
            element={
              <ProtectedRoute user={user}>
                <LikesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute user={user}>
                <MatchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:matchId"
            element={
              <ProtectedRoute user={user}>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/photos"
            element={
              <ProtectedRoute user={user}>
                <PhotosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upgrade"
            element={
              <ProtectedRoute user={user}>
                <UpgradePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upgrade/success"
            element={
              <ProtectedRoute user={user}>
                <UpgradeSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route path="/language" element={<LanguageSelectPage />} />
          <Route
            path="/login"
            element={(
              <LanguageGate>
                <LoginPage onLogin={handleLogin} />
              </LanguageGate>
            )}
          />
          <Route
            path="/register"
            element={
              user && user.registrationComplete !== false ? (
                <Navigate to="/" replace />
              ) : (
                <LanguageGate>
                  <RegisterPage onRegister={handleLogin} />
                </LanguageGate>
              )
            }
          />
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
        </Routes>
      </div>

      {user && user.registrationComplete !== false && !location.pathname.startsWith('/upgrade') && (
        <nav className="bottom-nav">
          <div className="nav-container">
            <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
              <span className="nav-icon">🔥</span>
              <span className="nav-label">{t('nav.discover')}</span>
            </Link>
            <Link to="/likes" className={`nav-item ${location.pathname === '/likes' ? 'active' : ''}`}>
              <span className="nav-icon">❤️</span>
              <span className="nav-label">{t('nav.likes')}</span>
            </Link>
            <Link to="/messages" className={`nav-item ${location.pathname.startsWith('/messages') ? 'active' : ''}`}>
              <span className="nav-icon-wrap">
                <span className="nav-icon">💬</span>
                {messagesUnread > 0 ? (
                  <span className="nav-badge">{messagesUnread > 99 ? '99+' : messagesUnread}</span>
                ) : null}
              </span>
              <span className="nav-label">{t('nav.messages')}</span>
            </Link>
            <button
              type="button"
              className="nav-item nav-item--lang"
              onClick={() => void toggleLanguage()}
              aria-label={t('profile.language')}
            >
              <span className="nav-icon" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                {normalizeToAppLocale(i18n.language) === 'ja' ? 'JA' : normalizeToAppLocale(i18n.language) === 'my' ? 'MY' : 'EN'}
              </span>
              <span className="nav-label">
                {normalizeToAppLocale(i18n.language) === 'en'
                  ? t('profile.langEn')
                  : normalizeToAppLocale(i18n.language) === 'ja'
                    ? t('profile.langJa')
                    : t('profile.langMy')}
              </span>
            </button>
            <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
              <span className="nav-icon">👤</span>
              <span className="nav-label">{t('nav.profile')}</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;
