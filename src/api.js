import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8090',
});

// Add a request interceptor to send JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(new Error('Unauthorized. Redirecting to login.'));
    }
    return Promise.reject(error);
  }
);

export default api;
