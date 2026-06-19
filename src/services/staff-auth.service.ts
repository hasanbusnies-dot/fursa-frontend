'use client';

import { ApiError } from './api';
import type { User } from '@/types';

// Staff auth (AP-M8 unified 3-factor flow) — accountants now log in EXACTLY like agents.
// Uses RAW fetch — it MUST NOT go through api.ts. A 401 on /staff/login is not
// /auth/-prefixed, so the api interceptor would treat it as an expired access token, try
// to refresh (no token → fails), and hard-redirect to the consumer /login. Bypassing it
// keeps a bad-credentials error a plain error. Same pattern as agent-auth.service.ts.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export interface StaffLoginPayload {
  staffLoginCode: string; // 11 digits
  phone: string;
  password: string;
}

/** Tokens + user, stored identically to a regular login (useAuthStore.setAuth). */
export interface StaffAuthed {
  kind: 'authed';
  user: User;
  token: string;
  refreshToken: string;
}

/** First login with the one-time password: no real tokens yet, only a short-lived
 *  resetToken to authorize the forced password set. */
export interface StaffMustChange {
  kind: 'mustChange';
  resetToken: string;
}

export type StaffLoginResult = StaffAuthed | StaffMustChange;

// ── Helpers ───────────────────────────────────────────────────────────────────────

/** Peel one ApiResponse {data} envelope (tolerate value at root too). */
function unwrap(json: unknown): Record<string, unknown> {
  if (json && typeof json === 'object' && 'data' in json) {
    return ((json as { data?: unknown }).data ?? {}) as Record<string, unknown>;
  }
  return (json ?? {}) as Record<string, unknown>;
}

/** Throw an ApiError carrying the server message + status (errors are generic 401). */
async function throwApiError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  throw new ApiError(body.message ?? 'Giriş bilgileri hatalı.', undefined, res.status);
}

/** Extract { user, token, refreshToken } from the normal login/first-set payload,
 *  matching auth.service.ts's extractAuth (data.user + data.tokens.access/refresh). */
function extractAuthed(data: Record<string, unknown>): StaffAuthed {
  const user = data.user as User | undefined;
  const tokens = data.tokens as { accessToken?: string; refreshToken?: string } | undefined;
  const token = tokens?.accessToken;
  const refreshToken = tokens?.refreshToken;
  if (!user || !token || !refreshToken) {
    throw new Error('Invalid server response: missing token or user.');
  }
  return { kind: 'authed', user, token, refreshToken };
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const staffAuthService = {
  /** 3-factor staff login. Returns either an authed result or a must-change-password
   *  result (first login with the one-time password). */
  login: async (payload: StaffLoginPayload): Promise<StaffLoginResult> => {
    const res = await fetch(`${BASE_URL}/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return throwApiError(res);

    const data = unwrap(await res.json().catch(() => ({})));
    if (data.mustChangePassword) {
      const resetToken = data.resetToken as string | undefined;
      if (!resetToken) throw new Error('Invalid server response: missing reset token.');
      return { kind: 'mustChange', resetToken };
    }
    return extractAuthed(data);
  },

  /** Set the first real password using the one-time resetToken as the Bearer. The
   *  resetToken is a one-off (held in component state) — never stored in useAuthStore.
   *  On success returns the full authed result (same shape as a normal login). */
  firstSetPassword: async (newPassword: string, resetToken: string): Promise<StaffAuthed> => {
    const res = await fetch(`${BASE_URL}/staff/password/first-set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resetToken}`,
      },
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) return throwApiError(res);

    return extractAuthed(unwrap(await res.json().catch(() => ({}))));
  },
};
