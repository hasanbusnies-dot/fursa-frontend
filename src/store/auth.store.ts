'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        setTokenCookie(token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        clearTokenCookie();
        set({ user: null, token: null, isAuthenticated: false });
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
