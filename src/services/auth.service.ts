import { api } from './api';
import type { User } from '@/types';

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

export interface CorporateRegisterPayload extends IndividualRegisterPayload {
  companyName: string;
  taxNumber: string;
}

export interface AuthResponse {
  token: string;
  user: User;
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
  };
};

function extractAuth(raw: RawAuthResponse): AuthResponse {
  const token = raw.data?.tokens?.accessToken;
  const user  = raw.data?.user;

  if (!token || !user) {
    throw new Error('Invalid server response: missing token or user.');
  }

  return { token, user };
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
