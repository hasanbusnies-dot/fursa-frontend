'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { notificationsService, type AppNotification } from '@/services/notifications.service';
import { useNotificationsStore } from '@/store/notifications.store';
import { notificationHref, NOTIFICATION_ICONS, timeAgoAr } from '@/lib/notifications';
import { PushToggle } from '@/components/notifications/PushToggle';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

// ── Full notifications page (Phase A4) — the bell dropdown's «عرض الكل» target ──

export default function NotificationsPage() {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [items,       setItems]       = useState<AppNotification[]>([]);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [unreadOnly,  setUnreadOnly]  = useState(false);
  const [loading,     setLoading]     = useState(true);

  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const { setUnread, decrement, clear } = useNotificationsStore.getState();

  const load = useCallback((p: number, unread: boolean) => {
    setLoading(true);
    notificationsService.getNotifications(p, PAGE_SIZE, unread ? true : undefined)
      .then(({ items, meta }) => {
        setItems(items);
        setTotalPages(meta.totalPages || 1);
        setUnread(meta.unreadCount);
      })
      .catch(() => toast.error('تعذّر تحميل الإشعارات.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    load(page, unreadOnly);
  }, [isAuthenticated, router, page, unreadOnly, load]);

  const onItemClick = (n: AppNotification) => {
    if (!n.isRead) {
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

  if (!isAuthenticated) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Bell className="w-5 h-5 text-blue-600" />
          الإشعارات
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {/* Browser push opt-in/out (Phase D) */}
      <PushToggle />

      {/* Unread filter */}
      <div className="flex items-center gap-2 mb-4">
        {([['all', 'الكل'], ['unread', 'غير المقروءة فقط']] as const).map(([key, label]) => {
          const active = (key === 'unread') === unreadOnly;
          return (
            <button
              key={key}
              onClick={() => { setUnreadOnly(key === 'unread'); setPage(1); }}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors',
                active ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-white rounded-card shadow-pebble overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <BellOff className="w-9 h-9" />
            <p className="text-sm">{unreadOnly ? 'لا إشعارات غير مقروءة' : 'لا إشعارات بعد'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => {
              const { Icon, className } = NOTIFICATION_ICONS[n.type] ?? NOTIFICATION_ICONS.SYSTEM;
              return (
                <li key={n.id}>
                  <Link
                    href={notificationHref(n)}
                    onClick={() => onItemClick(n)}
                    className={cn(
                      'flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-gray-50',
                      !n.isRead && 'bg-blue-50/50',
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      <Icon className={cn('w-5 h-5', className)} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{n.title}</span>
                      <span className="block text-sm text-gray-500 leading-relaxed">{n.content}</span>
                      <span className="block text-xs text-gray-400 mt-1">{timeAgoAr(n.createdAt)}</span>
                    </span>
                    {!n.isRead && <span className="mt-2 w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-gray-500">صفحة {page} من {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
