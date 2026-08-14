import { MessageSquare, TrendingDown, CheckCircle2, XCircle, Info, Sparkles, Wallet, type LucideIcon } from 'lucide-react';
import type { AppNotification, NotificationType } from '@/services/notifications.service';

// ── Shared notification UI helpers (bell dropdown + /account/notifications page) ──

/** Deep-link target resolved from metadata; falls back to the notifications page. */
export function notificationHref(n: AppNotification): string {
  if (n.type === 'WALLET_TOPUP') return '/account/wallet';
  if (n.metadata?.listingId) return `/listings/${n.metadata.listingId}`;
  if (n.metadata?.conversationId) return `/account/messages/${n.metadata.conversationId}`;
  // A NEW_MESSAGE without its conversation id still belongs on the messages surface.
  if (n.type === 'NEW_MESSAGE') return '/account/messages';
  return '/account/notifications';
}

// ── "Came from the notifications list" origin — RETIRED 2026-08-14 ───────────
// This file used to remember, per tab-session, that a page had been opened from
// the notifications list, so its back button could return there instead of to
// the target's structural parent. lib/navigation.ts generalises that: back now
// uses real in-app history first, which returns to the notifications list (or to
// whatever page the header's bell dropdown was opened over — strictly better,
// since a dropdown click never meant the user had VISITED the list) and falls
// back to a contextual destination only on deep-link entry. Nothing read the
// origin any more, so it is gone rather than left to rot alongside its
// replacement — two competing back mechanisms is how this drifts back apart.

/** Type → icon + accent color for list rendering. */
export const NOTIFICATION_ICONS: Record<NotificationType, { Icon: LucideIcon; className: string }> = {
  NEW_MESSAGE:      { Icon: MessageSquare, className: 'text-blue-500' },
  PRICE_DROP:       { Icon: TrendingDown,  className: 'text-green-600' },
  LISTING_APPROVED: { Icon: CheckCircle2,  className: 'text-green-500' },
  LISTING_REJECTED: { Icon: XCircle,       className: 'text-red-500' },
  LISTING_CTA:      { Icon: Sparkles,      className: 'text-amber-500' },
  WALLET_TOPUP:     { Icon: Wallet,        className: 'text-orange-500' },
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
