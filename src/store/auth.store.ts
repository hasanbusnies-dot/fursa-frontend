'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

// ── Auth realms ────────────────────────────────────────────────────────────────
// One isolated session per login portal. Before realms, all four portals shared ONE
// persisted store ('forsa-auth'): logging into /admin replaced the consumer session
// browser-wide (the cross-tab listener pushed admin tokens into every open tab), and
// admin logout killed every tab — the wallet-incident clobbering. Each realm now has its
// own storage key, its own cross-tab mirror, and its own refresh single-flight
// (token-refresh.ts). Realms never read each other's state.
export type AuthRealm = 'user' | 'admin' | 'agent' | 'accounting';

// 'forsa-auth' is grandfathered for the user realm so existing consumer sessions survive
// this change. Staff keys are new — staff re-login once when this lands, by design.
export const AUTH_STORAGE_KEYS: Record<AuthRealm, string> = {
  user: 'forsa-auth',
  admin: 'forsa-admin-auth',
  agent: 'forsa-agent-auth',
  accounting: 'forsa-accounting-auth',
};

/** Portal routes own their realm; everything else is the consumer ('user') realm.
 *  The URL namespace IS the portal boundary, so pathname is the ground truth here. */
export function realmFromPathname(pathname: string): AuthRealm {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  if (pathname === '/agent' || pathname.startsWith('/agent/')) return 'agent';
  if (pathname === '/accounting' || pathname.startsWith('/accounting/')) return 'accounting';
  return 'user';
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// The forsa-token cookie belongs to the USER realm only (api.ts getToken's primary
// source + the proxy guard). Staff realms are localStorage-only — nothing server-side
// reads a staff cookie.
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

function makeAuthStore(realm: AuthRealm) {
  const isUser = realm === 'user';
  const syncCookie = (token: string) => {
    if (isUser) setTokenCookie(token);
  };

  const store = create<AuthStore>()(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        setAuth: (user, token, refreshToken) => {
          syncCookie(token);
          set({ user, token, refreshToken, isAuthenticated: true });
        },
        // Update tokens only (used by the rotating-refresh flow); leaves `user` intact.
        setTokens: (token, refreshToken) => {
          syncCookie(token);
          set({ token, refreshToken, isAuthenticated: true });
        },
        logout: () => {
          // Best-effort server-side revoke of the refresh token (it stays valid for 7d
          // otherwise). Fire-and-forget with keepalive so it survives the navigation;
          // never block logout if it fails.
          const { refreshToken } = get();
          if (refreshToken && typeof fetch !== 'undefined') {
            fetch(`${API_BASE}/auth/logout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
              keepalive: true,
            }).catch(() => {});
          }
          if (isUser) clearTokenCookie();
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        },
      }),
      {
        name: AUTH_STORAGE_KEYS[realm],
        // Sync cookie for returning users whose token lives only in localStorage
        onRehydrateStorage: () => (state) => {
          if (isUser && state?.token) setTokenCookie(state.token);
        },
      },
    ),
  );

  // ── Cross-tab token sync (same-realm ONLY) ───────────────────────────────────
  // When one tab refreshes (rotating) tokens, sibling tabs must adopt the newest tokens
  // from localStorage — otherwise a stale tab would later present an already-rotated
  // (revoked) refresh token. Keyed to THIS realm's storage entry: an admin login/logout
  // in another tab must never touch a consumer session (the clobbering incident).
  // Cross-tab refresh RACES are handled by the Web Lock in token-refresh.ts.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== AUTH_STORAGE_KEYS[realm]) return;
      try {
        const parsed = e.newValue
          ? (JSON.parse(e.newValue) as {
              state?: { token?: string | null; refreshToken?: string | null };
            })
          : null;
        const incomingToken = parsed?.state?.token ?? null;
        const incomingRefresh = parsed?.state?.refreshToken ?? null;
        const cur = store.getState();

        // A sibling tab logged out → mirror the cleared state here (no extra revoke call).
        if (!incomingToken && cur.isAuthenticated) {
          if (isUser) clearTokenCookie();
          store.setState({
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

  return store;
}

// The consumer store keeps its historical name — the overwhelming majority of the app
// is user-realm and imports this unchanged.
export const useAuthStore = makeAuthStore('user');
export const useAdminAuthStore = makeAuthStore('admin');
export const useAgentAuthStore = makeAuthStore('agent');
export const useAccountingAuthStore = makeAuthStore('accounting');

export function authStoreFor(realm: AuthRealm) {
  switch (realm) {
    case 'admin':
      return useAdminAuthStore;
    case 'agent':
      return useAgentAuthStore;
    case 'accounting':
      return useAccountingAuthStore;
    default:
      return useAuthStore;
  }
}
