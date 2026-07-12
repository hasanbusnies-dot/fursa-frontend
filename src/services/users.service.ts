import { api } from './api';

// ── GET /users/me shape (full profile records, unlike the login response) ──────

export interface MeIndividualProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  dateOfBirth?: string | null; // ISO datetime
  bio?: string | null;
}

export interface MeCorporateProfile {
  id: string;
  companyName: string;
  companyType?: string;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  governorate?: string | null;
  isVerified?: boolean;
}

export interface MeUser {
  id: string;
  phone: string;
  email: string | null;
  userType: 'INDIVIDUAL' | 'CORPORATE' | 'ADMIN' | 'FIELD_AGENT' | 'ACCOUNTANT';
  status: string;
  isVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  individualProfile?: MeIndividualProfile | null;
  corporateProfile?: MeCorporateProfile | null;
}

// ── PATCH payloads (mirror backend zod schemas — omit fields, never send '') ───

export interface UpdateIndividualPayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  gender?: 'MALE' | 'FEMALE';
  dateOfBirth?: string; // full ISO 8601 datetime
}

export interface UpdateCorporatePayload {
  companyName?: string;
  website?: string;
  description?: string;
  address?: string;
  city?: string;
  governorate?: string;
}

export const usersService = {
  getMe: async (): Promise<MeUser> => {
    const res = await api.get<{ data: MeUser }>('/users/me');
    return res.data;
  },

  updateIndividual: async (payload: UpdateIndividualPayload): Promise<MeIndividualProfile> => {
    const res = await api.patch<{ data: MeIndividualProfile }>('/users/me/individual', payload);
    return res.data;
  },

  updateCorporate: async (payload: UpdateCorporatePayload): Promise<MeCorporateProfile> => {
    const res = await api.patch<{ data: MeCorporateProfile }>('/users/me/corporate', payload);
    return res.data;
  },

  // 204 No Content on success; 400 "Current password is incorrect" on bad current.
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.patch<void>('/users/me/password', { currentPassword, newPassword });
  },
};
