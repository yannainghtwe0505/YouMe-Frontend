/**
 * Product analytics: PostHog (when configured) + server-side help events batch.
 */
import posthog from 'posthog-js';
import api from '../api';

const QUEUE_KEY = 'youme_analytics_queue';
const FLUSH_INTERVAL_MS = 8000;
const MAX_QUEUE = 40;

let flushTimer = null;
let posthogReady = false;

function readQueue() {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  } catch {
    /* ignore */
  }
}

function hasToken() {
  return Boolean(typeof localStorage !== 'undefined' && localStorage.getItem('token'));
}

export function initAnalytics(userId = null) {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
  if (key && !posthogReady) {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      persistence: 'localStorage',
      autocapture: false,
    });
    posthogReady = true;
  }
  if (posthogReady && userId != null) {
    posthog.identify(String(userId));
  }
}

export function resetAnalytics() {
  if (posthogReady) {
    posthog.reset();
  }
}

export function trackPageView(pathname) {
  if (!pathname) return;
  track('$pageview', { path: pathname });
  if (posthogReady) {
    posthog.capture('$pageview', { $current_url: pathname });
  }
}

export function track(eventName, properties = {}) {
  if (!eventName) return;
  const props = { ...properties, ts: Date.now() };
  if (posthogReady) {
    posthog.capture(eventName, props);
  }
  const item = {
    name: String(eventName).slice(0, 80),
    properties: props,
  };
  const q = readQueue();
  q.push(item);
  writeQueue(q);
  scheduleFlush();
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', item.name, item.properties);
  }
}

async function flush() {
  if (!hasToken()) return;
  const q = readQueue();
  if (q.length === 0) return;
  writeQueue([]);
  try {
    await api.post('/me/help/events', { events: q });
  } catch {
    writeQueue([...q, ...readQueue()].slice(-MAX_QUEUE));
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

export function flushAnalytics() {
  return flush();
}
