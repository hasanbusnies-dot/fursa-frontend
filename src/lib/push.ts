'use client';

import { api } from '@/services/api';

// ── Web-push client (Phase D) ───────────────────────────────────────────────────
// Registration is idempotent; subscribe/unsubscribe keep the browser subscription and
// the backend row in lockstep. iOS 16.4+ supports this ONLY for installed (home-screen)
// PWAs — surfaced via 'ios-install-needed' so the UI can show install guidance.

export type PushState =
  | 'unsupported'          // no SW/Push API in this browser
  | 'ios-install-needed'   // iOS Safari tab (not installed) — push impossible until A2HS
  | 'unconfigured'         // NEXT_PUBLIC_VAPID_PUBLIC_KEY absent from this build — our gap, not the browser's
  | 'denied'               // browser-level permission denial; we can never re-prompt
  | 'subscribed'
  | 'unsubscribed';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushErrorCode = 'not-configured' | 'permission-denied' | 'subscribe-failed' | 'backend-failed';

export class PushError extends Error {
  constructor(readonly code: PushErrorCode) {
    super(code);
    this.name = 'PushError';
  }
}

/** Arabic explanation for a subscribe failure the user can act on; null → caller's generic fallback. */
export function pushErrorMessage(err: unknown): string | null {
  if (!(err instanceof PushError)) return null;
  switch (err.code) {
    case 'not-configured':
      return 'خدمة التنبيهات غير مهيأة حالياً — حاول مرة أخرى لاحقاً.';
    case 'permission-denied':
      return 'لم يُمنح إذن التنبيهات — فعّله من إعدادات الموقع في متصفحك ثم أعد المحاولة.';
    default:
      return null;
  }
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function isIosSafariNotInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // iPadOS 13+ masquerades as macOS in the UA — the touch-points check catches it.
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
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
  if (sub) return 'subscribed'; // an existing subscription stays switchable-off even without the key
  return VAPID_PUBLIC_KEY ? 'unsubscribed' : 'unconfigured';
}

/** Must be called from a user gesture (iOS requirement). Throws PushError on failure/denial. */
export async function subscribeToPush(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) throw new PushError('not-configured');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new PushError('permission-denied');

  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker());
  if (!reg) throw new PushError('subscribe-failed');
  await navigator.serviceWorker.ready;

  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  } catch {
    throw new PushError('subscribe-failed');
  }
  try {
    await api.post('/notifications/web-push', sub.toJSON());
  } catch {
    // Lockstep rule: a browser-only subscription would show the toggle "on" while the
    // backend has no row to deliver to — roll the browser side back before surfacing.
    await sub.unsubscribe().catch(() => {});
    throw new PushError('backend-failed');
  }
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
