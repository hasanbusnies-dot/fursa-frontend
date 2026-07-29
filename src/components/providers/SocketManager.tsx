'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { ensurePushSubscription } from '@/lib/push';
import { notificationHref } from '@/lib/notifications';
import { notificationsService, type AppNotification } from '@/services/notifications.service';

// Headless component mounted once in the root layout. Owns the single shared socket's
// lifecycle (connect when authenticated, disconnect on logout) AND the app-wide
// 'notification' listener: badge bump + toast with a deep-link action. Every event
// carries a real DB id (the backend chokepoint persists before emitting).
// Wallet-credit socket arrivals re-broadcast as a window event so wallet surfaces can
// refetch (mirrors the FAVORITED_EVENT pattern — SocketManager stays headless).
export const WALLET_CREDITED_EVENT = 'forsa:wallet-credited';

export function SocketManager() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      useNotificationsStore.getState().clear();
      return;
    }

    // Initial badge count — lives here (not in the bell) so mobile viewports, where
    // the header bell never mounts, still get a correct drawer badge.
    notificationsService.getUnreadCount()
      .then((n) => useNotificationsStore.getState().setUnread(n))
      .catch(() => {});

    // PUSH only — the service worker itself is registered for every visitor by
    // ServiceWorkerRegistrar in the root layout (offline shell needs it whether or
    // not anyone is logged in). ensurePushSubscription silently heals
    // granted-but-unsubscribed sessions (and re-asserts the backend row for live
    // ones), self-registering if it somehow runs first; it never prompts.
    void ensurePushSubscription();

    const socket = connectSocket();
    const onNotification = (n: AppNotification) => {
      useNotificationsStore.getState().bump();
      if (n.type === 'WALLET_TOPUP') window.dispatchEvent(new Event(WALLET_CREDITED_EVENT));
      toast(n.title, {
        description: n.content,
        action: {
          label: 'عرض',
          onClick: () => router.push(notificationHref(n)),
        },
      });
    };
    // off-before-on: auth-state changes re-run this effect on the same singleton —
    // never stack duplicate listeners (a reconnect keeps listeners; re-register would double).
    socket.off('notification');
    socket.on('notification', onNotification);

    return () => { socket.off('notification', onNotification); };
  }, [isAuthenticated, router]);

  return null;
}
