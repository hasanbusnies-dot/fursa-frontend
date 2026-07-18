import { api } from './api';

export type DopingType =
  | 'HOMEPAGE'
  | 'CATEGORY'
  | 'TOP_OF_SEARCH'
  | 'DETAILED_SEARCH'
  | 'URGENT'
  | 'HIGHLIGHT';

export type DopingCurrency = 'SYP' | 'USD';

// Money is a STRING end-to-end (wallet contract) — never coerce to number.
export interface DopingPackagePrice {
  currency: string;
  pricePerWeek: string;
}

export interface DopingPackageInfo {
  type: string; // DopingType | 'REFRESH'
  name: string;
  prices: DopingPackagePrice[];
}

// ── My-dopings visibility (GET /dopings/mine) ──────────────────────────────────

export interface ActiveDopingEntry {
  type: string; // DopingType — tolerate unknown future values
  expiresAt: string;
}

/** One row per listing, dopings sorted soonest-first by the backend (as is the row
 *  order via soonestExpiry). Render as delivered — never re-sort client-side. */
export interface MyActiveDopingRow {
  listing: { id: string; title: string; imageUrl: string | null; status: string };
  dopings: ActiveDopingEntry[];
  soonestExpiry: string;
}

/** A purchase RECEIPT: the moment of purchase + what it cost. The coverage window is
 *  NOT stored backend-side — never present these as "active from/until". */
export interface DopingReceipt {
  id: string; // wallet-ledger row id
  listingId: string;
  listingTitle: string | null; // null → the listing was deleted since
  type: string;                // DopingType | 'REFRESH'
  amount: string;              // money = STRING (wallet contract)
  currency: string;
  purchasedAt: string;
}

export interface MyDopingsMeta {
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function unwrap<T>(res: unknown): T | undefined {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
}

/** Meta may be absent — infer "is there a next page?" from the page size (wallet pattern). */
function pageMeta(count: number, page: number, limit: number, meta?: Partial<MyDopingsMeta>): MyDopingsMeta {
  return {
    page: meta?.page ?? page,
    hasNextPage: meta?.hasNextPage ?? count >= limit,
    hasPrevPage: meta?.hasPrevPage ?? page > 1,
  };
}

export const dopingsService = {
  /** Active packages with their REAL per-currency prices — drives the purchase modal. */
  getPackages: async (): Promise<DopingPackageInfo[]> => {
    const res = await api.get<unknown>('/dopings/packages');
    const list = unwrap<DopingPackageInfo[]>(res);
    return Array.isArray(list) ? list : [];
  },

  apply: (input: {
    listingId: string;
    dopingType: DopingType;
    durationInWeeks: number;
    currency: DopingCurrency;
    idempotencyKey: string;
  }) => api.post('/dopings/apply', input),

  refreshDate: (input: {
    listingId: string;
    currency: DopingCurrency;
    idempotencyKey: string;
  }) => api.post('/dopings/refresh-date', input),

  /** Active dopings grouped by listing, soonest-expiry first. */
  getMyActive: async (page = 1, limit = 10): Promise<{ rows: MyActiveDopingRow[]; meta: MyDopingsMeta }> => {
    const res = await api.get<{ data?: MyActiveDopingRow[]; meta?: Partial<MyDopingsMeta> }>(
      `/dopings/mine?view=active&page=${page}&limit=${limit}`,
    );
    const rows = Array.isArray(res?.data) ? res.data : [];
    return { rows, meta: pageMeta(rows.length, page, limit, res?.meta) };
  },

  /** Purchase-receipt ledger, newest first. */
  getMyHistory: async (page = 1, limit = 20): Promise<{ rows: DopingReceipt[]; meta: MyDopingsMeta }> => {
    const res = await api.get<{ data?: DopingReceipt[]; meta?: Partial<MyDopingsMeta> }>(
      `/dopings/mine?view=history&page=${page}&limit=${limit}`,
    );
    const rows = Array.isArray(res?.data) ? res.data : [];
    return { rows, meta: pageMeta(rows.length, page, limit, res?.meta) };
  },
};
