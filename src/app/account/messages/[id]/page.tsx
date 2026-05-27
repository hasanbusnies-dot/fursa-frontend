'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight, Send, ImageOff, Loader2, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { messagesService } from '@/services/messages.service';
import { useAuthStore } from '@/store/auth.store';
import type { ChatRoom, Message } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ar-SY', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  if (date.toDateString() === now.toDateString()) return 'اليوم';
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return 'أمس';
  return date.toLocaleDateString('ar-SY', { day: 'numeric', month: 'long' });
}

function otherUser(room: ChatRoom, currentUserId: string) {
  const isBuyer = room.buyerId === currentUserId;
  const direct  = isBuyer ? room.seller : room.buyer;
  if (direct) return direct;
  return room.participants?.find((p) => p.id !== currentUserId);
}

function otherName(room: ChatRoom, currentUserId: string): string {
  const other = otherUser(room, currentUserId);
  if (other?.profile) return `${other.profile.firstName} ${other.profile.lastName}`.trim();
  return other?.email ?? (room.buyerId === currentUserId ? 'البائع' : 'المشتري');
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChatSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse" style={{ height: 'calc(100vh - 10rem)' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-200 rounded w-48" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 bg-gray-50/40">
        {[70, 50, 65, 45, 60].map((w, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className="h-9 rounded-2xl bg-gray-200" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-100 shrink-0">
        <div className="h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const roomId  = params.id as string;

  const [mounted,  setMounted]  = useState(false);
  const [room,     setRoom]     = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [draft,    setDraft]    = useState('');
  const [sending,  setSending]  = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
  }, [mounted, isAuthenticated, router]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    messagesService.getRoom(roomId)
      .then((roomData) => {
        if (cancelled) return;
        setRoom(roomData);
        setMessages(Array.isArray(roomData.messages) ? roomData.messages : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError('تعذّر تحميل المحادثة. تأكد من أن الرابط صحيح.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated, roomId]);

  // ── Polling for new messages every 5 s ────────────────────────────────────

  const pollMessages = useCallback(async () => {
    try {
      const roomData = await messagesService.getRoom(roomId);
      setMessages(Array.isArray(roomData.messages) ? roomData.messages : []);
    } catch { /* silent — polling errors don't disrupt the UI */ }
  }, [roomId]);

  useEffect(() => {
    if (!mounted || !isAuthenticated || loading) return;
    const id = setInterval(pollMessages, 5_000);
    return () => clearInterval(id);
  }, [mounted, isAuthenticated, loading, pollMessages]);

  // ── Auto-scroll: only when near bottom (don't interrupt manual scrolling) ─

  function isNearBottom(): boolean {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 220;
  }

  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Send ──────────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const newMsg = await messagesService.sendMessage(roomId, text);
      setMessages((prev) => [...prev, newMsg]);
      setDraft('');
      // Always scroll after own send
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      inputRef.current?.focus();
    } catch {
      toast.error('تعذّر إرسال الرسالة. حاول مجدداً.');
    } finally {
      setSending(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!mounted || !isAuthenticated) return null;
  if (loading) return <ChatSkeleton />;

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <AlertCircle className="w-10 h-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">{error ?? 'المحادثة غير موجودة.'}</p>
        <Link
          href="/account/messages"
          className="text-sm font-semibold text-orange-500 hover:text-orange-700 transition-colors"
        >
          ← العودة إلى الرسائل
        </Link>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const currentUserId = user!.id;
  const name          = otherName(room, currentUserId);
  const listingThumb  = room.listing?.images?.find((i) => i.isPrimary)?.url
    ?? room.listing?.images?.[0]?.url;
  const listingTitle  = room.listing?.title ?? 'الإعلان';

  // Group messages by day for day-separator rendering
  const groups: { day: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const day  = formatDay(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.msgs.push(msg);
    else groups.push({ day, msgs: [msg] });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden"
      style={{ height: 'calc(100vh - 10rem)' }}
    >

      {/* ── Header ── */}
      <div dir="rtl" className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        {/* Back — ChevronRight is "forward" in LTR but visually correct "back" arrow in RTL */}
        <Link
          href="/account/messages"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors shrink-0"
          aria-label="عودة"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-sm shrink-0 select-none">
          {initials(name)}
        </div>

        {/* Name + listing pill */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
          <Link
            href={`/listings/${room.listingId}`}
            className="inline-flex items-center gap-1.5 group max-w-full"
          >
            <div className="w-4 h-4 rounded overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
              {listingThumb
                ? <img src={listingThumb} alt="" className="w-full h-full object-cover" />
                : <ImageOff className="w-2.5 h-2.5 text-gray-300" />
              }
            </div>
            <span className="text-[11px] text-gray-400 group-hover:text-orange-500 transition-colors truncate">
              {listingTitle}
            </span>
          </Link>
        </div>
      </div>

      {/* ── Message history ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/40"
        dir="rtl"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">لا توجد رسائل بعد. ابدأ المحادثة!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(({ day, msgs }) => (
              <div key={day}>
                {/* Day divider */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[11px] text-gray-400 font-medium shrink-0 px-1">{day}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Message bubbles */}
                <div className="space-y-1">
                  {msgs.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMine ? 'flex-row' : 'flex-row-reverse'}`}
                      >
                        <div
                          className={`
                            max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words
                            ${isMine
                              ? 'bg-orange-500 text-white rounded-tl-sm ms-auto'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-tr-sm shadow-sm me-auto'
                            }
                          `}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-0.5 text-start ${isMine ? 'text-orange-100' : 'text-gray-400'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div dir="rtl" className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="اكتب رسالتك…"
            disabled={sending}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent placeholder:text-gray-300 disabled:opacity-60 transition"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            aria-label="إرسال"
            className="w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

    </div>
  );
}
