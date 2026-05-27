'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ImageOff, CheckCheck } from 'lucide-react';
import { messagesService } from '@/services/messages.service';
import { useAuthStore } from '@/store/auth.store';
import type { ChatRoom } from '@/types';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} س`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} ي`;
  return new Date(dateStr).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short' });
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-10 shrink-0" />
    </div>
  );
}

// ── Conversation card ─────────────────────────────────────────────────────────

function ConversationCard({ room, currentUserId }: { room: ChatRoom; currentUserId: string }) {
  const isBuyer   = room.buyerId === currentUserId;
  const other     = isBuyer ? room.seller : room.buyer;
  // Fallback when the backend doesn't populate buyer/seller objects
  const otherName = other?.profile
    ? `${other.profile.firstName} ${other.profile.lastName}`.trim()
    : other?.email ?? (isBuyer ? 'البائع' : 'المشتري');

  const listingThumb = room.listing?.images?.find((i) => i.isPrimary)?.url
    ?? room.listing?.images?.[0]?.url;
  const listingTitle = room.listing?.title ?? 'الإعلان';

  const snippet     = room.lastMessage?.content ?? 'لا توجد رسائل بعد';
  const timestamp   = room.lastMessage?.createdAt ?? room.updatedAt;
  const hasUnread   = (room.unreadCount ?? 0) > 0;

  return (
    <Link
      href={`/account/messages/${room.id}`}
      className={cn(
        'flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0',
        hasUnread && 'bg-blue-50/40 hover:bg-blue-50/60',
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-sm select-none">
          {initials(otherName)}
        </div>
        {hasUnread && (
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-extrabold flex items-center justify-center">
            {room.unreadCount! > 9 ? '9+' : room.unreadCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={cn('text-sm truncate', hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800')}>
            {otherName}
          </p>
          <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(timestamp)}</span>
        </div>

        {/* Listing pill */}
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-4 h-4 rounded overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
            {listingThumb
              ? <img src={listingThumb} alt="" className="w-full h-full object-cover" />
              : <ImageOff className="w-2.5 h-2.5 text-gray-300" />
            }
          </div>
          <span className="text-[11px] text-gray-400 truncate">{listingTitle}</span>
        </div>

        <p className={cn(
          'text-xs truncate flex items-center gap-1',
          hasUnread ? 'text-gray-700 font-medium' : 'text-gray-400',
        )}>
          {!isBuyer && room.lastMessage?.senderId === currentUserId && (
            <CheckCheck className="w-3 h-3 shrink-0 text-blue-400" />
          )}
          {snippet}
        </p>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [mounted,       setMounted]       = useState(false);
  const [conversations, setConversations] = useState<ChatRoom[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    messagesService.getRooms()
      .then((rooms) => {
        if (cancelled) return;
        // Most recent conversation first
        setConversations([...rooms].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ));
      })
      .catch(() => {
        if (cancelled) return;
        setError('حدث خطأ أثناء تحميل الرسائل.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated]);

  if (!mounted || !isAuthenticated) {
    return (
      <div>
        <div className="h-8 w-40 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  const totalUnread = conversations.reduce((n, r) => n + (r.unreadCount ?? 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            رسائلي
            {totalUnread > 0 && (
              <span className="ms-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-extrabold">
                {totalUnread}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            محادثاتك مع المشترين والبائعين
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 px-6">
            <MessageSquare className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-orange-500 hover:text-orange-700 font-medium"
            >
              حاول مجدداً
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
              <MessageSquare className="w-10 h-10 text-blue-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              لا توجد رسائل بعد
            </h2>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              ستظهر هنا الرسائل الواردة على إعلاناتك والرسائل التي ترسلها للبائعين.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((room) => (
              <ConversationCard
                key={room.id}
                room={room}
                currentUserId={user!.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
