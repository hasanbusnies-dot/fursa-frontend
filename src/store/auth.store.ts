'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

function setTokenCookie(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `forsa-token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearTokenCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'forsa-token=; path=/; max-age=0; SameSite=Lax';
}

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, token, refreshToken) => {
        setTokenCookie(token);
        set({ user, token, refreshToken, isAuthenticated: true });
      },
      // Update tokens only (used by the rotating-refresh flow); leaves `user` intact.
      setTokens: (token, refreshToken) => {
        setTokenCookie(token);
        set({ token, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        // Best-effort server-side revoke of the refresh token (it stays valid for 7d
        // otherwise). Fire-and-forget with keepalive so it survives the navigation; never
        // block logout if it fails.
        const { refreshToken } = get();
        if (refreshToken && typeof fetch !== 'undefined') {
          fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            keepalive: true,
          }).catch(() => {});
        }
        clearTokenCookie();
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'forsa-auth',
      // Sync cookie for returning users whose token lives only in localStorage
      onRehydrateStorage: () => (state) => {
        if (state?.token) setTokenCookie(state.token);
      },
    }
  )
);

// ── Cross-tab token sync ───────────────────────────────────────────────────────
// When one tab refreshes (rotating) tokens, sibling tabs must adopt the newest tokens
// from localStorage — otherwise a stale tab would later present an already-rotated
// (revoked) refresh token and get logged out, and tabs would fight over the rotation.
// Lightweight guard only; full BroadcastChannel single-flight coordination is tracked
// in FOLLOWUPS.md.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'forsa-auth') return;
    try {
      const parsed = e.newValue
        ? (JSON.parse(e.newValue) as {
            state?: { token?: string | null; refreshToken?: string | null };
          })
        : null;
      const incomingToken = parsed?.state?.token ?? null;
      const incomingRefresh = parsed?.state?.refreshToken ?? null;
      const cur = useAuthStore.getState();

      // A sibling tab logged out → mirror the cleared state here (no extra revoke call).
      if (!incomingToken && cur.isAuthenticated) {
        clearTokenCookie();
        useAuthStore.setState({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        return;
      }
      // A sibling tab obtained newer tokens → adopt them (skip if unchanged; this
      // converges because re-adopting an identical token is a no-op).
      if (incomingToken && incomingToken !== cur.token) {
        cur.setTokens(incomingToken, incomingRefresh ?? cur.refreshToken ?? '');
      }
    } catch {
      /* ignore malformed storage payloads */
    }
  });
}
