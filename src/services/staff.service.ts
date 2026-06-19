import { api } from './api';

// ── Staff creation (ADMIN-only, /api/v1/admin) ──────────────────────────────────────
// Unified staff auth (AP-M8): accountants now work EXACTLY like agents — there is no
// admin-typed password anymore. POST /admin/staff creates EITHER role and returns a
// uniform { staffCode, oneTimePassword, role, user }: the 11-digit login code + a
// server-generated one-time password (shown ONCE). The new staff member sets their own
// password on first login (/accounting/login or /agent/login → first-set).

export type StaffRole = 'ACCOUNTANT' | 'FIELD_AGENT';

export interface CreateStaffInput {
  role: StaffRole;
  firstName: string;
  lastName: string;
  phone: string;
  region?: string;           // optional free text, FIELD_AGENT-only (1–100)
}

/** POST /admin/staff response — uniform for both roles. The oneTimePassword is shown
 *  ONCE and is never retrievable again. */
export interface CreateStaffResult {
  staffCode: string;         // 11 digits — the login code
  oneTimePassword: string;   // server-generated, shown once
  role: StaffRole;
  user: { id: string; phone: string; firstName: string; lastName: string };
}

// Tolerate the value sitting at the root or under `data`.
function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

export const staffService = {
  /** Create a staff member of either role. Returns the 11-digit staffCode + a one-time
   *  password (shown once) the new member uses at their portal login before setting
   *  their own password. `region` is sent for FIELD_AGENT only. */
  createStaff: async (input: CreateStaffInput): Promise<CreateStaffResult> => {
    const body: CreateStaffInput = {
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      ...(input.role === 'FIELD_AGENT' && input.region ? { region: input.region } : {}),
    };
    const res = await api.post<unknown>('/admin/staff', body);
    return unwrap<CreateStaffResult>(res);
  },
};
