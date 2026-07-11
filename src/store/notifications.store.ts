'use client';

import { create } from 'zustand';

// Unread-badge state shared by the header bell, the mobile drawer row and the
// SocketManager listener. NOT persisted — the count is refetched on auth/mount and
// kept live by socket events, so a stale persisted value would only flicker.
interface NotificationsStore {
  unreadCount: number;
  setUnread: (n: number) => void;
  /** +1 on a live socket notification. */
  bump: () => void;
  /** -1 on a single mark-read (floors at 0). */
  decrement: () => void;
  /** Zero the badge (mark-all-read / logout). */
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsStore>()((set) => ({
  unreadCount: 0,
  setUnread: (n) => set({ unreadCount: Math.max(0, n) }),
  bump: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  decrement: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  clear: () => set({ unreadCount: 0 }),
}));
