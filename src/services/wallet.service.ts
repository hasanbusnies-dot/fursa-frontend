import { api } from './api';

// ── Types ───────────────────────────────────────────────────────────────────────
// Money fields are STRINGS end-to-end (balance / amount / balanceAfter). They may
// exceed 2^53 — never coerce to number. Format with src/lib/money.ts.

export type WalletCurrency = 'SYP' | 'USD';
export type WalletStatus   = 'ACTIVE' | 'FROZEN';
export type TxDirection    = 'CREDIT' | 'DEBIT';
export type WalletTxType =
  | 'TOPUP_CASH' | 'TOPUP_ONLINE' | 'SPEND_PROMOTION'
  | 'REFUND' | 'ADJUSTMENT' | 'AGENT_REVERSAL';

export interface WalletBalance {
  currency: string;
  balance: string; // STRING
}

export interface Wallet {
  status: WalletStatus;
  balances: WalletBalance[];
}

export interface WalletTransaction {
  id: string;
  currency: string;
  type: string;            // WalletTxType, but tolerate unknown future values
  direction: TxDirection;
  amount: string;          // STRING
  balanceAfter: string;    // STRING
  relatedListingId?: string | null;
  relatedDopingType?: string | null;
  paymentRef?: string | null;
  agentId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TransactionsPage {
  data: WalletTransaction[];
  meta: PageMeta;
}

export interface TransactionsQuery {
  page?: number;
  limit?: number;
  currency?: WalletCurrency;
  type?: WalletTxType;
}

export interface OnlineTopupResult {
  clientData: Record<string, unknown>;
}

// ── Envelope helpers (tolerate variance: data may be the value or {data: value}) ──

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

export const walletService = {
  /** The authed user's own wallet. Never 404s — an unfunded user has no balances yet. */
  getWallet: async (): Promise<Wallet> => {
    const res = await api.get<unknown>('/wallet');
    const w = unwrap<Partial<Wallet>>(res) ?? {};
    return {
      status:   w.status === 'FROZEN' ? 'FROZEN' : 'ACTIVE',
      balances: Array.isArray(w.balances) ? w.balances : [],
    };
  },

  /** Paginated ledger, newest-first. Tolerates data[] at root or under `data`, and a
   *  missing `meta` (derives hasNextPage from the page size). */
  getTransactions: async (q: TransactionsQuery = {}): Promise<TransactionsPage> => {
    const page  = q.page  ?? 1;
    const limit = q.limit ?? 20;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.currency) qs.set('currency', q.currency);
    if (q.type)     qs.set('type', q.type);

    const res = await api.get<{ data?: WalletTransaction[]; items?: WalletTransaction[]; meta?: PageMeta }>(
      `/wallet/transactions?${qs.toString()}`,
    );
    const items = Array.isArray(res?.data) ? res.data
      : Array.isArray(res?.items) ? res.items
      : [];
    const meta = res?.meta ?? deriveMeta(items.length, page, limit);
    return { data: items, meta };
  },

  /** Start an online top-up. Returns the provider's opaque clientData for the frontend
   *  to act on. Propagates ApiError (notably status === 503 when not configured) — the
   *  caller decides how to present it. */
  createOnlineTopup: async (input: { amount: string; currency: WalletCurrency }): Promise<OnlineTopupResult> => {
    const res = await api.post<unknown>('/payments/topup/online', input);
    const data = unwrap<{ clientData?: Record<string, unknown> }>(res) ?? {};
    return { clientData: data.clientData ?? {} };
  },
};
