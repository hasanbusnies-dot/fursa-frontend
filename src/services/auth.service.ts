import { api } from './api';
import type { User } from '@/types';
import type { CompanyType, StoreStatus } from './stores.service';

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface IndividualRegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

/**
 * POST /auth/register/corporate — mirrors registerCorporateSchema exactly.
 *
 * Deliberately does NOT extend IndividualRegisterPayload: the corporate schema has no
 * firstName/lastName, and zod strips unknown keys silently, so sending them looked like
 * it worked while the person's name was thrown away. A business is identified by
 * companyName alone.
 *
 * taxNumber and taxExempt are MUTUALLY EXCLUSIVE — the backend 400s on
 * `taxExempt && taxNumber` ("A tax-exempt business must not supply a tax number"), so an
 * exempt business must omit the number entirely rather than send an empty string.
 */
export interface CorporateRegisterPayload {
  phone: string;
  email?: string;
  password: string;
  companyName: string;
  companyType: CompanyType;
  taxNumber?: string;
  taxExempt?: boolean;
}

/** One-step corporate signup also creates the owner's PENDING store — this block is the
 *  «قيد المراجعة» signal at the moment of registration. Absent on individual signup. */
export interface RegisteredStore {
  id: string;
  name: string;
  status: StoreStatus;
  pendingReview: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  store?: RegisteredStore;
}

// Exact backend envelope:
// { success, data: { tokens: { accessToken, refreshToken }, user: { id, email, profile: { firstName, lastName } } } }
type RawAuthResponse = {
  success?: boolean;
  data?: {
    tokens?: {
      accessToken?: string;
      refreshToken?: string;
    };
    user?: User;
    // Corporate registration only — the PENDING store created in the same transaction.
    store?: RegisteredStore;
  };
};

function extractAuth(raw: RawAuthResponse): AuthResponse {
  const token = raw.data?.tokens?.accessToken;
  const refreshToken = raw.data?.tokens?.refreshToken;
  const user  = raw.data?.user;

  if (!token || !refreshToken || !user) {
    throw new Error('Invalid server response: missing token or user.');
  }

  return { token, refreshToken, user, store: raw.data?.store };
}

export const authService = {
  login: async (payload: LoginPayload) => {
    const raw = await api.post<RawAuthResponse>('/auth/login', payload);
    return extractAuth(raw);
  },

  // Fetches the current user's profile from the DB — use after login to get
  // the fresh userType field (the login JWT may lag behind a manual role update).
  getProfile: async (): Promise<User> => {
    const res = await api.get<{ data: User }>('/users/me');
    return res.data;
  },

  registerIndividual: async (payload: IndividualRegisterPayload) => {
    const raw = await api.post<RawAuthResponse>('/auth/register/individual', payload);
    return extractAuth(raw);
  },

  registerCorporate: async (payload: CorporateRegisterPayload) => {
    const raw = await api.post<RawAuthResponse>('/auth/register/corporate', payload);
    return extractAuth(raw);
  },

  // ── Self-serve password reset (backend 1b30f09) ─────────────────────────────
  //
  // These three go through `api` rather than raw fetch — unlike owner-auth.service.ts,
  // which had to bypass it. The difference is the path: api.ts's `isAuthEndpoint`
  // exempts everything under `/auth/`, so a 401 here is surfaced to the caller instead
  // of triggering the refresh-then-redirect-to-login interceptor that would have
  // destroyed a logged-out page. `/owner/set-password` is not under /auth/, which is
  // exactly why that module needed its own fetch.

  /**
   * Step 1 — request a reset link. Accepts a phone OR an email.
   *
   * Resolves on every outcome the backend considers normal, because the backend answers
   * with ONE fixed 200 whether or not the account exists (non-enumeration). The caller
   * must therefore render the same confirmation regardless — never branch on this
   * result to say whether an account was found, because this result cannot know.
   *
   * Still rejects on 429 (both limiters: 20/h per IP, 5/h per identifier) and on
   * transport/5xx failures — neither of which reveals account existence, since the
   * identifier limiter counts requests for unregistered identifiers just the same.
   */
  forgotPassword: async (identifier: string): Promise<void> => {
    await api.post<{ success: boolean; message: string }>('/auth/forgot-password', { identifier });
  },

  /**
   * Step 2 — spend the emailed token and set the new password.
   * Throws ApiError(400) for invalid / expired / already-used — the backend returns all
   * three identically on purpose, so the UI must not try to tell them apart either.
   */
  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post<{ success: boolean; message: string }>('/auth/reset-password', { token, password });
  },

  /**
   * Read-only probe so the reset page can show "expired" before the user types a new
   * password twice for nothing. Never throws for a bad token — that is `{ valid: false }`,
   * not an error. A transport failure is treated as "assume valid" by the caller so a
   * blip does not hide a working form (the POST is the real gate).
   */
  checkResetToken: async (token: string): Promise<boolean> => {
    const res = await api.get<{ data?: { valid?: boolean } }>(
      `/auth/reset-password/${encodeURIComponent(token)}`,
    );
    return res.data?.valid === true;
  },
};
