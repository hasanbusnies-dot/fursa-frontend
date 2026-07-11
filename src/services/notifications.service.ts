import { api } from './api';

// ── In-app notifications (Phase A) ─────────────────────────────────────────────────
// Backed by GET /notifications (paginated; meta carries the GLOBAL unreadCount on
// every page, so the badge never needs a separate endpoint), PATCH /:id/read and
// PATCH /read-all. Realtime arrivals ride the socket 'notification' event
// (SocketManager) — same shape as a row here, always with a real DB id.

export type NotificationType =
  | 'NEW_MESSAGE'
  | 'PRICE_DROP'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  metadata?: {
    listingId?: string;
    conversationId?: string;
    senderId?: string;
  } | null;
  createdAt: string;
}

export interface NotificationsMeta {
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface NotificationsEnvelope {
  success: boolean;
  data: AppNotification[];
  meta: NotificationsMeta;
}

export const notificationsService = {
  /** Paginated list; meta.unreadCount is the global unread total regardless of filters. */
  getNotifications: async (page = 1, limit = 20, unread?: boolean): Promise<{ items: AppNotification[]; meta: NotificationsMeta }> => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (unread !== undefined) qs.set('unread', String(unread));
    const res = await api.get<NotificationsEnvelope>(`/notifications?${qs.toString()}`);
    return { items: res.data ?? [], meta: res.meta };
  },

  /** Cheapest way to read the global unread count (limit=1 page, meta only). */
  getUnreadCount: async (): Promise<number> => {
    const res = await api.get<NotificationsEnvelope>('/notifications?page=1&limit=1');
    return res.meta?.unreadCount ?? 0;
  },

  /** Mark one notification read. 404 (wrong/foreign id) propagates as ApiError. */
  markRead: async (id: string): Promise<void> => {
    await api.patch<unknown>(`/notifications/${id}/read`, {});
  },

  /** Mark everything read. */
  markAllRead: async (): Promise<void> => {
    await api.patch<unknown>('/notifications/read-all', {});
  },
};
