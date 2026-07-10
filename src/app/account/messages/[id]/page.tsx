'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight, Send, ImageOff, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { messagesService } from '@/services/messages.service';
import { getSocket, connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import type { ChatRoom, Message } from '@/types';

// A message may be an optimistic placeholder that hasn't been confirmed by the server yet.
type LocalMessage = Message & { pending?: boolean; failed?: boolean };

// Raw payload from the socket `receive_message` event (note: conversationId, not roomId).
interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

function mapIncoming(raw: SocketMessage): LocalMessage {
  return {
    id: raw.id,
    roomId: raw.conversationId,
    senderId: raw.senderId,
    content: raw.content,
    isRead: raw.isRead,
    createdAt:
      typeof raw.createdAt === 'string' ? raw.createdAt : new Date(raw.createdAt).toISOString(),
  };
}

// De-dupe an incoming real-time message against optimistic temps and replays.
function reconcileIncoming(prev: LocalMessage[], raw: SocketMessage): LocalMessage[] {
  const incoming = mapIncoming(raw);

  // 1. Already have it by real id → ignore (duplicate echo, or overlap with a refetch).
  if (prev.some((m) => m.id === incoming.id)) return prev;

  // 2. Matches one of our pending optimistic temps (our own echo) → replace the temp in
  //    place with the confirmed server message (real id/createdAt, drop `pending`).
  const tempIdx = prev.findIndex(
    (m) => m.pending && m.senderId === incoming.senderId && m.content === incoming.content,
  );
  if (tempIdx !== -1) {
    const next = [...prev];
    next[tempIdx] = incoming;
    return next;
  }

  // 3. Brand-new message (from the other party) → append.
  return [...prev, incoming];
}

// Merge a server history snapshot (ASC) — used for the initial load AND reconnect gap-fill.
// Keeps unconfirmed temps + any socket message newer than this snapshot; de-dupes by id.
function mergeHistory(prev: LocalMessage[], history: Message[]): LocalMessage[] {
  const ids = new Set(history.map((h) => h.id));
  const extras = prev.filter((m) => {
    if (ids.has(m.id)) return false;
    if (m.pending) {
      return !history.some((h) => h.senderId === m.senderId && h.content === m.content);
    }
    return true; // a real socket message not yet in this snapshot → keep
  });
  return [...history, ...extras];
}

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
    <div className="flex flex-col bg-white rounded-card shadow-pebble overflow-hidden animate-pulse" style={{ height: 'calc(100vh - 10rem)' }}>
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
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [draft,    setDraft]    = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const joinedOnceRef = useRef(false); // false until this conversation's first socket join

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
        // Merge (not replace) so a receive_message that landed before this HTTP load isn't lost.
        setMessages((prev) =>
          mergeHistory(prev, Array.isArray(roomData.messages) ? roomData.messages : []),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setError('تعذّر تحميل المحادثة. تأكد من أن الرابط صحيح.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated, roomId]);

  // ── Real-time: socket join + receive (replaces the old 5s poll) ─────────────

  useEffect(() => {
    if (!mounted || !isAuthenticated || !roomId) return;

    const socket = getSocket() ?? connectSocket();
    joinedOnceRef.current = false; // reset per conversation

    function joinAndMaybeGapFill() {
      socket.emit('join_conversation', roomId);
      if (joinedOnceRef.current) {
        // RE-connect → refetch history (ASC, also re-marks read) and merge by id to fill
        // any messages missed while we were disconnected.
        messagesService
          .getRoom(roomId)
          .then((rd) =>
            setMessages((prev) =>
              mergeHistory(prev, Array.isArray(rd.messages) ? rd.messages : []),
            ),
          )
          .catch(() => {});
      }
      joinedOnceRef.current = true;
    }

    function handleReceive(raw: SocketMessage) {
      if (raw.conversationId !== roomId) return; // ignore stray events
      setMessages((prev) => reconcileIncoming(prev, raw));
    }

    function handleSocketError({ message }: { message: string }) {
      toast.error(message || 'تعذّر إرسال الرسالة. حاول مجدداً.');
      // No correlation id in the contract → best-effort: fail the oldest still-pending temp.
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.pending);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], pending: false, failed: true };
        return next;
      });
    }

    socket.on('connect', joinAndMaybeGapFill);
    socket.on('receive_message', handleReceive);
    socket.on('error', handleSocketError);

    // Socket may already be connected (SocketManager connects on login) → join immediately.
    if (socket.connected) joinAndMaybeGapFill();

    return () => {
      socket.off('connect', joinAndMaybeGapFill);
      socket.off('receive_message', handleReceive);
      socket.off('error', handleSocketError);
    };
  }, [mounted, isAuthenticated, roomId]);

  // ── Auto-scroll: only when near bottom (don't interrupt manual scrolling) ─

  function isNearBottom(): boolean {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 220;
  }

  // Scroll ONLY the messages container — never the page. (scrollIntoView would scroll
  // every scrollable ancestor, including the window.)
  function scrollToBottom(smooth = false): void {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Scroll only when the message COUNT actually grows (a genuinely new message),
  // plus once on initial load. Polls that return the same list no longer scroll,
  // because pollMessages keeps the same array reference and the count is unchanged.
  const prevMsgCountRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length === 0) return;
    const isInitialLoad = prevMsgCountRef.current === 0;
    const hasNewMessage = messages.length > prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;

    if (isInitialLoad) {
      scrollToBottom();      // jump to bottom on first load
    } else if (hasNewMessage && isNearBottom()) {
      scrollToBottom(true);  // gentle scroll for genuinely new messages
    }
  }, [messages]);

  // ── Send ──────────────────────────────────────────────────────────────────

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    if (text.length > 2000) {
      toast.error('الرسالة طويلة جداً (الحد 2000 حرف).');
      return;
    }

    const socket = getSocket();
    if (!socket || !socket.connected) {
      toast.error('لا يوجد اتصال بالخادم. جارٍ إعادة المحاولة…');
      return;
    }

    // Optimistic UI: show the message instantly with a temp id. The server echo
    // (receive_message) reconciles it — replacing this temp with the real id/createdAt.
    const tempId = `temp-${Date.now()}`;
    const optimistic: LocalMessage = {
      id: tempId,
      content: text,
      senderId: user?.id ?? '',
      roomId,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    // Always scroll after own send (container only — never the page)
    setTimeout(() => scrollToBottom(true), 50);
    inputRef.current?.focus();

    socket.emit('send_message', { conversationId: roomId, content: text });
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
  const groups: { day: string; msgs: LocalMessage[] }[] = [];
  for (const msg of messages) {
    const day  = formatDay(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.msgs.push(msg);
    else groups.push({ day, msgs: [msg] });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col bg-white rounded-card shadow-pebble overflow-hidden"
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
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 bg-gray-50/40"
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
                            ${msg.pending ? 'opacity-60' : ''}
                            ${msg.failed ? 'ring-1 ring-red-300' : ''}
                          `}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-0.5 text-start ${isMine ? 'text-orange-100' : 'text-gray-400'}`}>
                            {msg.failed ? 'لم تُرسل' : msg.pending ? 'يُرسل…' : formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent placeholder:text-gray-300 disabled:opacity-60 transition"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="إرسال"
            className="w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
