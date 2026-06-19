import { api } from './api';

// ── Staff creation (ADMIN-only, /api/v1/admin) ──────────────────────────────────────
// Two DIFFERENT backend endpoints behind one "Personel Oluştur" screen:
//
//   ACCOUNTANT → POST /admin/staff  — admin sets the password; response does NOT echo it
//                (the UI re-shows the typed password from the form).
//   FIELD_AGENT → POST /admin/agents — password is SERVER-GENERATED and returned ONCE as
//                `oneTimePassword`, alongside the 11-digit `agentCode`. There is no other
//                way to retrieve it.
//
// CRITICAL: agents must go through /admin/agents. Creating an agent via /admin/staff with
// role=FIELD_AGENT produces no agentCode, so the agent can never log in.

export interface CreateAccountantInput {
  phone: string;
  password: string;          // ≥8 chars, ≥1 uppercase, ≥1 digit (enforced client + server)
  firstName: string;
  lastName: string;
}

/** POST /admin/staff response (ACCOUNTANT). No password / no agentCode echoed. */
export interface CreateAccountantResult {
  id: string;
  phone: string;
  userType: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
  individualProfile?: { firstName?: string; lastName?: string } | null;
}

export interface CreateAgentInput {
  phone: string;
  firstName: string;
  lastName: string;
  region?: string;           // optional free text, 1–100
}

/** POST /admin/agents response (FIELD_AGENT). The oneTimePassword is shown ONCE. */
export interface CreateAgentResult {
  agentCode: string;         // 11 digits
  oneTimePassword: string;   // shown once — never retrievable again
  user: { id: string; phone: string; firstName: string; lastName: string };
}

// Tolerate the value sitting at the root or under `data`.
function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

export const staffService = {
  /** Create an ACCOUNTANT. Admin chooses the password; it is NOT returned, so the UI
   *  echoes the typed value for the new accountant's first login at /accounting/login. */
  createAccountant: async (input: CreateAccountantInput): Promise<CreateAccountantResult> => {
    const res = await api.post<unknown>('/admin/staff', { ...input, role: 'ACCOUNTANT' });
    return unwrap<CreateAccountantResult>(res);
  },

  /** Create a FIELD_AGENT. Returns the 11-digit agentCode + a one-time password (shown
   *  once) the agent uses at /agent/login before setting their own password. */
  createAgent: async (input: CreateAgentInput): Promise<CreateAgentResult> => {
    const body: CreateAgentInput = {
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
      ...(input.region ? { region: input.region } : {}),
    };
    const res = await api.post<unknown>('/admin/agents', body);
    return unwrap<CreateAgentResult>(res);
  },
};
