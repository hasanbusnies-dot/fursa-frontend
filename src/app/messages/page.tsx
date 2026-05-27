'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Send, MessageSquare, ChevronLeft, ImageOff,
  Loader2, MessagesSquare, ArrowLeft,
} from 'lucide-react';
import { messagesService } from '@/services/messages.service';
import { useAuthStore } from '@/store/auth.store';
import type { ChatRoom, Message, User } from '@/types';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g`;
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function getOtherParticipant(room: ChatRoom, myId: string): User | undefined {
  // Prefer the explicit buyer/seller relation (Prisma schema)
  if (room.buyer && room.buyer.id !== myId) return room.buyer;
  if (room.seller && room.seller.id !== myId) return room.seller;
  // Fallback: generic participants array (some backends still send this)
  return room.participants?.find((p) => p?.id !== myId);
}

function getRoomThumb(room: ChatRoom): string | undefined {
  return (
    room.listing?.images?.find((i) => i?.isPrimary)?.url ??
    room.listing?.images?.[0]?.url
  );
}

function participantName(user: User | undefined | null): string {
  if (!user) return 'Kullanıcı';
  if (user.profile?.firstName) {
    return `${user.profile.firstName} ${user.profile.lastName ?? ''}`.trim();
  }
  return user.email ?? 'Kullanıcı';
}

function participantInitial(user: User | undefined | null): string {
  return participantName(user).charAt(0).toUpperCase() || 'K';
}

// ── Room item in the left panel ───────────────────────────────────────────────

function RoomItem({
  room,
  myId,
  isActive,
  onClick,
}: {
  room: ChatRoom;
  myId: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const other = getOtherParticipant(room, myId);
  const thumb = getRoomThumb(room);
  const lastMsg = room.lastMessage?.content ?? 'Konuşma başlatıldı';
  const time = room.lastMessage
    ? relativeTime(room.lastMessage.createdAt)
    : relativeTime(room.createdAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-l-2',
        isActive
          ? 'bg-orange-50 border-orange-500'
          : 'border-transparent hover:bg-gray-50',
      )}
    >
      {/* Listing thumbnail */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="w-5 h-5 text-gray-300" />
          )}
        </div>
        {/* Other user's avatar overlay */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white text-white text-[8px] font-bold leading-none">
          {participantInitial(other)}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {participantName(other)}
          </p>
          <span className="text-[10px] text-gray-400 shrink-0">{time}</span>
        </div>
        {room.listing?.title && (
          <p className="text-xs text-orange-600 font-medium truncate mb-0.5">
            {room.listing.title}
          </p>
        )}
        <p className="text-xs text-gray-500 truncate">{lastMsg}</p>
      </div>
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={cn('flex gap-2 mb-2', isMine ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar for other user */}
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 self-end">
          {(msg.sender ? participantName(msg.sender) : 'K').charAt(0).toUpperCase()}
        </div>
      )}

      <div className={cn('max-w-[72%]', isMine ? 'items-end' : 'items-start', 'flex flex-col')}>
        <div
          className={cn(
            'px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
            isMine
              ? 'bg-orange-500 text-white rounded-br-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm',
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 px-1">
          {relativeTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ── Empty/placeholder states ──────────────────────────────────────────────────

function NoChatSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
        <MessagesSquare className="w-8 h-8 text-orange-400" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-800 mb-1">Mesajlarınız</p>
        <p className="text-sm text-gray-500">Bir konuşma seçerek mesajlaşmaya başlayın.</p>
      </div>
    </div>
  );
}

function NoRooms() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <MessageSquare className="w-10 h-10 text-gray-300" />
      <p className="text-sm font-semibold text-gray-700">Henüz mesajınız yok</p>
      <p className="text-xs text-gray-400">Bir ilan sayfasından "Mesaj Gönder" butonuna tıklayarak konuşma başlatabilirsiniz.</p>
    </div>
  );
}

// ── Main chat content (uses useSearchParams, must be inside Suspense) ─────────

function MessagesContent() {
  const router             = useRouter();
  const searchParams       = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();

  const activeRoomId = searchParams.get('roomId');
  const myId         = user?.id ?? '';

  const [rooms,           setRooms]           = useState<ChatRoom[]>([]);
  const [messages,        setMessages]        = useState<Message[]>([]);
  const [loadingRooms,    setLoadingRooms]    = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text,            setText]            = useState('');
  const [sending,         setSending]         = useState(false);
  const [mobileShowChat,  setMobileShowChat]  = useState(!!activeRoomId);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  // Load rooms once
  useEffect(() => {
    if (!isAuthenticated) return;
    messagesService.getRooms()
      .then(setRooms)
      .catch((err) => console.error('[Messages] getRooms error:', err))
      .finally(() => setLoadingRooms(false));
  }, [isAuthenticated]);

  // Load messages whenever active room changes; start polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeRoomId) { setMessages([]); return; }

    setLoadingMessages(true);
    messagesService.getMessages(activeRoomId)
      // Backend returns newest-first (DESC). Reverse once on ingest so state is
      // always oldest-first (ASC). Optimistic appends via [...prev, msg] then
      // naturally place new messages at the bottom — no render-time reversal needed.
      .then((msgs) => setMessages([...msgs].reverse()))
      .catch((err) => console.error('[Messages] getMessages error:', err))
      .finally(() => setLoadingMessages(false));

    pollRef.current = setInterval(() => {
      messagesService.getMessages(activeRoomId)
        .then((msgs) => setMessages([...msgs].reverse()))
        .catch(() => {});
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeRoomId]);

  const prevMsgCountRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Show chat panel on mobile when roomId is present
  useEffect(() => {
    if (activeRoomId) setMobileShowChat(true);
  }, [activeRoomId]);

  function selectRoom(roomId: string) {
    router.push(`/messages?roomId=${roomId}`, { scroll: false } as Parameters<typeof router.push>[1]);
    setMobileShowChat(true);
  }

  async function handleSend() {
    const content = text.trim();
    if (!content || !activeRoomId || sending) return;
    setSending(true);
    setText('');
    try {
      const msg = await messagesService.sendMessage(activeRoomId, content);
      setMessages((prev) => [...prev, msg]);
      // Optimistically update last message in rooms list
      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeRoomId ? { ...r, lastMessage: msg } : r,
        ),
      );
    } catch (err) {
      console.error('[Messages] sendMessage error:', err);
      setText(content); // restore on error
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const otherUser  = activeRoom ? getOtherParticipant(activeRoom, myId) : undefined;
  const thumb      = activeRoom ? getRoomThumb(activeRoom) : undefined;

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white">

      {/* ── Left panel — room list ── */}
      <div
        className={cn(
          'flex flex-col border-r border-gray-200 bg-white',
          'w-full lg:w-80 xl:w-96 shrink-0',
          mobileShowChat ? 'hidden lg:flex' : 'flex',
        )}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Mesajlar</h1>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="space-y-0.5 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-3 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <NoRooms />
          ) : (
            rooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                myId={myId}
                isActive={room.id === activeRoomId}
                onClick={() => selectRoom(room.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel — chat ── */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0',
          mobileShowChat ? 'flex' : 'hidden lg:flex',
        )}
      >
        {!activeRoomId ? (
          <NoChatSelected />
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
              {/* Mobile back button */}
              <button
                type="button"
                onClick={() => setMobileShowChat(false)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Listing thumbnail */}
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-4 h-4 text-gray-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {participantName(otherUser)}
                </p>
                {activeRoom?.listing?.title && (
                  <Link
                    href={`/listings/${activeRoom.listing.id}`}
                    className="text-xs text-orange-600 hover:text-orange-700 truncate block transition-colors"
                  >
                    {activeRoom.listing.title}
                  </Link>
                )}
              </div>

              {/* View listing link */}
              {activeRoom?.listing && (
                <Link
                  href={`/listings/${activeRoom.listing.id}`}
                  className="shrink-0 text-xs font-semibold text-gray-500 hover:text-orange-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors hidden sm:block"
                >
                  İlana Git
                </Link>
              )}
            </div>

            {/* Message stream */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                  <p className="text-sm text-gray-500">Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMine={msg.senderId === myId}
                    />
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Text input area */}
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mesajınızı yazın… (Enter ile gönder)"
                  rows={1}
                  className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 bg-white placeholder:text-gray-400 max-h-32 leading-relaxed"
                  style={{ scrollbarWidth: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                Shift + Enter ile yeni satır ekleyin
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Skeleton fallback ─────────────────────────────────────────────────────────

function MessagesSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-80 border-r border-gray-200 animate-pulse">
        <div className="h-16 border-b border-gray-100 px-4 flex items-center">
          <div className="h-5 w-24 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex-1 bg-gray-50" />
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesContent />
    </Suspense>
  );
}
