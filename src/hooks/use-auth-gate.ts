'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

/**
 * THE auth gate for consumer pages that are useless without a session.
 *
 * ── The bug this exists to prevent (it has now shipped TWICE) ──
 * The auth store persists to localStorage, so `isAuthenticated` is false during the
 * server render and on the first client render, and only becomes true once zustand
 * rehydrates. A page that redirects on that FIRST false throws a logged-IN user to
 * /login on every hard refresh (F5). Client-side navigation hides it completely: by
 * then the store is already live in memory, so the guard only ever sees `true`.
 *
 * The session is NOT destroyed when this misfires — nothing calls logout(), the token
 * and the forsa-token cookie both survive. The user is merely dumped on a login form
 * while still logged in, which is indistinguishable from being logged out to them.
 *
 * The remedy every working account page already used was a hand-rolled `mounted` flag
 * copy-pasted per page. Twelve pages had it; five did not (favorites, wallet,
 * notifications, dopings, favorite-sellers) and all five broke on refresh. It was
 * fixed once before on saved-searches (65aa2a0) and recurred, because a per-page
 * pattern is only as good as the next author remembering it. Hence one hook.
 *
 * WAITING is the whole point: `ready` stays false while hydration is unresolved, so
 * callers must treat it as "not decided yet" (render a skeleton or null) and never as
 * "logged out". Nothing here is an access-control boundary — the backend API is.
 *
 * @param redirectTo path to return to after login; omit for a bare /login.
 * @returns `true` only once hydration has settled AND a session exists.
 */
export function useAuthGate(redirectTo?: string): boolean {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Flips one tick after the client takes over. Deliberately NOT read from the store:
  // this tracks "React has hydrated on the client", which is the thing the server
  // render cannot know, and it matches the proven per-page pattern it replaces.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;           // undecided — never redirect on this
    if (isAuthenticated) return;
    router.replace(
      redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login',
    );
  }, [hydrated, isAuthenticated, router, redirectTo]);

  return hydrated && isAuthenticated;
}
