/* fursago service worker — ONE worker, two jobs:
     1. OFFLINE SHELL (TWA launch prep): precache the offline document, serve it
        for any navigation the network refuses, and cache the immutable build
        output so repeat visits paint fast. Without this a Play Store TWA shows
        Chrome's network-error page offline, which Google flags as broken.
     2. WEB PUSH (Phase D): the push + notificationclick handlers at the bottom.
        Payload contract (backend push provider): { title, body, url, tag }.

   Registration lives in src/lib/sw.ts and runs for EVERY visitor (see the note
   there) — not only authenticated, push-capable ones.

   CACHING IS DELIBERATELY CONSERVATIVE. The goal is "never a white screen or a
   browser error", NOT full offline functionality:
     • navigations  → network-first, cached /offline only when the network fails
     • /_next/static → cache-first (content-hashed: a changed file gets a new URL,
                       so a cache hit can never be stale)
     • everything else, including EVERY API call → untouched, straight to network.
   Listings, prices and messages must never be served stale from a cache. */

const VERSION = 'v1';
const SHELL_CACHE = `fursago-shell-${VERSION}`;
const STATIC_CACHE = `fursago-static-${VERSION}`;
const OFFLINE_URL = '/offline';

// localhost is a secure context, so this worker also installs on the dev server.
// There, /_next/static URLs are NOT content-hashed the way a production build's
// are — Turbopack reuses paths across rebuilds — so cache-first would serve a
// stale chunk after an edit and look like broken HMR. Static caching is
// therefore production-only; the offline navigation fallback still runs in dev
// so it stays testable with DevTools' offline toggle.
const IS_LOCALHOST = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);

// ── Install: precache the offline document ──────────────────────────────────
// cache: 'reload' bypasses the HTTP cache so the precached copy is the current
// build's, never a stale one an intermediary happened to be holding.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
      // Take over as soon as the new worker is ready — an old worker must not
      // keep serving a previous offline shell for the rest of the session.
      await self.skipWaiting();
    })(),
  );
});

// ── Activate: drop caches from earlier versions, then claim open pages ───────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('fursago-') && k !== SHELL_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ── Fetch ───────────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  // Only opaque-free, successful same-origin responses are worth storing.
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Writes are never intercepted, and a cross-origin request (the API on
  // api.fursago.com, image CDNs, Socket.io) goes straight to the network.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Page loads: network-first. A server error is passed through untouched —
  // masking a 500 with "you are offline" would be a lie; only a THROWN fetch
  // (no connection) falls back to the offline document.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ??
            new Response('<h1 dir="rtl">لا يوجد اتصال بالإنترنت</h1>', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  // Immutable build output (JS/CSS/fonts under /_next/static) — cache-first.
  // This is what lets the offline document render styled, and it is safe
  // because every one of these URLs is content-hashed.
  if (!IS_LOCALHOST && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request).catch(() => fetch(request)));
  }

  // Anything else (RSC payloads, /api, public images, the manifest): no
  // interception at all — the browser handles it exactly as it would without us.
});

// ── Web push (unchanged behaviour; icons repointed to the fursago art) ──────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { return; }

  const { title, body, url, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'فرصة', {
      body: body || '',
      icon: '/fursago-icon-192.png',
      badge: '/fursago-icon-192.png',
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
