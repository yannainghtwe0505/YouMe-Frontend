/* YouMe Web Push service worker */
self.addEventListener('push', (event) => {
  let payload = { title: 'YouMe', body: '', data: {} };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    payload.body = event.data ? event.data.text() : '';
  }
  const title = payload.title || 'YouMe';
  const options = {
    body: payload.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
    tag: payload.data?.matchId ? `match-${payload.data.matchId}` : 'youme',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deepLink = event.notification.data?.deepLink || '/messages';
  const url = new URL(deepLink, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
