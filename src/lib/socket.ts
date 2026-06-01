'use client';

import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { refreshAccessToken } from '@/services/token-refresh';

// socket.io attaches at the server ROOT — strip the /api/v1 (or any /api/...) suffix from
// the REST base. A dedicated NEXT_PUBLIC_SOCKET_URL (bare origin) takes precedence.
const SOCKET_ORIGIN =
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/api(\/.*)?$/, '');

// Exact auth-failure strings emitted by the backend socket middleware (socket.server.ts).
const AUTH_ERRORS = new Set(['Authentication required', 'Invalid or expired token']);

let socket: Socket | null = null;
let authRetrying = false; // prevents stacked refreshes on repeated auth connect_errors

export function getSocket(): Socket | null {
  return socket;
}

// Idempotent: returns the existing singleton (reconnecting it if dropped), or creates one.
export function connectSocket(): Socket {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  authRetrying = false;
  socket = io(SOCKET_ORIGIN, {
    auth: { token: useAuthStore.getState().token ?? undefined },
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    authRetrying = false;
  });
  socket.on('connect_error', handleConnectError);

  return socket;
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  authRetrying = false;
}

// On an AUTH connect_error, refresh the access token via the SHARED single-flight
// (token-refresh.ts) — never a second refresh path — then reconnect with the new token.
// Transient/network connect_errors are left to socket.io's own reconnection. authRetrying
// is cleared only on a successful 'connect', so a still-rejected fresh token cannot loop.
async function handleConnectError(err: Error): Promise<void> {
  if (!AUTH_ERRORS.has(err?.message)) return; // network/transient → socket.io auto-retries
  if (authRetrying) return;
  authRetrying = true;
  try {
    const newToken = await refreshAccessToken();
    if (socket) {
      socket.auth = { token: newToken };
      socket.connect();
    }
  } catch {
    authRetrying = false;
    useAuthStore.getState().logout(); // mirror REST: refresh failed → end the session
  }
}
