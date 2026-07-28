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
};
