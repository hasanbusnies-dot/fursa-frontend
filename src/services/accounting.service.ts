import { api } from './api';
import type { PageMeta } from './stores.service';

// ── Accounting (ACCOUNTANT / ADMIN, /api/v1/accounting) ─────────────────────────────
// All money fields are STRINGS, and the backend uses .toString() (e.g. "85.5", not
// "85.50") — always render via src/lib/money.ts (formatMoney) for consistent 2-dp.
// Never Number().

export type AccountingQuery = {
  period?: string; // YYYY-MM
  from?: string;   // YYYY-MM-DD
  to?: string;     // YYYY-MM-DD
};

export interface AccountingPeriod {
  from?: string | null;
  to?: string | null;
  label?: string | null;
}

export interface CurrencyAmount {
  currency: string;
  amount: string;
}

export interface TypedCurrencyAmount {
  type: string;
  currency: string;
  amount: string;
}

// ── Overview ────────────────────────────────────────────────────────────────────

export interface AccountingOverview {
  period: AccountingPeriod | null;
  platformLiability: CurrencyAmount[];
  revenueRecognized: { byType: TypedCurrencyAmount[]; totals: CurrencyAmount[] };
  topupMix: TypedCurrencyAmount[];
  agentOutstanding: CurrencyAmount[];
}

// ── P&L ─────────────────────────────────────────────────────────────────────────

export interface PnlRevenueByType { type: string; amount: string }
export interface PnlExpenseByCategory { categoryKey: string; label: string; amount: string }

export interface PnlCurrencyBlock {
  currency: string;
  revenue: { byType: PnlRevenueByType[]; total: string };
  expenses: { byCategory: PnlExpenseByCategory[]; total: string };
  net: string; // can be negative
}

export interface Pnl {
  period: AccountingPeriod | null;
  byCurrency: PnlCurrencyBlock[];
}

// ── Expenses ──────────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  amount: string;
  currency: string;
  categoryId: string;
  categoryKey: string;
  categoryLabel: string;
  description?: string | null;
  incurredAt: string;
  createdAt: string;
}

export interface ExpenseInput {
  amount: string;
  currency: string;
  categoryId: string;
  description?: string;
  incurredAt: string;
}

export interface ExpensesQuery extends AccountingQuery {
  categoryId?: string;
  currency?: string;
  page?: number;
  limit?: number;
}

export interface ExpensesPage {
  data: Expense[];
  meta: PageMeta;
}

export interface ExpenseCategory {
  id: string;
  key: string;
  label: string;
  isSystem: boolean;
  isActive: boolean;
}

// ── Agents / collections / settlement ───────────────────────────────────────────────

export interface VerificationBreakdown {
  verified: string;  // money-STRING (settleable portion)
  pending: string;
  rejected: string;
}

export interface AgentOutstanding {
  agentId: string;
  agentName: string;
  agentCode?: string | null; // 11-digit human-facing code (AgentProfile)
  agentPhone?: string | null;
  currency: string;
  outstanding: string;
  byVerification: VerificationBreakdown;
  oldestUnsettledAt?: string | null;
  ageDays?: number | null;
}

export type CollectionVerificationStatus =
  | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | string;

export interface AgentCollection {
  id: string;
  amount: string;
  currency: string;
  sellerName?: string | null;
  sellerPhone?: string | null;
  collectedAt: string;
  note?: string | null;
  verificationStatus: CollectionVerificationStatus;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  settlementId?: string | null;
  receiptUrl?: string | null; // signed, time-limited
}

export interface AgentCollectionsQuery {
  status?: CollectionVerificationStatus;
  settled?: boolean;        // ?settled=true|false — filter by settlement state
  settlementId?: string;    // collections belonging to a specific settlement
  currency?: string;
  page?: number;
  limit?: number;
}

/** Agent identity header (name/phone null-tolerant for unknown ids). */
export interface AgentIdentity {
  agentId: string;          // UUID — routing only, not shown to the user
  agentCode: string | null; // 11-digit human-facing code (AgentProfile)
  agentName: string | null;
  agentPhone: string | null;
}

