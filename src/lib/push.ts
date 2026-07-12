'use client';

import { api } from '@/services/api';

// ── Web-push client (Phase D) ───────────────────────────────────────────────────
// Registration is idempotent; subscribe/unsubscribe keep the browser subscription and
// the backend row in lockstep. iOS 16.4+ supports this ONLY for installed (home-screen)
// PWAs — surfaced via 'ios-install-needed' so the UI can show install guidance.

export type PushState =
  | 'unsupported'          // no SW/Push API in this browser
  | 'ios-install-needed'   // iOS Safari tab (not installed) — push impossible until A2HS
  | 'denied'               // browser-level permission denial; we can never re-prompt
  | 'subscribed'
  | 'unsubscribed';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function isIosSafariNotInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installed = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
  return iOS && !installed;
}

/** Idempotent — safe to call on every auth. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return isIosSafariNotInstalled() ? 'ios-install-needed' : 'unsupported';
  if (isIosSafariNotInstalled()) return 'ios-install-needed';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'subscribed' : 'unsubscribed';
}

/** Must be called from a user gesture (iOS requirement). Throws on failure/denial. */
export async function subscribeToPush(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) throw new Error('Push is not configured');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('permission-denied');

  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker());
  if (!reg) throw new Error('no-service-worker');
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await api.post('/notifications/web-push', sub.toJSON());
}

/** Idempotent both sides: browser unsubscribe + backend row delete. */
export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});
  await api.delete('/notifications/web-push', { body: JSON.stringify({ endpoint }) }).catch(() => {});
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  // Explicit ArrayBuffer backing — BufferSource (pushManager.subscribe) rejects
  // the ArrayBufferLike-typed default under the newer DOM lib typings.
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
