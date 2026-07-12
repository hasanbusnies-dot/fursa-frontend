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
  avatarUrl?: string;
}

export interface UpdateCorporatePayload {
  companyName?: string;
  website?: string;
  description?: string;
  address?: string;
  city?: string;
  governorate?: string;
  logoUrl?: string;
}

// ── Logged-in devices (active refresh-token sessions) ──────────────────────────

export interface UserSession {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  current: boolean; // matched against the x-refresh-token header we send
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

  // Single profile photo → public URL (same POST /upload the listing wizard uses).
  uploadProfileImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('images', file);
    const res = await api.uploadForm<{ data: { urls: string[] } }>('/upload', formData);
    const url = res.data?.urls?.[0];
    if (!url) throw new Error('Upload returned no URL');
    return url;
  },

  // Pass the caller's own refresh token so the backend can flag «هذا الجهاز»;
  // raw tokens are never returned by the endpoint.
  getSessions: async (currentRefreshToken?: string | null): Promise<UserSession[]> => {
    const res = await api.get<{ data: UserSession[] }>('/users/me/sessions', {
      headers: currentRefreshToken ? { 'x-refresh-token': currentRefreshToken } : undefined,
    });
    return res.data ?? [];
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await api.delete<void>(`/users/me/sessions/${sessionId}`);
  },

  // Revokes every refresh token, including this device's — caller must log out locally after.
  logoutAllDevices: async (): Promise<void> => {
    await api.post<unknown>('/auth/logout-all', {});
  },
};