export interface AgentCollectionsPage {
  data: AgentCollection[];
  // meta.agent: whose collections these are (returned by the backend header).
  meta: PageMeta & { agent?: AgentIdentity | null };
}

export interface Settlement {
  id: string;
  agentId?: string;
  agentCode?: string | null; // 11-digit human-facing code (AgentProfile)
  agentName?: string | null;
  agentPhone?: string | null;
  currency: string;
  amount?: string | null;
  settledAt?: string | null;
  receivedById?: string | null;
  collectionCount?: number | null;
  note?: string | null;
  // Legacy fallbacks (pre-AP-M7c).
  total?: string | null;
  collectionsCount?: number | null;
  createdAt?: string;
}

export interface SettlementsQuery extends AccountingQuery {
  agentId?: string;
  currency?: string;
  page?: number;
  limit?: number;
}

export interface SettlementsPage {
  data: Settlement[];
  meta: PageMeta;
}

/** One collection covered by a settlement (drill-down rows). */
export interface SettlementCollection {
  id: string;
  sellerId?: string | null;
  sellerName?: string | null;
  amount: string;
  currency: string;
  collectedAt: string;
  verificationStatus: CollectionVerificationStatus;
  verifiedAt?: string | null;
  receiptUrl?: string | null; // signed, time-limited
}

/** GET /settlements/:id — header + the collections it settled. */
export interface SettlementDetail {
  id: string;
  agentId: string;
  agentCode?: string | null; // 11-digit human-facing code (AgentProfile)
  agentName?: string | null;
  agentPhone?: string | null;
  amount: string;
  currency: string;
  settledAt: string;
  receivedById?: string | null;
  receivedByName?: string | null;
  receivedByPhone?: string | null;
  note?: string | null;
  collectionCount?: number | null;
  collections: SettlementCollection[];
}

export interface SettleInput {
  currency: string;
  note?: string;
  idempotencyKey: string;
}

/** Each value is a list of offending records; an empty list ⇒ that check is healthy. */
export type ReconciliationReport = Record<string, unknown[]>;

// ── Helpers ─────────────────────────────────────────────────────────────────────

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

function deriveMeta(count: number, page: number, limit: number): PageMeta {
  return {
    total: count, page, limit,
    totalPages: count < limit ? page : page + 1,
    hasNextPage: count >= limit,
    hasPrevPage: page > 1,
  };
}

function parsePage<T>(res: unknown, page: number, limit: number): { data: T[]; meta: PageMeta } {
  const r = (res ?? {}) as { data?: T[]; items?: T[]; meta?: PageMeta };
  const items = Array.isArray(r.data) ? r.data
    : Array.isArray(r.items) ? r.items
    : Array.isArray(res) ? (res as T[]) : [];
  const meta = r.meta ?? deriveMeta(items.length, page, limit);
  return { data: items, meta };
}

function unwrapList<T>(res: unknown): T[] {
  const r = (res ?? {}) as { data?: T[]; items?: T[] };
  if (Array.isArray(r.data)) return r.data;
  if (Array.isArray(r.items)) return r.items;
  if (Array.isArray(res)) return res as T[];
  return [];
}

