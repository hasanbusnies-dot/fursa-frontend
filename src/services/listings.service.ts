import { api } from './api';
import type { ApiResponse, Listing, ListingImage } from '@/types';

export type { ListingImage };

export interface CreateListingPayload {
  categoryId:   string;
  title:        string;
  description:  string;
  price:        number;
  currency:     'SYP' | 'USD';
  city:         string;
  country?:     string;
  district?:    string;
  neighborhood?:string;
  condition?:   'NEW' | 'USED';
  make?:        string;
  series?:      string;
  model?:       string;
  chassis?:     string;
  year?:        number;
  mileage?:     number;
  seats?:       number;
  color?:       string;
  heavyDamage?: boolean;
  plateNumber?: string;
  damageReport?: Record<string, { status: string; detail?: string }>;
  technicalSpecs?: string[];
  attributes?:  Record<string, string>;
  images?:      ListingImage[];
  phoneNumber?:     string;
  showPhoneNumber?: boolean;
  acceptsOffers?:   boolean;
  vehicleDetails?: {
    // Core identity fields (backend may store these inside vehicleDetails)
    make?:           string;
    series?:         string;
    model?:          string;
    year?:           number;
    mileage?:        number;
    seats?:          number;
    color?:          string;
    condition?:      string;
    heavyDamage?:    boolean;
    // Detailed specs
    fuelType?:       string;
    transmission?:   string;
    bodyType?:       string;
    enginePower?:    number;
    engineCapacity?: number;
    drivetrain?:     string;
    gearCount?:      number;
    warranty?:       boolean;
    tradeIn?:        boolean;
    fromWho?:        string;
    // Complex nested fields (backend may store these inside vehicleDetails)
    damageReport?:   Record<string, { status: string; detail?: string }>;
    technicalSpecs?: string[];
  };
}

export interface ListingCreatedResponse {
  id: string;
  title: string;
  slug: string;
}

export interface GetListingsParams {
  limit?: number;
  page?: number;
  query?: string;
  isFeatured?: boolean;
  categoryId?: string;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  minYear?: number;
  maxYear?: number;
  minMileage?: number;
  maxMileage?: number;
  minRange?: number;
  maxRange?: number;
  fuelType?: string;
  transmission?: string;
  condition?: string;
  bodyType?: string;
  drivetrain?: string;
  color?: string;
  warranty?: boolean;
  heavyDamage?: boolean;
  tradeIn?: boolean;
  fromWho?: string;
  make?: string;
  model?: string;
  status?: string;
  sort?: string;
  sellerId?: string;
}

export interface ListingsResult {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

// Backend may return listings directly in data[], or nested under data.listings.
// Pagination may be at the top level OR inside a nested `meta` object.
type ListingsMeta = { page?: number; totalPages?: number; total?: number };
type ListingsEnvelope =
  | Listing[]
  | { listings: Listing[]; total?: number; page?: number; totalPages?: number; meta?: ListingsMeta };

function extractResult(
  data: { listings: Listing[]; total?: number; page?: number; totalPages?: number; meta?: ListingsMeta },
  fallbackPage: number,
): ListingsResult {
  // Pagination may live at the root or inside a `meta` sub-object
  const m = data.meta;
  return {
    listings:   data.listings,
    total:      m?.total      ?? data.total      ?? data.listings.length,
    page:       m?.page       ?? data.page       ?? fallbackPage,
    totalPages: m?.totalPages ?? data.totalPages ?? 1,
  };
}

export const listingsService = {
  getListings: async (params?: GetListingsParams): Promise<ListingsResult> => {
    const qs = new URLSearchParams();
    if (params?.limit)       qs.set('limit',       String(params.limit));
    if (params?.page)        qs.set('page',         String(params.page));
    if (params?.query)       qs.set('query',        params.query);
    if (params?.isFeatured)  qs.set('isFeatured',   'true');
    if (params?.categoryId)  qs.set('categoryId',   params.categoryId);
    if (params?.city)        qs.set('city',         params.city);
    if (params?.district)    qs.set('district',     params.district);
    if (params?.minPrice)    qs.set('minPrice',     String(params.minPrice));
    if (params?.maxPrice)    qs.set('maxPrice',     String(params.maxPrice));
    if (params?.currency)    qs.set('currency',     params.currency);
    if (params?.minYear)     qs.set('minYear',      String(params.minYear));
    if (params?.maxYear)     qs.set('maxYear',      String(params.maxYear));
    if (params?.minMileage)  qs.set('minMileage',   String(params.minMileage));
    if (params?.maxMileage)  qs.set('maxMileage',   String(params.maxMileage));
    if (params?.minRange)    qs.set('minRange',     String(params.minRange));
    if (params?.maxRange)    qs.set('maxRange',     String(params.maxRange));
    if (params?.fuelType)    qs.set('fuelType',     params.fuelType);
    if (params?.transmission) qs.set('transmission', params.transmission);
    if (params?.condition)   qs.set('condition',    params.condition);
    if (params?.bodyType)    qs.set('bodyType',     params.bodyType);
    if (params?.drivetrain)  qs.set('drivetrain',   params.drivetrain);
    if (params?.color)       qs.set('color',        params.color);
    if (params?.warranty   != null) qs.set('warranty',    String(params.warranty));
    if (params?.heavyDamage != null) qs.set('heavyDamage', String(params.heavyDamage));
    if (params?.tradeIn    != null) qs.set('tradeIn',     String(params.tradeIn));
    if (params?.fromWho)     qs.set('fromWho',      params.fromWho);
    if (params?.make)        qs.set('make',         params.make);
    if (params?.model)       qs.set('model',        params.model);
    if (params?.status)      qs.set('status',       params.status);
    if (params?.sort)        qs.set('sort',         params.sort);
    if (params?.sellerId)    qs.set('sellerId',     params.sellerId);
    const query = qs.toString() ? `?${qs}` : '';

    const raw = await api.get<ApiResponse<ListingsEnvelope>>(`/listings${query}`);
    console.log('[listingsService] GET /listings raw response:', raw);

    const data = raw.data;

    if (Array.isArray(data)) {
      return { listings: data, total: data.length, page: params?.page ?? 1, totalPages: 1 };
    }
    if (data && 'listings' in data && Array.isArray(data.listings)) {
      return extractResult(data, params?.page ?? 1);
    }
    return { listings: [], total: 0, page: 1, totalPages: 0 };
  },

  getListingById: async (id: string): Promise<Listing> => {
    const res = await api.get<ApiResponse<Listing>>(`/listings/${id}`);
    console.log('[listingsService] GET /listings/:id raw response:', res);
    return res.data;
  },

  create: async (payload: CreateListingPayload) => {
    const res = await api.post<ApiResponse<ListingCreatedResponse>>('/listings', payload);
    return res.data;
  },

  getPendingListings: async (): Promise<Listing[]> => {
    const raw = await api.get<ApiResponse<ListingsEnvelope>>('/admin/listings');
    console.log('[listingsService] GET /admin/listings raw response:', raw);
    const data = raw.data;
    if (Array.isArray(data)) return data;
    if (data && 'listings' in data && Array.isArray(data.listings)) return data.listings;
    return [];
  },

  updateListingStatus: async (id: string, status: 'ACTIVE' | 'REJECTED') => {
    const res = await api.patch<ApiResponse<{ id: string; status: string }>>(
      `/admin/listings/${id}/status`,
      { status }
    );
    return res.data;
  },

  // Step 1 of publish: upload raw File objects → get back stable CDN URLs
  uploadImages: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const res = await api.uploadForm<ApiResponse<{ urls: string[] }>>('/upload', formData);
    return res.data.urls;
  },

