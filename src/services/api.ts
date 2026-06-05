import { refreshAccessToken } from './token-refresh';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>,
    // HTTP status of the failed response. Optional + last so existing call sites stay
    // valid; lets callers branch exactly (e.g. status === 503) instead of matching
    // on the message string.
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

function sanitize(token: string | null | undefined): string | null {
  if (!token || token === 'undefined' || token === 'null') return null;
  return token.replace(/^"|"$/g, '').trim() || null;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Primary: read from the cookie we explicitly set in setAuth — no nested parsing needed
  const cookieMatch = document.cookie.match(/(?:^|;\s*)forsa-token=([^;]+)/);
  if (cookieMatch?.[1]) return sanitize(decodeURIComponent(cookieMatch[1]));

  // Fallback: parse from Zustand's persisted localStorage entry
  try {
    const raw = localStorage.getItem('forsa-auth');
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

// Wipes all local auth state and hard-navigates to /login.
// Called whenever the server returns 401 (expired / invalid token).
// Safe to call from SSR context — the guard prevents browser-only APIs from running.
function clearAuthAndRedirect(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('forsa-auth');
    localStorage.removeItem('forsa-token');
  } catch { /* private-browsing environments may throw */ }
  // Expire the session cookie
  document.cookie = 'forsa-token=; path=/; max-age=0; SameSite=Lax';
  window.location.href = '/login';
}

// Checks a parsed error body for known "expired token" messages even when the
// server incorrectly returns a non-401 status code.
function isAuthError(status: number, message: string): boolean {
  if (status === 401) return true;
  const m = message.toLowerCase();
  return (
    m.includes('invalid or expired') ||
    m.includes('access token') ||
    m.includes('unauthorized') ||
    m.includes('jwt expired')
  );
}

// Auth endpoints (login / register / refresh) must never trigger a refresh-retry:
// a 401 there is a real credential / refresh-token failure, not access-token expiry.
function isAuthEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/auth/');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retried = false,
  tokenOverride?: string,
): Promise<T> {
  const token = tokenOverride ?? getToken();

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...authHeader(token), // last — always wins, can never be accidentally overridden
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    const message = body.message ?? `HTTP ${res.status}`;
    if (isAuthError(res.status, message)) {
      // Auth endpoints: surface the server message ("Invalid credentials") — never
      // refresh, never redirect.
      if (isAuthEndpoint(endpoint)) {
        throw new ApiError(message, body.errors, res.status);
      }
      // Access token expired: refresh once (single-flight) and retry with the new token.
      if (!retried) {
        let newToken: string;
        try {
          newToken = await refreshAccessToken();
        } catch {
          clearAuthAndRedirect();
          throw new ApiError('Session expired. Please log in again.');
        }
        return request<T>(endpoint, options, true, newToken);
      }
      // Already retried with a fresh token and still 401 → give up.
      clearAuthAndRedirect();
      throw new ApiError('Session expired. Please log in again.');
    }
    throw new ApiError(message, body.errors, res.status);
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
  const token = tokenOverride ?? getToken();
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
    if (isAuthError(res.status, message)) {
      if (isAuthEndpoint(endpoint)) {
        throw new ApiError(message, body.errors, res.status);
      }
      if (!retried) {
        let newToken: string;
        try {
          newToken = await refreshAccessToken();
        } catch {
          clearAuthAndRedirect();
          throw new ApiError('Session expired. Please log in again.');
        }
        return uploadFormRequest<T>(endpoint, formData, true, newToken);
      }
      clearAuthAndRedirect();
      throw new ApiError('Session expired. Please log in again.');
    }
    throw new ApiError(message, body.errors, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, options),
  post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),

  // Multipart upload — browser sets Content-Type + boundary automatically for FormData
  uploadForm: <T>(endpoint: string, formData: FormData): Promise<T> =>
    uploadFormRequest<T>(endpoint, formData),
};
