import axios from 'axios';
import { API_BASE_URL } from './config/urls.js';

const api = axios.create({
  baseURL: API_BASE_URL,
});

/** Path portion of the request, for matching public auth routes. */
function requestPath(config) {
  const raw = config.url || '';
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return new URL(raw).pathname.split('?')[0];
    }
  } catch {
    /* ignore */
  }
  const base = (config.baseURL || '').replace(/\/$/, '');
  try {
    if (raw.startsWith('/') || !base) {
      return raw.split('?')[0];
    }
    return new URL(raw, `${base}/`).pathname.split('?')[0];
  } catch {
    return String(raw).split('?')[0];
  }
}

function isPublicAuthPath(path) {
  if (!path) return false;
  const p = path.split('?')[0];
  // Match with or without a gateway prefix (e.g. /api/auth/...).
  if (/\/auth\/login$/.test(p) || /\/auth\/register$/.test(p)) return true;
  if (p.includes('/auth/registration/tokyo-wards')) return true;
  if (p.includes('/auth/registration/email/') || p.includes('/auth/registration/phone/')) return true;
  if (/\/auth\/registration\/password$/.test(p)) return true;
  return false;
}

/**
 * Axios v1 uses AxiosHeaders; assignment on nested objects can be ignored for some methods.
 * Always normalize to AxiosHeaders and set Authorization.
 */
function attachBearer(config, token) {
  const value = `Bearer ${token}`;
  const HeadersCtor = axios.AxiosHeaders;
  if (typeof HeadersCtor?.from === 'function') {
    const h = HeadersCtor.from(config.headers ?? {});
    h.set('Authorization', value, true);
    config.headers = h;
  } else {
    const h = config.headers && typeof config.headers === 'object' ? { ...config.headers } : {};
    h.Authorization = value;
    config.headers = h;
  }
}

function stripAuthorizationHeader(config) {
  const HeadersCtor = axios.AxiosHeaders;
  if (typeof HeadersCtor?.from === 'function') {
    const h = HeadersCtor.from(config.headers ?? {});
    h.delete('Authorization');
    config.headers = h;
  } else {
    const h = config.headers && typeof config.headers === 'object' ? { ...config.headers } : {};
    delete h.Authorization;
    config.headers = h;
  }
}

// Send JWT on every request except login/register (those must not reuse an old token).
api.interceptors.request.use(
  (config) => {
    const path = requestPath(config);
    if (isPublicAuthPath(path)) {
      // Stale tokens must not hit registration endpoints (some setups reject invalid Bearer).
      stripAuthorizationHeader(config);
      return config;
    }
    const token = localStorage.getItem('token');
    if (token) {
      attachBearer(config, token);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

function authRequestUrl(config) {
  if (!config) return false;
  const path = requestPath(config);
  return isPublicAuthPath(path);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const onAuthForm = authRequestUrl(error.config);
    const onAuthPage =
      window.location.pathname === '/login' || window.location.pathname === '/register';

    if (status === 401 && !onAuthForm && !onAuthPage) {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('youme:auth-lost'));
      return Promise.reject(new Error('Session expired or unauthorized.'));
    }
    if (status === 403 && onAuthForm) {
      const msg = error.response?.data?.error || 'Could not reach the sign-in service. Please try again.';
      return Promise.reject(Object.assign(new Error(msg), { response: error.response }));
    }
    return Promise.reject(error);
  },
);

export default api;