  getMyListings: async (): Promise<Listing[]> => {
    // Try the user-scoped route first; fall back to the listings-scoped alias
    const tryFetch = async (path: string) => {
      const raw = await api.get<ApiResponse<ListingsEnvelope>>(path);
      const data = raw.data;
      if (Array.isArray(data)) return data;
      if (data && 'listings' in data && Array.isArray(data.listings)) return data.listings;
      return [] as Listing[];
    };
    try {
      return await tryFetch('/users/me/listings');
    } catch {
      return tryFetch('/listings/me');
    }
  },

  getMyListingsPaged: async (page = 1, limit = 10): Promise<ListingsResult> => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    const tryFetch = async (path: string): Promise<ListingsResult> => {
      const raw = await api.get<ApiResponse<ListingsEnvelope>>(`${path}?${qs}`);
      const data = raw.data;
      if (Array.isArray(data)) {
        return { listings: data, total: data.length, page, totalPages: 1 };
      }
      if (data && 'listings' in data && Array.isArray(data.listings)) {
        return {
          listings:   data.listings,
          total:      data.total      ?? data.listings.length,
          page:       data.page       ?? page,
          totalPages: data.totalPages ?? 1,
        };
      }
      return { listings: [], total: 0, page, totalPages: 0 };
    };
    try {
      return await tryFetch('/users/me/listings');
    } catch {
      return tryFetch('/listings/me');
    }
  },

  updateListing: async (
    id: string,
    payload: Partial<Pick<CreateListingPayload, 'title' | 'description' | 'price' | 'currency'>>,
  ): Promise<void> => {
    await api.patch<unknown>(`/listings/${id}`, payload);
  },

  markAsSold: async (id: string): Promise<void> => {
    await api.patch<unknown>(`/listings/${id}/status`, { status: 'SOLD' });
  },

  reactivateListing: async (id: string): Promise<void> => {
    await api.patch<unknown>(`/listings/${id}/status`, { status: 'ACTIVE' });
  },

  deleteListing: async (id: string): Promise<void> => {
    await api.delete<unknown>(`/listings/${id}`);
  },

  getAdminListings: async (params?: GetListingsParams): Promise<ListingsResult> => {
    const qs = new URLSearchParams();
    if (params?.limit)       qs.set('limit',       String(params.limit));
    if (params?.page)        qs.set('page',         String(params.page));
    if (params?.status)      qs.set('status',       params.status);
    if (params?.isFeatured)  qs.set('isFeatured',   'true');
    if (params?.fromWho)     qs.set('fromWho',      params.fromWho);
    if (params?.categoryId)  qs.set('categoryId',   params.categoryId);
    const query = qs.toString() ? `?${qs}` : '';
    const raw = await api.get<ApiResponse<ListingsEnvelope>>(`/admin/listings${query}`);
    const data = raw.data;
    if (Array.isArray(data)) {
      return { listings: data, total: data.length, page: params?.page ?? 1, totalPages: 1 };
    }
    if (data && 'listings' in data && Array.isArray(data.listings)) {
      return extractResult(data, params?.page ?? 1);
    }
    return { listings: [], total: 0, page: 1, totalPages: 0 };
  },

  toggleFeatured: async (id: string, isFeatured: boolean): Promise<void> => {
    await api.patch<unknown>(`/admin/listings/${id}/featured`, { isFeatured });
  },

  getShowcase: async (type: 'HOMEPAGE' | 'URGENT' | string = 'HOMEPAGE'): Promise<Listing[]> => {
    const raw = await api.get<ApiResponse<ListingsEnvelope>>(`/listings/showcase?type=${type}`);
    const data = raw.data;
    if (Array.isArray(data)) return data;
    if (data && 'listings' in data && Array.isArray(data.listings)) return data.listings;
    return [];
  },
};
