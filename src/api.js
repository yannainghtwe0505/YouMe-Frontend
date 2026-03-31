import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8090',
});

// Send JWT for API calls only — never on login/register (avoids stale tokens confusing auth)
api.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const isPublicAuth =
      url.startsWith('/auth/login') || url.startsWith('/auth/register');
    if (!isPublicAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function authRequestUrl(config) {
  const base = config?.baseURL || '';
  const path = config?.url || '';
  const full = `${base}${path}`;
  return full.includes('/auth/login') || full.includes('/auth/register') || path.startsWith('/auth/login')
    || path.startsWith('/auth/register');
}

// Add a response interceptor: 401 on protected routes → clear token and go to login (not on login/register themselves)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const onAuthForm = authRequestUrl(error.config);
    if (status === 401 && !onAuthForm) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(new Error('Unauthorized. Redirecting to login.'));
    }
    if (status === 403 && onAuthForm) {
      const msg = error.response?.data?.error || 'Could not reach the sign-in service. Please try again.';
      return Promise.reject(Object.assign(new Error(msg), { response: error.response }));
    }
    return Promise.reject(error);
  }
);

export default api;
