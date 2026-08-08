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

// ── Notification preferences (settings Phase 3) ────────────────────────────────
// Fixed matrix keyed by preference GROUP (LISTING_STATUS covers approved+rejected).
// email channel deliberately absent from the API until a transport exists.

export type NotificationPrefKey = 'NEW_MESSAGE' | 'PRICE_DROP' | 'LISTING_CTA' | 'LISTING_STATUS';

export interface NotificationPrefEntry {
  inApp: boolean;
  push: boolean;
  inAppLocked?: true; // backend states locked cells (moderation paper trail) — render, don't hardcode
}

export type NotificationPrefMatrix = Record<NotificationPrefKey, NotificationPrefEntry>;

// Partial patch; the backend rejects inApp on LISTING_STATUS (locked) and
// push:true while inApp is off (contradiction) with 400.
export type NotificationPrefsPatch = Partial<
  Record<NotificationPrefKey, { inApp?: boolean; push?: boolean }>
>;

// ── Logged-in devices (active refresh-token sessions) ──────────────────────────

export interface UserSession {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  current: boolean; // matched against the x-refresh-token header we send
}

// ── Account deletion (Play Store requirement) ──────────────────────────────────
// GET  /users/me/deletion-preview → what the user is about to lose, as FACTS
// DELETE /users/me { password, reason? } → tombstone + revoke every token
//
// The preview's `warnings` are CODES, never prose — the Arabic lives in
// lib/account-deletion.ts, same split as AccountBlockCode. Money arrives as
// decimal STRINGS (see lib/money.ts): never parse it through Number().

export interface DeletionWalletBalance {
  currency: string;
  balance: string;   // decimal string — format with formatMoney, don't Number() it
  positive: boolean; // the backend's own verdict; don't re-derive from the string
}

export interface DeletionStore {
  name: string;
  status: string;
  membership?: { status: string; paidUntil?: string | null } | null;
}

export interface DeletionPreview {
  wallet?: { status: string; balances: DeletionWalletBalance[] } | null;
  stores?: DeletionStore[];
  activeListings?: number;
  pendingTopups?: number;
  /** Codes only — see ACCOUNT_DELETION_WARNING_COPY. Unknown codes are ignored. */
  warnings?: string[];
  /** The phone freed for re-registration; shown on the farewell screen. */
  reRegistrationPhone?: string | null;
}

export type DeletionReason = 'NO_LONGER_NEEDED' | 'PRIVACY' | 'OTHER';

export interface DeletionResult {
  deletedAt: string;
  freedPhone?: string | null;
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

  getNotificationPrefs: async (): Promise<NotificationPrefMatrix> => {
    const res = await api.get<{ data: NotificationPrefMatrix }>('/users/me/notification-preferences');
    return res.data;
  },

  // Returns the FULL resolved matrix — always replace local state with it (the
  // backend may normalize, e.g. collapse push when inApp turns off).
  patchNotificationPrefs: async (patch: NotificationPrefsPatch): Promise<NotificationPrefMatrix> => {
    const res = await api.patch<{ data: NotificationPrefMatrix }>('/users/me/notification-preferences', patch);
    return res.data;
  },

  // Revokes every refresh token, including this device's — caller must log out locally after.
  logoutAllDevices: async (): Promise<void> => {
    await api.post<unknown>('/auth/logout-all', {});
  },

  getDeletionPreview: async (): Promise<DeletionPreview> => {
    const res = await api.get<{ data: DeletionPreview }>('/users/me/deletion-preview');
    return res.data ?? {};
  },

  /**
   * Deletes the account. The backend re-authenticates with `password`, tombstones the
   * user and revokes every token — so THIS session is dead the moment it returns, and
   * the caller must log out locally rather than making another request.
   *
   * Errors the caller must distinguish: 400 wrong password (generic by design — it
   * must not confirm which half was wrong), 403 staff/admin, 409 already deleted,
   * 429 rate-limited.
   */
  deleteAccount: async (password: string, reason?: DeletionReason): Promise<DeletionResult> => {
    // `api.delete` takes RequestInit, so the body is stringified here — the wrapper
    // only does that for post/put/patch. Content-Type: application/json is added by
    // `request` for every call, so the DELETE body parses server-side.
    const res = await api.delete<{ data: DeletionResult }>('/users/me', {
      body: JSON.stringify({ password, ...(reason ? { reason } : {}) }),
    });
    return res?.data ?? { deletedAt: new Date().toISOString() };
  },
};
