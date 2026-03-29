

import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import LikesPage from './pages/LikesPage';
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

function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ token });
    }
    setInitializing(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
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
            <Link to="/messages/1" className={`nav-item ${location.pathname.startsWith('/messages') ? 'active' : ''}`}>
              <span className="nav-icon">💬</span>
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
