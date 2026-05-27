export class ApiError extends Error {
  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>
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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

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
      clearAuthAndRedirect();
      throw new ApiError('Session expired. Please log in again.');
    }
    throw new ApiError(message, body.errors);
  }

  // 204 No Content (and any other empty response) has no body to parse.
  const contentLength = res.headers.get('content-length');
  const hasBody = res.status !== 204 && contentLength !== '0';
  if (!hasBody) return undefined as unknown as T;

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
  uploadForm: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: authHeader(getToken()), // no Content-Type — browser sets multipart boundary
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      const message = body.message ?? `HTTP ${res.status}`;
      if (isAuthError(res.status, message)) {
        clearAuthAndRedirect();
        throw new ApiError('Session expired. Please log in again.');
      }
      throw new ApiError(message, body.errors);
    }
    return res.json() as Promise<T>;
  },
};
