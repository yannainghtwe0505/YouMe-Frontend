/**
 * Central URL config for the SPA. Values come from Vite env files — see docs/ENVIRONMENT_URLS.md.
 *
 * Dev default `/api` hits the Vite proxy (same origin → avoids CORS and Chrome Private Network Access
 * blocking localhost/LAN → private-IP API calls).
 */

function resolveApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).trim().replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '/api';
  }
  throw new Error(
    'VITE_API_URL is not set. Define it in .env.staging / .env.production (see docs/ENVIRONMENT_URLS.md).',
  );
}

/** Backend REST API root (no trailing slash), or `/api` in dev when using the Vite proxy. */
export const API_BASE_URL = resolveApiBaseUrl();

/** Optional full WebSocket URL; if unset, chatSocket derives ws(s):// from API_BASE_URL + /ws/chat. */
export const WS_URL = (import.meta.env.VITE_WS_URL && String(import.meta.env.VITE_WS_URL).trim()) || '';

/** Optional public origin of this SPA (Stripe redirects, sharing). No trailing slash. */
export const APP_PUBLIC_URL = (import.meta.env.VITE_PUBLIC_APP_URL && String(import.meta.env.VITE_PUBLIC_APP_URL).replace(/\/$/, '')) || '';

/**
 * Optional API Gateway base URL for serverless S3 presign (Lambda). No trailing slash.
 * When set, photo uploads call POST {PRESIGN_API_URL}/presign instead of Spring /photos/presign.
 * Deploy the presign stack from the dedicated serverless repository; JWT must match the API secret.
 */
function resolvePresignApiUrl() {
  const raw = import.meta.env.VITE_PRESIGN_API_URL;
  if (raw == null || String(raw).trim() === '') {
    return '';
  }
  return String(raw).trim().replace(/\/$/, '');
}

export const PRESIGN_API_URL = resolvePresignApiUrl();
