'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { registerServiceWorker } from '@/lib/push';
import { notificationHref } from '@/lib/notifications';
import { notificationsService, type AppNotification } from '@/services/notifications.service';

// Headless component mounted once in the root layout. Owns the single shared socket's
// lifecycle (connect when authenticated, disconnect on logout) AND the app-wide
// 'notification' listener: badge bump + toast with a deep-link action. Every event
// carries a real DB id (the backend chokepoint persists before emitting).
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

    // Idempotent SW registration (push; later also PWA T1 caching). Registering does
    // NOT prompt for anything — permission is only requested from user gestures.
    void registerServiceWorker();

    const socket = connectSocket();
    const onNotification = (n: AppNotification) => {
      useNotificationsStore.getState().bump();
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
