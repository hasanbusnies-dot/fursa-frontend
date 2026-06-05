import { api } from './api';

// ── Types ───────────────────────────────────────────────────────────────────────
// FIELD_AGENT staff tool. Money fields are STRINGS end-to-end (amount / balanceAfter)
// and may exceed 2^53 — never coerce to number. Format with src/lib/money.ts.

export type AgentCurrency = 'SYP' | 'USD';

/** Minimal seller card from the lookup gate (INDIVIDUAL/CORPORATE only). */
export interface SellerCard {
  userId: string;
  phone: string;
  name: string;
}

export interface TopupInput {
  sellerUserId: string;
  amount: string;            // STRING — money-as-strings
  currency: AgentCurrency;
  note?: string;
  idempotencyKey?: string;   // client-generated UUID — guards against double-credit
}

/** A single cash collection the agent recorded. */
export interface Collection {
  id: string;
  sellerName: string;
  sellerId: string;
  amount: string;            // STRING
  currency: string;
  collectedAt: string;
  settlementId: string | null; // null ⇒ unsettled (agent still holds this cash)
  note?: string | null;
}

/** Result of a top-up: the recorded collection + the seller's new wallet balance.
 *  `sellerBalanceAfter` is a money-STRING sibling of `collection` (matches the backend
 *  POST /agent/topups shape — there is no balance field inside `collection`). */
export interface TopupResult {
  collection: Collection;
  sellerBalanceAfter: string; // STRING
}

export interface CollectionsQuery {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CollectionsPage {
  data: Collection[];
  meta: PageMeta;
}

export interface OutstandingItem {
  currency: string;
  amount: string;            // STRING
}

export interface AgentSummary {
  outstanding: OutstandingItem[];
}

// ── Envelope helpers (tolerate variance: value may be at root or under `data`) ────

function unwrap<T>(res: unknown): T | undefined {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

function deriveMeta(count: number, page: number, limit: number): PageMeta {
  return {
    total: count, page, limit,
    totalPages: count < limit ? page : page + 1, // unknown total → infer "is there a next page?"
    hasNextPage: count >= limit,
    hasPrevPage: page > 1,
  };
}

// ── Service ─────────────────────────────────────────────────────────────────────
// Paths are relative to NEXT_PUBLIC_API_URL, which already ends in /api/v1 — so these
// are /agent/... NOT /api/v1/agent/.... All require an authenticated FIELD_AGENT.
// Methods propagate ApiError so callers can branch on `.status` (404 / 403 / 400).

export const agentService = {
  /** Confirmation gate: look a seller up by phone. Throws ApiError(status 404) when
   *  there is no INDIVIDUAL/CORPORATE match (staff or unknown). */
  lookupUser: async (phone: string): Promise<SellerCard> => {
    const res = await api.get<unknown>(`/agent/users/lookup?phone=${encodeURIComponent(phone)}`);
    return unwrap<SellerCard>(res) as SellerCard;
  },

  /** Record a cash collection and credit the seller's wallet (TOPUP_CASH). Propagates
   *  ApiError: 403 insufficient role, 400 crediting staff. */
  createTopup: async (input: TopupInput): Promise<TopupResult> => {
    const res = await api.post<unknown>('/agent/topups', input);
    return unwrap<TopupResult>(res) as TopupResult;
  },

  /** The agent's own collection history, newest-first. Tolerates data[] at root or
   *  under `data`, and a missing `meta` (derives hasNextPage from the page size). */
  getCollections: async (q: CollectionsQuery = {}): Promise<CollectionsPage> => {
    const page  = q.page  ?? 1;
    const limit = q.limit ?? 20;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.from) qs.set('from', q.from);
    if (q.to)   qs.set('to', q.to);

    const res = await api.get<{ data?: Collection[]; items?: Collection[]; meta?: PageMeta }>(
      `/agent/collections?${qs.toString()}`,
    );
    const items = Array.isArray(res?.data) ? res.data
      : Array.isArray(res?.items) ? res.items
      : [];
    const meta = res?.meta ?? deriveMeta(items.length, page, limit);
    return { data: items, meta };
  },

  /** The agent's outstanding (unsettled) cash per currency — what they owe the company. */
  getSummary: async (): Promise<AgentSummary> => {
    const res = await api.get<unknown>('/agent/summary');
    const s = unwrap<Partial<AgentSummary>>(res) ?? {};
    return { outstanding: Array.isArray(s.outstanding) ? s.outstanding : [] };
  },
};
