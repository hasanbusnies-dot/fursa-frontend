'use client';

import { useAuthStore } from '@/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// Single-flight refresh: while one refresh is in flight, every other caller awaits the
// SAME promise. This is MANDATORY (not just an optimization) because the backend ROTATES
// refresh tokens — two parallel /auth/refresh calls with the same token would make the
// second present an already-revoked token and force a spurious logout. The shared promise
// is reused by REST (api.ts) and the future socket so they never race the rotation.
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('No refresh token available');

  // Raw fetch — must NOT go through the api.ts 401-retry interceptor (would recurse).
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('Refresh failed');

  const json = (await res.json().catch(() => null)) as
    | { data?: { accessToken?: string; refreshToken?: string } }
    | null;
  const accessToken = json?.data?.accessToken;
  const newRefresh = json?.data?.refreshToken;
  if (!accessToken || !newRefresh) throw new Error('Malformed refresh response');

  // Persist BOTH — the backend rotated the refresh token, so the new one MUST replace the
  // old or the next refresh will fail with "Invalid or expired refresh token".
  useAuthStore.getState().setTokens(accessToken, newRefresh);
  return accessToken;
}
