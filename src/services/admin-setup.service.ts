import { api } from './api';
import type { User } from '@/types';

/**
 * Public admin-provisioning endpoints (backend `admin-setup.routes.ts`, commit 3fb7e39).
 *
 * Deliberately NOT part of the authenticated admin surface: an admin setting their first
 * password, or recovering a lost one, has no session. The emailed single-use token IS the
 * credential. All three calls therefore run unauthenticated — but they live under
 * `/admin/*`, so `realmFromPathname` still resolves them to the ADMIN realm, which is what
 * we want for the auto-login that follows a successful set-password.
 */

/** The admin row the setup endpoint returns — NOT the frontend `User` shape. */
export interface AdminSetupUser {
  id: string;
  phone: string;
  email: string | null;
  userType: string;
  status: string;
  isVerified: boolean;
  /** «firstName lastName», or null if the account has no individual profile row. */
  displayName: string | null;
}

export interface AdminSetPasswordResult {
  user: AdminSetupUser;
  accessToken: string;
  refreshToken: string;
  /**
   * The ten single-use recovery codes, format `XXXX-XXXX-XXXX`.
   *
   * ⚠ Returned exactly ONCE. They are bcrypt-hashed at rest, so the server cannot show
   * them again and neither can we. Anything that drops this array on the floor —
   * a redirect, a re-render that clears state, an unhandled throw — destroys the only
   * copy that will ever exist.
   */
  recoveryCodes: string[];
}

/** The backend's dead-token message, returned identically for invalid / expired /
 *  already-used / demoted-account so the four cannot be told apart. */
export const ADMIN_SETUP_DEAD_TOKEN_MSG = 'Invalid or expired setup link';

type RawSetPassword = {
  data?: {
    user?: AdminSetupUser;
    tokens?: { accessToken?: string; refreshToken?: string };
    recoveryCodes?: string[];
  };
};

export const adminSetupService = {
  /**
   * Read-only probe so the page can say "expired" before the admin composes a
   * 14-character password for nothing. Never throws for a bad token — that is
   * `{ valid: false }`. A transport failure is the caller's to interpret.
   */
  checkToken: async (token: string): Promise<boolean> => {
    const res = await api.get<{ data?: { valid?: boolean } }>(
      `/admin/set-password/${encodeURIComponent(token)}`,
    );
    return res.data?.valid === true;
  },

  /**
   * Claim the setup token: sets the password, verifies the account, revokes every
   * refresh token, mints the recovery codes and logs the admin in.
   *
   * NOTE the field name: the backend schema is `newPassword`, not `password`.
   */
  setPassword: async (token: string, newPassword: string): Promise<AdminSetPasswordResult> => {
    const res = await api.post<RawSetPassword>('/admin/set-password', { token, newPassword });

    const user = res.data?.user;
    const accessToken = res.data?.tokens?.accessToken;
    const refreshToken = res.data?.tokens?.refreshToken;
    const recoveryCodes = res.data?.recoveryCodes;

    if (!user || !accessToken || !refreshToken || !Array.isArray(recoveryCodes)) {
      throw new Error('Invalid server response: missing session or recovery codes.');
    }
    return { user, accessToken, refreshToken, recoveryCodes };
  },

  /**
   * Break-glass: redeem one recovery code to have a FRESH setup link mailed to the
   * address already on file.
   *
   * Resolves on every outcome the server considers non-exceptional — it answers one fixed
   * 200 whether the address is unknown, the code is wrong, or the link was just sent, so
   * that probing it reveals nothing. The caller must render the same message regardless
   * and must not infer success from resolution.
   */
  requestRecovery: async (email: string, code: string): Promise<void> => {
    await api.post('/admin/recovery', { email, code });
  },
};

/** Map the setup endpoint's admin row onto the frontend `User` the auth store holds. */
export function adminSetupUserToUser(a: AdminSetupUser): User {
  const [firstName = '', ...rest] = (a.displayName ?? '').trim().split(' ');
  return {
    id: a.id,
    email: a.email ?? '',
    phone: a.phone,
    userType: 'ADMIN',
    profile: { firstName, lastName: rest.join(' ') },
  };
}