/** period XOR from+to → querystring (empty when neither ⇒ all-time). */
function periodQs(q: AccountingQuery, extra?: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  if (q.period) qs.set('period', q.period);
  else if (q.from && q.to) { qs.set('from', q.from); qs.set('to', q.to); }
  if (extra) for (const [k, v] of Object.entries(extra)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const accountingService = {
  overview: async (q: AccountingQuery = {}): Promise<AccountingOverview> => {
    const res = await api.get<unknown>(`/accounting/overview${periodQs(q)}`);
    return unwrap<AccountingOverview>(res);
  },

  pnl: async (q: AccountingQuery = {}): Promise<Pnl> => {
    const res = await api.get<unknown>(`/accounting/pnl${periodQs(q)}`);
    return unwrap<Pnl>(res);
  },

  reconciliation: async (): Promise<ReconciliationReport> => {
    const res = await api.get<unknown>('/accounting/reconciliation');
    return unwrap<ReconciliationReport>(res) ?? {};
  },

  // Expenses
  listExpenses: async (q: ExpensesQuery = {}): Promise<ExpensesPage> => {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qs = periodQs(q, {
      categoryId: q.categoryId,
      currency: q.currency,
      page: String(page),
      limit: String(limit),
    });
    const res = await api.get<unknown>(`/accounting/expenses${qs}`);
    return parsePage<Expense>(res, page, limit);
  },

  createExpense: async (input: ExpenseInput): Promise<Expense> => {
    const res = await api.post<unknown>('/accounting/expenses', input);
    return unwrap<Expense>(res);
  },

  updateExpense: async (id: string, input: Partial<ExpenseInput>): Promise<Expense> => {
    const res = await api.patch<unknown>(`/accounting/expenses/${id}`, input);
    return unwrap<Expense>(res);
  },

  deleteExpense: async (id: string): Promise<void> => {
    await api.delete<unknown>(`/accounting/expenses/${id}`);
  },

  // Expense categories
  listCategories: async (): Promise<ExpenseCategory[]> => {
    const res = await api.get<unknown>('/accounting/expense-categories');
    return unwrapList<ExpenseCategory>(res);
  },

  createCategory: async (input: { key: string; label: string }): Promise<ExpenseCategory> => {
    const res = await api.post<unknown>('/accounting/expense-categories', input);
    return unwrap<ExpenseCategory>(res);
  },

  updateCategory: async (id: string, input: { label?: string; isActive?: boolean }): Promise<ExpenseCategory> => {
    const res = await api.patch<unknown>(`/accounting/expense-categories/${id}`, input);
    return unwrap<ExpenseCategory>(res);
  },

  /** 409 if the category is a system one or still in use. */
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete<unknown>(`/accounting/expense-categories/${id}`);
  },

  // Agents / collections
  agentsOutstanding: async (): Promise<AgentOutstanding[]> => {
    const res = await api.get<unknown>('/accounting/agents/outstanding');
    return unwrapList<AgentOutstanding>(res);
  },

  agentCollections: async (agentId: string, q: AgentCollectionsQuery = {}): Promise<AgentCollectionsPage> => {
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.status) qs.set('status', q.status);
    if (q.settled !== undefined) qs.set('settled', String(q.settled));
    if (q.settlementId) qs.set('settlementId', q.settlementId);
    if (q.currency) qs.set('currency', q.currency);
    const res = await api.get<unknown>(`/accounting/agents/${agentId}/collections?${qs.toString()}`);
    return parsePage<AgentCollection>(res, page, limit);
  },

  verifyCollection: async (id: string): Promise<AgentCollection> => {
    const res = await api.post<unknown>(`/accounting/collections/${id}/verify`, {});
    return unwrap<AgentCollection>(res);
  },

  rejectCollection: async (id: string, reason: string): Promise<AgentCollection> => {
    const res = await api.post<unknown>(`/accounting/collections/${id}/reject`, { reason });
    return unwrap<AgentCollection>(res);
  },

  // Settlement
  settleAgent: async (agentId: string, input: SettleInput): Promise<Settlement> => {
    const res = await api.post<unknown>(`/accounting/agents/${agentId}/settlements`, input);
    return unwrap<Settlement>(res);
  },

  /** Paginated settlement history (GET /settlements), filterable by agent/period/currency. */
  settlementsHistory: async (q: SettlementsQuery = {}): Promise<SettlementsPage> => {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const qs = periodQs(q, {
      agentId: q.agentId,
      currency: q.currency,
      page: String(page),
      limit: String(limit),
    });
    const res = await api.get<unknown>(`/accounting/settlements${qs}`);
    return parsePage<Settlement>(res, page, limit);
  },

  /** Settlement drill-down (GET /settlements/:id) — header + the collections it covered. */
  getSettlement: async (id: string): Promise<SettlementDetail> => {
    const res = await api.get<unknown>(`/accounting/settlements/${id}`);
    return unwrap<SettlementDetail>(res);
  },
};
