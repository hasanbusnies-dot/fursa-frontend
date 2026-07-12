/* Forsa service worker — Phase D: web push only.
   The PWA T1 offline/caching strategy lands in THIS file later (one SW serves both).
   Payload contract (backend push provider): { title, body, url, tag }. */

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { return; }

  const { title, body, url, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'فرصة', {
      body: body || '',
      icon: '/forsa-logo-192.png',
      badge: '/forsa-logo-128.png',
      dir: 'rtl',
      lang: 'ar',
      // Collapse key: same-type notifications replace instead of stacking.
      tag: tag || 'forsa',
      data: { url: url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) { await client.navigate(url); return; }
      }
    }
    await clients.openWindow(url);
  })());
});
