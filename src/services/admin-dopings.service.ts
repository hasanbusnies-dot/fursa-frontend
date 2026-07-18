import { api } from './api';

export interface ActiveDoping {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerName: string;
  sellerEmail: string;
  dopingType: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  homepageShowcaseUntil?: Date | string | null;
  categoryShowcaseUntil?: Date | string | null;
  urgentShowcaseUntil?: Date | string | null;
  topOfSearchUntil?: Date | string | null;
  isUrgent?: boolean;
  hasHighlightFrame?: boolean;
}

// Live backend shape (post pricing-migration): pricing is NOT on the package — it lives
// in per-(package, currency) rows. Money is a STRING on the wire out of here (wallet
// contract); the admin GET serializes Prisma Decimals as numbers, so normalize on read.
export interface DopingPackagePriceRow {
  currency: string;      // 'SYP' | 'USD'
  pricePerWeek: string;  // money-STRING — never coerce to number
  isActive: boolean;
}

export interface DopingPackage {
  id: string;
  type: string; // DopingType | 'REFRESH'
  name: string;
  isActive: boolean;
  prices: DopingPackagePriceRow[];
}

interface ActiveDopingsResponse {
  data: ActiveDoping[];
  total: number;
}

interface PackagesResponse {
  data: (Omit<DopingPackage, 'prices'> & {
    prices?: (Omit<DopingPackagePriceRow, 'pricePerWeek'> & { pricePerWeek: string | number })[];
  })[];
}

export const adminDopingsService = {
  getActive: (params?: { dopingType?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.dopingType) qs.set('dopingType', params.dopingType);
    if (params?.status)     qs.set('status',     params.status);
    const q = qs.toString();
    return api.get<ActiveDopingsResponse>(`/admin/dopings/active${q ? `?${q}` : ''}`);
  },

  getPackages: async (): Promise<DopingPackage[]> => {
    const res = await api.get<PackagesResponse>('/admin/dopings/packages');
    const list = Array.isArray(res.data) ? res.data : [];
    return list.map((p) => ({
      ...p,
      prices: (p.prices ?? []).map((r) => ({ ...r, pricePerWeek: String(r.pricePerWeek) })),
    }));
  },

  /** Upsert ONE currency's weekly price. pricePerWeek must be a plain decimal string
   *  (backend validates ^\d+(\.\d{1,2})?$ and > 0) — never a number. */
  setPackagePrice: (id: string, currency: 'SYP' | 'USD', pricePerWeek: string) =>
    api.put<{ data: DopingPackagePriceRow }>(
      `/admin/dopings/packages/${id}/prices/${currency}`,
      { pricePerWeek },
    ),
};
