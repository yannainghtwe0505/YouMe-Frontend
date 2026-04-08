import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import api from './api';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import LikesPage from './pages/LikesPage';
import MatchesPage from './pages/MatchesPage';
import MessagesPage from './pages/MessagesPage';
import PhotosPage from './pages/PhotosPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

const BASE_TITLE = 'YouMe';

function App() {
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
      return {
        token,
        userId: d.userId,
        email: d.email,
        displayName: d.name,
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
      document.title = BASE_TITLE;
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
  }, [user, refreshMessagesUnread, location.pathname]);

  useEffect(() => {
    if (!user) {
      document.title = BASE_TITLE;
      return;
    }
    document.title = messagesUnread > 0 ? `(${messagesUnread}) ${BASE_TITLE}` : BASE_TITLE;
  }, [user, messagesUnread]);

  const handleLogin = (userData) => {
    const token = userData?.token ?? localStorage.getItem('token');
    setUser(token ? { ...userData, token } : userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (initializing) {
    return <div className="loading">Loading...</div>;
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
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/register" element={<RegisterPage onRegister={handleLogin} />} />
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
        </Routes>
      </div>

      {user && (
        <nav className="bottom-nav">
          <div className="nav-container">
            <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
              <span className="nav-icon">🔥</span>
              <span className="nav-label">Discover</span>
            </Link>
            <Link to="/likes" className={`nav-item ${location.pathname === '/likes' ? 'active' : ''}`}>
              <span className="nav-icon">❤️</span>
              <span className="nav-label">Likes</span>
            </Link>
            <Link to="/messages" className={`nav-item ${location.pathname.startsWith('/messages') ? 'active' : ''}`}>
              <span className="nav-icon-wrap">
                <span className="nav-icon">💬</span>
                {messagesUnread > 0 ? (
                  <span className="nav-badge">{messagesUnread > 99 ? '99+' : messagesUnread}</span>
                ) : null}
              </span>
              <span className="nav-label">Messages</span>
            </Link>
            <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
              <span className="nav-icon">👤</span>
              <span className="nav-label">Profile</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;
