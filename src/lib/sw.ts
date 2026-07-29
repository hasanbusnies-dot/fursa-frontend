'use client';

// ── Service-worker registration ──────────────────────────────────────────────
// Deliberately separate from lib/push.ts. The SW serves TWO jobs and they have
// different audiences:
//   • offline shell (public/sw.js fetch handler) — EVERY visitor, logged in or
//     not, on any browser that has service workers. This is what keeps the Play
//     Store TWA off Chrome's network-error page, which Google flags as broken.
//   • web push — only authenticated users, only where Push/Notification exist.
// It used to live behind `isPushSupported()` and an `isAuthenticated` gate in
// SocketManager, so anonymous visitors never got a service worker at all and
// could never see the offline screen. Registration is idempotent: repeat calls
// on an already-registered scope resolve to the same registration.

export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/** Idempotent, never throws — a failed registration must not break the page. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) return null;
  try {
    // updateViaCache 'none': the SW script itself must never be served from the
    // HTTP cache, or a stale worker can pin an old offline shell indefinitely.
    return await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  } catch {
    return null;
  }
}
