import { api } from './api';
import type { PageMeta } from './stores.service';

// ── Renewals dashboard (AP-M4) ──────────────────────────────────────────────────
// Membership-renewal states across APPROVED stores: the agent endpoint covers the
// agent's own stores, the admin endpoint covers the whole platform and adds the
// registering agent per row + a page-independent summary header.

export type RenewalState = 'UPCOMING' | 'LAPSED' | 'ACTIVE' | 'NONE';

export interface RenewalAgentRef {
  id?: string;
  name?: string;
  phone?: string;
}

/** One APPROVED store's renewal row. daysRemaining is set for UPCOMING/ACTIVE,
 *  daysOverdue for LAPSED; neither for NONE (never subscribed). */
export interface RenewalRow {
  storeId: string;
  name: string;
  state: RenewalState;
  status?: string;
  paidUntil?: string | null;
  daysRemaining?: number | null;
  daysOverdue?: number | null;
  currentCampaign?: string | null;
  lastChargeAt?: string | null;
  registeredByAgent?: RenewalAgentRef | null; // admin rows only
}

export type RenewalStateFilter = 'all' | 'upcoming' | 'lapsed' | 'active' | 'none';

export interface RenewalsQuery {
  state?: RenewalStateFilter; // backend default: all
  daysAhead?: number;         // 1..90, backend default 14
  page?: number;
  limit?: number;
}

/** Page-independent platform totals (admin response only). */
export interface RenewalsSummary {
  upcoming: number;
  lapsed: number;
  active: number;
  none: number;
  total: number;
}

export interface RenewalsPage {
  data: RenewalRow[];
  meta: PageMeta;
  summary: RenewalsSummary | null; // null on the agent endpoint
}

// ── Parsing (tolerate the usual envelope variance) ─────────────────────────────────

function deriveMeta(count: number, page: number, limit: number): PageMeta {
  return {
    total: count, page, limit,
    totalPages: count < limit ? page : page + 1, // unknown total → infer "is there a next page?"
    hasNextPage: count >= limit,
    hasPrevPage: page > 1,
  };
}

/** Rows arrive in backend order (lapsed/expiring first) — never re-sort them. */
function parseRenewals(res: unknown, page: number, limit: number): RenewalsPage {
  const root = (res ?? {}) as Record<string, unknown>;
  // The payload may sit at the root or one level down under `data`.
  const env = root.data && !Array.isArray(root.data) && typeof root.data === 'object'
    ? (root.data as Record<string, unknown>)
    : root;

  const raw = Array.isArray(env.data) ? env.data
    : Array.isArray(env.items) ? env.items
    : Array.isArray(root.data) ? root.data
    : [];

  // Normalize state casing defensively; everything else passes through.
  const rows = (raw as RenewalRow[]).map((r) => ({
    ...r,
    state: String(r.state ?? 'NONE').toUpperCase() as RenewalState,
  }));

  const meta = (env.meta ?? root.meta ?? deriveMeta(rows.length, page, limit)) as PageMeta;
  const summary = (env.summary ?? root.summary ?? null) as RenewalsSummary | null;
  return { data: rows, meta, summary };
}

function buildQuery(q: RenewalsQuery): string {
  const page  = q.page  ?? 1;
  const limit = q.limit ?? 20;
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q.state && q.state !== 'all') qs.set('state', q.state);
  if (q.daysAhead != null) qs.set('daysAhead', String(q.daysAhead));
  return qs.toString();
}

// ── Services ────────────────────────────────────────────────────────────────────

export const agentRenewalsService = {
  /** The agent's own APPROVED stores by renewal state, lapsed/expiring first. */
  list: async (q: RenewalsQuery = {}): Promise<RenewalsPage> => {
    const res = await api.get<unknown>(`/agent/renewals?${buildQuery(q)}`);
    return parseRenewals(res, q.page ?? 1, q.limit ?? 20);
  },
};

export const adminRenewalsService = {
  /** ALL APPROVED stores platform-wide + registeredByAgent per row + the
   *  page-independent summary header. */
  list: async (q: RenewalsQuery = {}): Promise<RenewalsPage> => {
    const res = await api.get<unknown>(`/admin/renewals?${buildQuery(q)}`);
    return parseRenewals(res, q.page ?? 1, q.limit ?? 20);
  },
};
