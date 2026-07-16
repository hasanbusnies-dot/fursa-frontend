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

function unwrap<T>(res: unknown): T | undefined {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
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
};
