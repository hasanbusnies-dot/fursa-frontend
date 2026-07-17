'use client';

import { useAuthStore } from '@/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// ── Refresh failure classification ──────────────────────────────────────────────
// Only a DEFINITIVE rejection may end the session: /auth/refresh itself answering 401
// (token revoked/expired) or 403 (account banned/suspended — assertAccountActive).
// Everything else — network failure, 429, 5xx, malformed body — says nothing about the
// refresh token, so callers must treat it as transient and NOT log out.
export class RefreshError extends Error {
  constructor(
    readonly definitive: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'RefreshError';
  }
}

// Single-flight refresh: while one refresh is in flight, every other caller awaits the
// SAME promise. This is MANDATORY (not just an optimization) because the backend ROTATES
// refresh tokens — two parallel /auth/refresh calls with the same token would make the
// second present an already-revoked token and force a spurious logout. The shared promise
// is reused by REST (api.ts) and the socket (socket.ts) so they never race the rotation.
let refreshPromise: Promise<string> | null = null;

// Transient failures retry behind the single-flight (jittered backoff) before surfacing;
// callers just see one slower promise. Definitive rejections surface immediately.
const RETRY_DELAYS_MS = [1000, 3000, 9000];

/**
 * @param failedToken the access token the caller was just rejected with. If the store
 * already holds a DIFFERENT token, another caller (or another tab, via the storage
 * listener) refreshed in the meantime — reuse that token instead of burning a second
 * rotation. This is what keeps a cold app entry at ONE rotation (REST and socket both
 * 401 with the same stale token; whoever loses the single-flight reuses the winner's).
 */
export function refreshAccessToken(failedToken?: string): Promise<string> {
  const current = useAuthStore.getState().token;
  if (current && failedToken && current !== failedToken) return Promise.resolve(current);
  if (!refreshPromise) {
    refreshPromise = refreshWithCrossTabLock(current).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ── Cross-tab single-flight (FOLLOWUPS §3) ─────────────────────────────────────
// The in-memory promise above only serializes callers within ONE tab. Two tabs hitting
// 401 at the same moment would still race the rotation — so the network refresh runs
// under a browser-wide Web Lock: one tab rotates, the others wait and then ADOPT its
// result instead of presenting the now-revoked token. Browsers without Web Locks
// (pre-2022) fall back to in-tab single-flight only — §2/§3 plus the backend's rotation
// grace still cover them.
async function refreshWithCrossTabLock(staleToken: string | null): Promise<string> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return await navigator.locks.request('forsa-refresh', () =>
      refreshUnlessDoneElsewhere(staleToken),
    );
  }
  return refreshUnlessDoneElsewhere(staleToken);
}

async function refreshUnlessDoneElsewhere(staleToken: string | null): Promise<string> {
  // While we waited on the lock another tab may have rotated. The storage EVENT can lag
  // behind the write, so read the persisted entry directly for the freshest tokens.
  const persisted = readPersistedTokens();
  if (persisted?.token && persisted.refreshToken && persisted.token !== staleToken) {
    useAuthStore.getState().setTokens(persisted.token, persisted.refreshToken);
    return persisted.token;
  }
  return doRefreshWithRetry();
}

function readPersistedTokens(): { token: string | null; refreshToken: string | null } | null {
  try {
    const raw = localStorage.getItem('forsa-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { token?: string | null; refreshToken?: string | null };
    };
    return { token: parsed.state?.token ?? null, refreshToken: parsed.state?.refreshToken ?? null };
  } catch {
    return null;
  }
}

async function doRefreshWithRetry(): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await doRefresh();
    } catch (err) {
      const delay = RETRY_DELAYS_MS[attempt];
      if ((err instanceof RefreshError && err.definitive) || delay === undefined) throw err;
      console.error(`[auth] transient refresh failure (attempt ${attempt + 1}), retrying:`, err);
      await new Promise((r) => setTimeout(r, delay + Math.random() * 500));
    }
  }
}

async function doRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new RefreshError(true, 'No refresh token available');

  // Raw fetch — must NOT go through the api.ts 401-retry interceptor (would recurse).
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new RefreshError(false, 'Network failure during refresh');
  }

  if (res.status === 401) throw new RefreshError(true, 'Refresh token rejected');
  if (res.status === 403) throw new RefreshError(true, 'Account banned or suspended');
  if (!res.ok) throw new RefreshError(false, `Refresh failed: HTTP ${res.status}`);

  const json = (await res.json().catch(() => null)) as
    | { data?: { accessToken?: string; refreshToken?: string } }
    | null;
  const accessToken = json?.data?.accessToken;
  const newRefresh = json?.data?.refreshToken;
  if (!accessToken || !newRefresh) {
    // Our contract bug, not a dead session — surface loudly, never log out over it.
    console.error('[auth] malformed /auth/refresh response:', json);
    throw new RefreshError(false, 'Malformed refresh response');
  }

  // Persist BOTH — the backend rotated the refresh token, so the new one MUST replace the
  // old or the next refresh will fail with "Invalid or expired refresh token".
  useAuthStore.getState().setTokens(accessToken, newRefresh);
  return accessToken;
}
