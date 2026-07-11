import { MessageSquare, TrendingDown, CheckCircle2, XCircle, Info, Sparkles, type LucideIcon } from 'lucide-react';
import type { AppNotification, NotificationType } from '@/services/notifications.service';

// ── Shared notification UI helpers (bell dropdown + /account/notifications page) ──

/** Deep-link target resolved from metadata; falls back to the notifications page. */
export function notificationHref(n: AppNotification): string {
  if (n.metadata?.listingId) return `/listings/${n.metadata.listingId}`;
  if (n.metadata?.conversationId) return `/account/messages/${n.metadata.conversationId}`;
  // A NEW_MESSAGE without its conversation id still belongs on the messages surface.
  if (n.type === 'NEW_MESSAGE') return '/account/messages';
  return '/account/notifications';
}

/** Type → icon + accent color for list rendering. */
export const NOTIFICATION_ICONS: Record<NotificationType, { Icon: LucideIcon; className: string }> = {
  NEW_MESSAGE:      { Icon: MessageSquare, className: 'text-blue-500' },
  PRICE_DROP:       { Icon: TrendingDown,  className: 'text-green-600' },
  LISTING_APPROVED: { Icon: CheckCircle2,  className: 'text-green-500' },
  LISTING_REJECTED: { Icon: XCircle,       className: 'text-red-500' },
  LISTING_CTA:      { Icon: Sparkles,      className: 'text-amber-500' },
  SYSTEM:           { Icon: Info,          className: 'text-gray-400' },
};

/** Arabic relative time (the shared timeAgo helper is English-only). */
export function timeAgoAr(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? 'قبل دقيقة' : minutes === 2 ? 'قبل دقيقتين' : `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'قبل ساعة' : hours === 2 ? 'قبل ساعتين' : `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? 'قبل يوم' : days === 2 ? 'قبل يومين' : `قبل ${days} يوم`;
  return new Date(date).toLocaleDateString('ar-SY');
}
