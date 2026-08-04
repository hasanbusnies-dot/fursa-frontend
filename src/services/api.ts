import { refreshAccessToken, RefreshError } from './token-refresh';
import { AUTH_STORAGE_KEYS, authStoreFor, realmFromPathname, type AuthRealm } from '@/store/auth.store';
import { requiresAuth } from '@/lib/auth-routes';
import {
  ACCOUNT_BLOCKED_PATH,
  isAccountBlockCode,
  stashAccountBlock,
  type AccountBlockCode,
} from '@/lib/account-block';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>,
    // HTTP status of the failed response. Optional + last so existing call sites stay
    // valid; lets callers branch exactly (e.g. status === 503) instead of matching
    // on the message string.
    public readonly status?: number,
    // Machine-readable discriminator from the backend (errorMiddleware emits it only for
    // errors that set one) — e.g. ACCOUNT_SUSPENDED vs a plain expired-token 401.
    public readonly code?: string,
    // User-facing explanation that accompanies `code`; currently the moderating admin's
    // status_reason. Null means "no reason recorded"; undefined means "not sent".
    public readonly reason?: string | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Shape of the JSON body the backend's errorMiddleware returns.
interface ErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
  reason?: string | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// RequestInit + the auth realm this request runs as. Default: the realm owning the
// current pathname (portal pages get their portal's session with zero threading — even
// through shared services). Pin realm: 'user' on cross-cutting components that must stay
// on the consumer session while a staff portal is on screen (SocketManager's
// notification calls, lib/push).
export interface ApiOptions extends RequestInit {
  realm?: AuthRealm;
}

function currentRealm(override?: AuthRealm): AuthRealm {
  if (override) return override;
  if (typeof window === 'undefined') return 'user';
  return realmFromPathname(window.location.pathname);
}

function sanitize(token: string | null | undefined): string | null {
  if (!token || token === 'undefined' || token === 'null') return null;
  return token.replace(/^"|"$/g, '').trim() || null;
}

function getToken(realm: AuthRealm): string | null {
  if (typeof window === 'undefined') return null;

  // User realm primary: the cookie set in setAuth — no nested parsing needed.
  // Staff realms have no cookie by design (localStorage only).
  if (realm === 'user') {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)forsa-token=([^;]+)/);
    if (cookieMatch?.[1]) return sanitize(decodeURIComponent(cookieMatch[1]));
  }

  // Zustand's persisted entry for this realm
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS[realm]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return sanitize(parsed.state?.token);
  } catch {
    return null;
  }
}

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const LOGIN_PATHS: Record<AuthRealm, string> = {
  user: '/login',
  admin: '/admin/login',
  agent: '/agent/login',
  accounting: '/accounting/login',
};

// Wipes THIS realm's local auth state WITHOUT navigating. Split out of
// clearAuthAndRedirect so the account-blocked path can end the session and then send the
// user somewhere other than the login portal.
//
// Resets the IN-MEMORY store too, not just persisted storage. That used to be
// redundant — every caller hard-navigated immediately after, and the reload rebuilt
// the store from (now empty) storage. It stopped being redundant once a dead session
// on a PUBLIC page began clearing without navigating: the store would still say
// `isAuthenticated`, so the header would keep rendering the user as logged in and the
// root layout's pollers would re-fire every 10s, 401, and burn a refresh each time.
// Setting state directly rather than calling logout() deliberately skips the
// POST /auth/logout revoke — the refresh token is already dead, that is why we are here.
function clearLocalAuth(realm: AuthRealm): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS[realm]);
    if (realm === 'user') localStorage.removeItem('forsa-token');
  } catch { /* private-browsing environments may throw */ }
  // Expire the session cookie (user realm only — staff realms have none)
  if (realm === 'user') document.cookie = 'forsa-token=; path=/; max-age=0; SameSite=Lax';
  authStoreFor(realm).setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
  });
}

// Ends THIS realm's session, and navigates to its login portal ONLY from a route that
// actually needs one. Called on a definitive session death: /auth/refresh rejected the
// refresh token, or a just-refreshed access token was rejected again.
//
// The route check is the fix for "opening the app lands on /login". `isAuthenticated`
// outlives the refresh token in localStorage, so a returning visitor opens the app with
// a dead-but-live-looking session; SocketManager (root layout, EVERY page) immediately
// calls /notifications/unread-count, which 401s, and the refresh 401s definitively. This
// function then ran on the HOMEPAGE and threw the visitor onto the login screen. Browsing
// a classifieds site is public — a dead session on a public page just means "you are
// logged out now", so clear it and let them carry on. Only /account, /messages and the
// listing create/edit routes are worth interrupting for (see lib/auth-routes.ts).
//
// Safe to call from SSR context — the guard prevents browser-only APIs from running.
function clearAuthAndRedirect(realm: AuthRealm): void {
  if (typeof window === 'undefined') return;
  clearLocalAuth(realm);

  const path = window.location.pathname;
  // Public route: the session is gone, the UI flips to logged-out, browsing continues.
  if (!requiresAuth(path, realm)) return;
  // Never hard-navigate to the page we're already on: a stray call that dies with this
  // realm ON the realm's login page would otherwise reload → refire → reload, forever
  // (the /admin/login loop from the Header's unread poll). Clearing state is enough.
  if (path !== LOGIN_PATHS[realm]) {
    window.location.href = LOGIN_PATHS[realm];
  }
}

