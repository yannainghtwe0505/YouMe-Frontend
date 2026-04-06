import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8090',
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
  return path === '/auth/login' || path === '/auth/register';
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

// Send JWT on every request except login/register (those must not reuse an old token).
api.interceptors.request.use(
  (config) => {
    const path = requestPath(config);
    if (isPublicAuthPath(path)) {
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
    const onLoginPage = window.location.pathname === '/login' || window.location.pathname === '/register';

    if (status === 401 && !onAuthForm && !onLoginPage) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired or unauthorized. Redirecting to login.'));
    }
    if (status === 403 && onAuthForm) {
      const msg = error.response?.data?.error || 'Could not reach the sign-in service. Please try again.';
      return Promise.reject(Object.assign(new Error(msg), { response: error.response }));
    }
    return Promise.reject(error);
  },
);

export default api;
