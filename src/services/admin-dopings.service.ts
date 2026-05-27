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

export interface DopingPackage {
  id: string;
  dopingType: string;
  label: string;
  durationInWeeks: number | null;
  basePrice: number;
  currency: string;
}

interface ActiveDopingsResponse {
  data: ActiveDoping[];
  total: number;
}

interface PackagesResponse {
  data: DopingPackage[];
}

export const adminDopingsService = {
  getActive: (params?: { dopingType?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.dopingType) qs.set('dopingType', params.dopingType);
    if (params?.status)     qs.set('status',     params.status);
    const q = qs.toString();
    return api.get<ActiveDopingsResponse>(`/admin/dopings/active${q ? `?${q}` : ''}`);
  },

  getPackages: () =>
    api.get<PackagesResponse>('/admin/dopings/packages'),

  updatePackagePrice: (id: string, basePrice: number) =>
    api.put<{ data: DopingPackage }>(`/admin/dopings/packages/${id}`, { basePrice }),
};
