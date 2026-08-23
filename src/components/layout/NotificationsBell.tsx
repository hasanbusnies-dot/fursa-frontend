'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { notificationsService, type AppNotification } from '@/services/notifications.service';
import { useNotificationsStore } from '@/store/notifications.store';
import { notificationHref, NOTIFICATION_ICONS, timeAgoAr } from '@/lib/notifications';
import { cn } from '@/lib/utils';

const PREVIEW_COUNT = 7;

/**
 * Header bell: numeric unread badge + dropdown preview of the latest notifications.
 * Mounts only inside the authenticated header group. Count lifecycle: fetched on
 * mount, bumped live by SocketManager, refreshed from meta on every dropdown open
 * (self-heals any socket gap). Styling follows the Stitch redesign (glass/pebble,
 * blue accents) — deliberately not the legacy orange of the neighboring icons.
 */
export function NotificationsBell() {
  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const { setUnread, decrement, clear } = useNotificationsStore.getState();
  // Initial badge count is fetched by SocketManager (app-wide) — the bell only
  // self-heals it from meta on every dropdown open below.

  // Outside-click close — same pattern as the header's other dropdowns.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Fetch the preview (and self-heal the badge from meta) on every open.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    notificationsService.getNotifications(1, PREVIEW_COUNT)
      .then(({ items, meta }) => { setItems(items); setUnread(meta.unreadCount); })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onItemClick = (n: AppNotification) => {
    setOpen(false);
    // Back from the opened page returns to the page this dropdown was opened
    // over — real history, via useSmartBack. See lib/notifications.ts.
    if (!n.isRead) {
      // Optimistic: badge + local tint flip now; the PATCH rides behind.
      decrement();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      notificationsService.markRead(n.id).catch(() => {});
    }
  };

  const onMarkAllRead = () => {
    clear();
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    notificationsService.markAllRead().catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          open ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100',
        )}
        title="الإشعارات"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-md rounded-xl border border-gray-100 shadow-[var(--shadow-pebble-hover)] z-50 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">الإشعارات</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <BellOff className="w-7 h-7" />
              <p className="text-sm">لا إشعارات بعد</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const { Icon, className } = NOTIFICATION_ICONS[n.type] ?? NOTIFICATION_ICONS.SYSTEM;
                return (
                  <li key={n.id}>
                    <Link
                      href={notificationHref(n)}
                      onClick={() => onItemClick(n)}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50',
                        !n.isRead && 'bg-blue-50/50',
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        <Icon className={cn('w-[18px] h-[18px]', className)} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-base font-semibold text-gray-900 truncate">{n.title}</span>
                        <span className="block text-sm text-gray-500 line-clamp-2 leading-relaxed">{n.content}</span>
                        <span className="block text-xs text-gray-400 mt-1">{timeAgoAr(n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span className="mt-2 w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Footer */}
          <Link
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className="block text-center py-2.5 text-sm font-semibold text-blue-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
          >
            عرض كل الإشعارات
          </Link>
        </div>
      )}
    </div>
  );
}