// A blocked ACCOUNT (suspended / banned / soft-deleted) killed this request. Ends the
// local session and sends the user to the Arabic explanation screen carrying the admin's
// reason — instead of the old behaviour, which bounced them to /login with no reason at
// all, or surfaced the backend's English string.
//
// Deliberately does NOT run for /auth/* : a blocked LOGIN is rendered inline by the login
// form (redirecting away from a page the user just submitted would lose the context), and
// redirecting on /auth/refresh would fight the caller that is about to handle it.
function handleAccountBlock(realm: AuthRealm, code: AccountBlockCode, reason: string | null): void {
  if (typeof window === 'undefined') return;
  stashAccountBlock({ code, reason });
  clearLocalAuth(realm);
  if (window.location.pathname !== ACCOUNT_BLOCKED_PATH) {
    window.location.href = ACCOUNT_BLOCKED_PATH;
  }
}

// Auth endpoints (login / register / refresh) must never trigger a refresh-retry:
// a 401 there is a real credential / refresh-token failure, not access-token expiry.
function isAuthEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/auth/');
}

async function request<T>(
  endpoint: string,
  options: ApiOptions = {},
  retried = false,
  tokenOverride?: string,
): Promise<T> {
  const { realm: realmOverride, ...init } = options;
  const realm = currentRealm(realmOverride);
  const token = tokenOverride ?? getToken(realm);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      ...authHeader(token), // last — always wins, can never be accidentally overridden
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as ErrorBody;
    const message = body.message ?? `HTTP ${res.status}`;

    // ── Account blocked ───────────────────────────────────────────────────────────
    // Checked BEFORE the 401 refresh-retry below, and on any status, because the backend
    // reports the same block with different statuses: 403 from /auth/login and
    // /auth/refresh, 401 from the per-request requireAuth gate (the mid-session freeze).
    // Falling through to the 401 branch would burn a refresh that is guaranteed to fail,
    // and the user would end up at /login having been told nothing.
    if (isAccountBlockCode(body.code)) {
      const reason = body.reason ?? null;
      // /auth/* is left to its caller: the login form renders this inline, and the refresh
      // path has its own handling.
      if (!isAuthEndpoint(endpoint)) handleAccountBlock(realm, body.code, reason);
      throw new ApiError(message, body.errors, res.status, body.code, reason);
    }

    // Status 401 ONLY — never message text. An endpoint returning auth failures as a
    // non-401 is a backend bug to fix there, not to pattern-match here.
    if (res.status === 401) {
      // Auth endpoints: surface the server message ("Invalid credentials") — never
      // refresh, never redirect.
      if (isAuthEndpoint(endpoint)) {
        throw new ApiError(message, body.errors, res.status);
      }
      // Access token expired: refresh once (single-flight) and retry with the new token.
      if (!retried) {
        let newToken: string;
        try {
          newToken = await refreshAccessToken(token ?? undefined, realm);
        } catch (err) {
          if (err instanceof RefreshError && !err.definitive) {
            // Transient refresh failure (network/429/5xx): the session is NOT known dead.
            // Fail only THIS request; the next action retries naturally.
            throw new ApiError(message, body.errors, res.status);
          }
          // The original request 401'd on ordinary expiry, but the refresh revealed the
          // account is blocked — route to the explanation, not to a bare login page.
          if (err instanceof RefreshError && err.blockCode) {
            handleAccountBlock(realm, err.blockCode, err.blockReason ?? null);
            throw new ApiError(err.message, undefined, 403, err.blockCode, err.blockReason ?? null);
          }
          clearAuthAndRedirect(realm);
          throw new ApiError('Session expired. Please log in again.', undefined, 401);
        }
        return request<T>(endpoint, options, true, newToken);
      }
      // A freshly-refreshed token was rejected again → account-level rejection.
      clearAuthAndRedirect(realm);
      throw new ApiError('Session expired. Please log in again.', undefined, 401);
    }
    // Non-block codes (e.g. CANNOT_MODERATE_ADMIN) ride along too, so callers can branch
    // on `code` instead of matching message text.
    throw new ApiError(message, body.errors, res.status, body.code, body.reason);
  }

  // 204 No Content (and any other empty response) has no body to parse.
  const contentLength = res.headers.get('content-length');
  const hasBody = res.status !== 204 && contentLength !== '0';
  if (!hasBody) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// Multipart upload with the same refresh-once-retry behavior as request().
async function uploadFormRequest<T>(
  endpoint: string,
  formData: FormData,
  retried = false,
  tokenOverride?: string,
): Promise<T> {
  const realm = currentRealm();
  const token = tokenOverride ?? getToken(realm);
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: authHeader(token), // no Content-Type — browser sets multipart boundary
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    const message = body.message ?? `HTTP ${res.status}`;
    if (res.status === 401) {
      if (isAuthEndpoint(endpoint)) {
        throw new ApiError(message, body.errors, res.status);
      }
      if (!retried) {
        let newToken: string;
        try {
          newToken = await refreshAccessToken(token ?? undefined, realm);
        } catch (err) {
          if (err instanceof RefreshError && !err.definitive) {
            throw new ApiError(message, body.errors, res.status);
          }
          clearAuthAndRedirect(realm);
          throw new ApiError('Session expired. Please log in again.', undefined, 401);
        }
        return uploadFormRequest<T>(endpoint, formData, true, newToken);
      }
      clearAuthAndRedirect(realm);
      throw new ApiError('Session expired. Please log in again.', undefined, 401);
    }
    throw new ApiError(message, body.errors, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, options),
  post: <T>(endpoint: string, body: unknown, options?: ApiOptions) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: <T>(endpoint: string, body: unknown, options?: ApiOptions) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: <T>(endpoint: string, body: unknown, options?: ApiOptions) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),

  // Multipart upload — browser sets Content-Type + boundary automatically for FormData
  uploadForm: <T>(endpoint: string, formData: FormData): Promise<T> =>
    uploadFormRequest<T>(endpoint, formData),
};
