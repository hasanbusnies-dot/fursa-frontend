import { api } from './api';

// ── Commission reporting (AP-M5, admin-only) ───────────────────────────────────────
// Commission is computed ON READ against the CURRENT config — the report echoes the
// `config` it used, so the UI must always surface it (the same period can produce
// different numbers after a config change). All money fields are 2-decimal STRINGS;
// never parse them through Number() — render via src/lib/money.ts.

export interface CommissionConfig {
  thresholdPaymentsPerPeriod: number; // int — min qualifying payments to earn commission
  amountPerPaymentUsd: string;        // money-STRING, USD per commissionable payment
}

export interface CommissionPeriod {
  from: string;
  to: string;
  label: string;
}

export interface CommissionAgentRow {
  agentId: string;
  agentName: string;
  qualifyingPayments: number;
  threshold: number;
  commissionablePayments: number;
  amountPerPayment: string; // money-STRING
  commissionUsd: string;    // money-STRING (0.00 when below threshold)
}

export interface CommissionsSummary {
  totalAgents: number;
  totalQualifyingPayments: number;
  totalCommissionUsd: string; // money-STRING
}

export interface CommissionsReport {
  config: CommissionConfig;
  period: CommissionPeriod;
  agents: CommissionAgentRow[];
  summary: CommissionsSummary;
}

/** Exactly one of `period` (YYYY-MM) OR `from`+`to` (YYYY-MM-DD) — enforced by callers. */
export interface CommissionsQuery {
  period?: string;
  from?: string;
  to?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Peel one ApiResponse {data} envelope (tolerate the value at root too). */
function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const adminCommissionsService = {
  /** Commission report for a period. Agents arrive sorted by commission desc —
   *  never re-sort. The returned `config` is what these numbers were computed with. */
  report: async (q: CommissionsQuery): Promise<CommissionsReport> => {
    const qs = new URLSearchParams();
    if (q.period) qs.set('period', q.period);
    else if (q.from && q.to) { qs.set('from', q.from); qs.set('to', q.to); }
    const res = await api.get<unknown>(`/admin/commissions?${qs.toString()}`);
    return unwrap<CommissionsReport>(res);
  },

  /** The current commission config (drives every report computed from now on). */
  getConfig: async (): Promise<CommissionConfig> => {
    const res = await api.get<unknown>('/admin/commission-config');
    return unwrap<CommissionConfig>(res);
  },

  /** Update both config fields. Propagates ApiError on validation failure. */
  updateConfig: async (input: CommissionConfig): Promise<CommissionConfig> => {
    const res = await api.put<unknown>('/admin/commission-config', input);
    return unwrap<CommissionConfig>(res);
  },
};
