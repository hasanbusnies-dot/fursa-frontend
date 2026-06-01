'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';

// Headless component mounted once in the root layout. Owns the single shared socket's
// lifecycle: connect when authenticated, disconnect on logout.
export function SocketManager() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) connectSocket();
    else disconnectSocket();
  }, [isAuthenticated]);

  return null;
}
