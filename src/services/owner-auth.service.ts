'use client';

import { ApiError } from './api';
import type { User } from '@/types';

// Owner-onboarding set-password (AP-M2.1) uses RAW fetch — it MUST NOT go through
// api.ts. The page is PUBLIC: the visitor arrives logged-out from an email link, with
// the single-use token as their only credential. A 400 here can carry an
// "invalid or expired" message, which api.ts's interceptor would mistake for an
// expired ACCESS token → try to refresh (no token → fail) → hard-redirect to /login,
// destroying the page. Bypassing it keeps a bad/expired-token error a plain ApiError.
// Same pattern as agent-auth.service.ts / token-refresh.ts (each defines its BASE_URL).
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/** Tokens + user, stored identically to a regular login (useAuthStore.setAuth).
 *  The backend auto-logs-in the owner on a successful password set. */
export interface OwnerAuthed {
  user: User;
  token: string;
  refreshToken: string;
}

/** Peel one ApiResponse {data} envelope (tolerate value at root too). */
function unwrap(json: unknown): Record<string, unknown> {
  if (json && typeof json === 'object' && 'data' in json) {
    return ((json as { data?: unknown }).data ?? {}) as Record<string, unknown>;
  }
  return (json ?? {}) as Record<string, unknown>;
}

/** Extract { user, token, refreshToken } from the auth payload — matches
 *  auth.service.ts's extractAuth (data.user + data.tokens.access/refresh). */
function extractAuthed(data: Record<string, unknown>): OwnerAuthed {
  const user = data.user as User | undefined;
  const tokens = data.tokens as { accessToken?: string; refreshToken?: string } | undefined;
  const token = tokens?.accessToken;
  const refreshToken = tokens?.refreshToken;
  if (!user || !token || !refreshToken) {
    throw new Error('Invalid server response: missing token or user.');
  }
  return { user, token, refreshToken };
}

export const ownerAuthService = {
  /** Set the owner's first password using the single-use link token. On success the
   *  backend auto-logs-in and returns real tokens + user. Propagates ApiError(400) for
   *  an invalid / expired / already-used token. */
  setPassword: async (token: string, newPassword: string): Promise<OwnerAuthed> => {
    const res = await fetch(`${BASE_URL}/owner/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new ApiError(
        body.message ?? 'تعذّر تعيين كلمة المرور.',
        undefined,
        res.status,
      );
    }
    return extractAuthed(unwrap(await res.json().catch(() => ({}))));
  },
};
