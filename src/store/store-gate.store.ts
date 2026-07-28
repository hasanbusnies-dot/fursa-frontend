'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { ownerStoreService, type StoreStatus } from '@/services/stores.service';
import { ApiError } from '@/services/api';
import { useAuthStore } from './auth.store';

/**
 * THE store-approval gate — the single source of truth for "may this account use the
 * seller surfaces yet".
 *
 * A business IS its store: `Store.status` is the only approval flag. `User.status` is
 * deliberately NOT it (a self-service signup lands ACTIVE + isVerified immediately) and
 * `CorporateProfile.isVerified` is an inert display field. Read the status from
 * GET /owner/store, which the backend leaves UN-gated precisely so a pending owner can
 * render their own «قيد المراجعة» screen.
 *
 * WHO IS GATED: CORPORATE users only — mirroring the server's own rule in
 * store-access.ts. INDIVIDUAL sellers and every staff role resolve to approved
 * synchronously and never hit the network.
 *
 * The frontend lock is UX, not security: POST /listings and the wallet / dopings /
 * transfers routers 403 a pending business regardless. This exists so the user gets an
 * explanation instead of a dead button.
 */

export interface StoreGate {
  /** The check is in flight (or hasn't run yet) for a user who needs one. */
  loading: boolean;
  /** This account is subject to the gate at all (i.e. CORPORATE). */
  gated: boolean;
  /** Cleared to use the seller surfaces. Always true for individuals + staff. */
  approved: boolean;
  /** gated && resolved && !approved — the only flag a UI should branch on to lock. */
  locked: boolean;
  /** The owner's store status; null when they own no store (or not resolved yet). */
  storeStatus: StoreStatus | null;
  rejectionReason: string | null;
  /** True when the account is CORPORATE but owns no store at all (legacy/malformed). */
  noStore: boolean;
}

interface GateStore {
  userId: string | null;
  resolved: boolean;
  loading: boolean;
  storeStatus: StoreStatus | null;
  rejectionReason: string | null;
  noStore: boolean;
  /** Single-flight: many components mount at once and must share one request. */
  inFlight: Promise<void> | null;
  ensure: (userId: string) => void;
  refresh: () => Promise<void>;
  reset: () => void;
}

const EMPTY = {
  resolved: false,
  loading: false,
  storeStatus: null,
  rejectionReason: null,
  noStore: false,
  inFlight: null,
};

export const useStoreGateStore = create<GateStore>((set, get) => ({
  userId: null,
  ...EMPTY,

  ensure: (userId) => {
    const s = get();
    // A different user (login/logout/switch) invalidates everything cached.
    if (s.userId !== userId) {
      set({ userId, ...EMPTY });
      void get().refresh();
      return;
    }
    if (s.resolved || s.inFlight) return;
    void get().refresh();
  },

  refresh: async () => {
    const existing = get().inFlight;
    if (existing) return existing;

    const p = (async () => {
      set({ loading: true });
      try {
        const store = await ownerStoreService.getStore();
        set({
          resolved: true,
          storeStatus: store.status ?? null,
          rejectionReason: store.rejectionReason ?? null,
          noStore: false,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // CORPORATE with no store: one-step signup always creates one, so this is a
          // legacy/malformed account. The server denies it too — stay locked.
          set({ resolved: true, storeStatus: null, rejectionReason: null, noStore: true });
        } else {
          // Network/5xx: do NOT resolve. An unreachable API must not silently lock a
          // legitimately approved business out of its own account; leave it unresolved
          // so the UI keeps its neutral state and the next mount retries.
          set({ resolved: false });
        }
      } finally {
        set({ loading: false, inFlight: null });
      }
    })();

    set({ inFlight: p });
    return p;
  },

  reset: () => set({ userId: null, ...EMPTY }),
}));

/**
 * Read the gate. Safe to call from any client component, however many times — the
 * underlying request is single-flighted and cached per user for the session.
 *
 * While a corporate user's check is in flight, `loading` is true and `locked` is false:
 * surfaces should render a neutral/disabled state rather than flashing an accusatory
 * «قيد المراجعة» at an approved business.
 */
export function useStoreGate(): StoreGate & { refresh: () => Promise<void> } {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { resolved, loading, storeStatus, rejectionReason, noStore, ensure, refresh } =
    useStoreGateStore();

  const gated = isAuthenticated && user?.userType === 'CORPORATE';
  const userId = user?.id ?? null;

  useEffect(() => {
    if (gated && userId) ensure(userId);
  }, [gated, userId, ensure]);

  if (!gated) {
    return {
      loading: false,
      gated: false,
      approved: true,
      locked: false,
      storeStatus: null,
      rejectionReason: null,
      noStore: false,
      refresh,
    };
  }

  const approved = resolved && storeStatus === 'APPROVED';
  return {
    loading: !resolved || loading,
    gated: true,
    approved,
    locked: resolved && !approved,
    storeStatus,
    rejectionReason,
    noStore,
    refresh,
  };
}
