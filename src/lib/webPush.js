import api from '../api';

const SUBSCRIPTION_STORAGE_KEY = 'youme-web-push-subscription';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

export function isWebPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export async function fetchWebPushConfig() {
  const res = await api.get('/me/notifications/web-push/config');
  return res.data || { enabled: false, publicKey: '' };
}

export async function subscribeAndRegisterWebPush(locale) {
  if (!isWebPushSupported()) {
    throw new Error('unsupported');
  }
  const config = await fetchWebPushConfig();
  if (!config.enabled || !config.publicKey) {
    throw new Error('not_configured');
  }
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      throw new Error('permission_denied');
    }
  } else if (Notification.permission !== 'granted') {
    throw new Error('permission_denied');
  }

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
  }

  const json = JSON.stringify(subscription.toJSON());
  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, json);

  await api.put('/me/notifications/device-token', {
    token: json,
    platform: 'WEB',
    locale,
    enabled: true,
  });

  return json;
}

export async function unsubscribeWebPush() {
  const stored = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
  if (stored) {
    await api.delete('/me/notifications/device-token', { data: { token: stored } }).catch(() => {});
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    /* ignore */
  }
  localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
  await api.put('/me/notifications/preferences', { enabled: false });
}
