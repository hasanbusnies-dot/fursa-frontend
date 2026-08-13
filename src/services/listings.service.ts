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
  /**
   * Deepest catalog region the seller picked (PLACE slug, or the GOVERNORATE slug
   * for «أخرى»). When present the backend resolves city/governorate/neighborhood
   * from it and IGNORES the text fields above — so the two can never disagree.
   */
  regionSlug?:  string;
  address?:     string;
  /** Map pin. Always sent as a pair or omitted entirely — never a lone half. */
  latitude?:    number;
  longitude?:   number;
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
  // Category-specific fields → Listing.attributes JSONB. Values are widget-shaped
  // (string | string[] | { min?, max? } | boolean), so the value type is unknown.
  attributes?:  Record<string, unknown>;
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

// ── Map points ────────────────────────────────────────────────────────────────

/**
 * How a point's coordinate was arrived at — the map's honesty signal, and the
 * reason the browse map can show pinless listings at all.
 *
 *  · `exact`        — the seller's own pin.
 *  · `region`       — the catalog centroid of the region they picked.
 *  · `governorate`  — only the governorate is known.
 *
 * The last two are SHARED coordinates: every pinless listing in a region sits on
 * one identical point, which is why the map clusters rather than zoom-expands.
 */
export type MapPointPrecision = 'exact' | 'region' | 'governorate';

/** One placeable listing. Deliberately tiny — thousands of these ride one response. */
export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  price: number;
  currency: 'SYP' | 'USD';
  precision: MapPointPrecision;
}

/**
 * Why `returned` can be less than `matched`, stated by the backend rather than
 * guessed at by the map:
 *   returned = matched − hiddenByOptOut − unplaceable
 * and `matched` equals the list's `total` for the same filters — UNLESS `capped`
 * is true, in which case `matched` was clamped to `cap` by design and the parity
 * assertion does not apply.
 */
export interface MapPointsMeta {
  matched: number;
  returned: number;
  /** Sellers who chose not to show a map on their listing. */
  hiddenByOptOut: number;
  /** No pin, no region, no known governorate — nothing to place them with. */
  unplaceable: number;
  capped: boolean;
  cap: number;
}

export interface MapPointsResult {
  points: MapPoint[];
  meta: MapPointsMeta;
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

/**
 * Params → query string, shared by the list feed and the map points.
 *
 * The two endpoints MUST express the same filter state identically: the backend
 * runs both through one where-clause builder, so any difference here shows up as
 * a map that disagrees with the list beneath it. Serialising in one place is what
 * makes that impossible — `buildListingQuery` (lib/listing-query.ts) produces the
 * params, this turns them into the request.
 *
 * `paging` is the only legitimate difference: the feed is paginated, the map asks
 * for the whole matched set. `sort` goes with it — ordering is meaningless for a
 * set of points, and the endpoint rejects it.
 */
function buildListingSearchParams(
  params: GetListingsParams | undefined,
  { paging }: { paging: boolean },
): URLSearchParams {
  const qs = new URLSearchParams();
  if (paging) {
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.page)  qs.set('page',  String(params.page));
    if (params?.sort)  qs.set('sort',  params.sort);
  }
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
  if (params?.warranty    != null) qs.set('warranty',    String(params.warranty));
  if (params?.heavyDamage != null) qs.set('heavyDamage', String(params.heavyDamage));
  if (params?.tradeIn     != null) qs.set('tradeIn',     String(params.tradeIn));
  if (params?.fromWho)     qs.set('fromWho',      params.fromWho);
  if (params?.make)        qs.set('make',         params.make);
  if (params?.model)       qs.set('model',        params.model);
  if (params?.status)      qs.set('status',       params.status);
  if (params?.sellerId)    qs.set('sellerId',     params.sellerId);
  return qs;
}

/**
 * Ceiling on `getListingsByIds`, and deliberately the SAME number the backend
 * caps `/listings/by-ids` at. Kept client-side so the caller can tell the user
 * "showing the first 30" before the request rather than silently rendering a
 * truncated list; sized for a sheet a person will actually read, not for a
 * cluster's theoretical maximum — the live data's biggest pile is 6.
 *
 * If the backend's cap ever moves, move this with it.
 */
export const MAX_LISTINGS_BY_ID = 30;

export const listingsService = {
  getListings: async (params?: GetListingsParams): Promise<ListingsResult> => {
    const qs = buildListingSearchParams(params, { paging: true });
    const query = qs.toString() ? `?${qs}` : '';

    // Raw responses are deliberately NOT logged anywhere in this service: listing
    // payloads carry seller PII (phone, profile) and precise coordinates.
    // Pagination rides BESIDE `data`, not inside it — the live envelope is
    // `{ success, message, data: Listing[], meta: { total, page, totalPages, … } }`.
    // Typing that sibling here is what lets the array branch see a total at all.
    const raw = await api.get<ApiResponse<ListingsEnvelope> & { meta?: ListingsMeta }>(
      `/listings${query}`,
    );

    const data = raw.data;
    const meta = raw.meta;

    if (Array.isArray(data)) {
      // `data.length` is the size of the PAGE, never the size of the result set,
      // so it is a last resort rather than the answer: with `limit: 1` it reports
      // "1 result" for a 25-listing search. It also pinned `totalPages` to 1,
      // which is why the browse pager rendered «صفحة 1 / 1» and kept «التالي»
      // disabled — the API was reporting totalPages: 25, hasNextPage: true.
      return {
        listings:   data,
        total:      meta?.total      ?? data.length,
        page:       meta?.page       ?? params?.page ?? 1,
        totalPages: meta?.totalPages ?? 1,
      };
    }
    if (data && 'listings' in data && Array.isArray(data.listings)) {
      return extractResult(data, params?.page ?? 1);
    }
    return { listings: [], total: 0, page: 1, totalPages: 0 };
  },

  /**
   * Placeable coordinates for EVERY listing matching the filters — the browse
   * map's data source.
   *
   * Takes the SAME `GetListingsParams` the feed takes, and is meant to be handed
   * the very same object: `paging: false` drops `page`/`limit`/`sort` here rather
   * than asking callers to remember to strip them, so a caller physically cannot
   * send the map a narrower or wider filter set than the list. That is the whole
   * point of the shared builder above.
   *
   * Unpaginated by design (the backend caps at `meta.cap` and says so via
   * `meta.capped`): a map that only plotted the current page would be a map of
   * thirty listings pretending to be a map of the search.
   */
  getMapPoints: async (params?: GetListingsParams): Promise<MapPointsResult> => {
    const qs = buildListingSearchParams(params, { paging: false });
    const query = qs.toString() ? `?${qs}` : '';
    // Coordinates are PII-adjacent — like getListings, responses are never logged.
    const raw = await api.get<ApiResponse<MapPoint[]> & { meta?: MapPointsMeta }>(
      `/listings/map-points${query}`,
    );
    const points = Array.isArray(raw.data) ? raw.data : [];
    return {
      points,
      // A missing meta must not read as "0 matched, nothing hidden" — that would
      // make a broken response look like an empty search. Fall back to what we
      // can actually see, and leave the counts we cannot know at zero.
      meta: raw.meta ?? {
        matched: points.length,
        returned: points.length,
        hiddenByOptOut: 0,
        unplaceable: 0,
        capped: false,
        cap: 0,
      },
    };
  },

  getListingById: async (id: string): Promise<Listing> => {
    const res = await api.get<ApiResponse<Listing>>(`/listings/${id}`);
    return res.data;
  },

  /**
   * Cards for a KNOWN set of ids — what the browse map's cluster sheet needs
   * when the user opens a pile of listings sharing one coordinate.
   *
   * ONE REQUEST, via the dedicated `GET /listings/by-ids?ids=a,b,c`. This used to
   * fan out one `GET /listings/:id` per id, which made the sheet visibly slow: a
   * six-listing cluster cost six round trips and ~17KB of DETAIL payloads
   * (description, seller, questions) to render six thumbnails. The batch call is
   * one trip and ~9KB of CARD payloads — the same shape browse renders.
   *
   * Use the DEDICATED PATH, never `GET /listings?ids=`. The list endpoint
   * silently IGNORES `?ids=` and `?id=` and returns the whole unfiltered result
   * set (verified live — asking for 2 ids returned all 25). That failure mode is
   * the dangerous kind: the response looks perfectly healthy while containing the
   * wrong listings. `/listings/by-ids` is a different route and genuinely filters.
   *
   * PARTIAL RESULTS ARE NORMAL, and the reason nothing here throws on a short
   * response: a listing can be deleted or moderated away between the map-points
   * response and the click, and the backend simply omits ids it will not serve.
   * Five rows out of six is a correct sheet, not a failed one.
   *
   * Hard-capped to match the backend's own cap (see `MAX_LISTINGS_BY_ID`) — a
   * cluster can legitimately hold hundreds of ids, and the caller shows the true
   * count in its header and says the rest are not listed.
   *
   * LOCATION — the card payload carries the four DENORMALISED columns
   * (`neighborhood`, `district`, `city`, `governorate`) and NOT the `region`
   * relation or the flattened `locationPath`; those two live only in the detail
   * payload (`LISTING_DETAIL_INCLUDE`). That is the right split, not a gap:
   * `neighborhood` is the only column that separates one «دمشق» listing from the
   * next, which is exactly what a cluster of centroid-placed listings needs, and
   * the sheet's `locationLine` already reads it. Verified live: a six-listing
   * pile renders «قدسيا، دمشق» / «التجارة، دمشق» rather than six identical rows.
   *
   * Do not "upgrade" this to the detail payload to chase `locationPath` — the
   * columns express governorate + leaf, which is the whole of what a row shows.
   */
  getListingsByIds: async (ids: string[]): Promise<Listing[]> => {
    // De-duplicated BEFORE the cap so a repeated id cannot eat a slot, and so the
    // re-order below cannot emit the same listing twice.
    const wanted = [...new Set(ids)].slice(0, MAX_LISTINGS_BY_ID);
    // The endpoint rejects an empty `ids` (400) — an empty ask is not an error,
    // it is simply nothing to fetch.
    if (wanted.length === 0) return [];

    const qs = new URLSearchParams({ ids: wanted.join(',') });
    // Card payloads still carry seller info and are never logged (see getListings).
    const raw = await api.get<ApiResponse<Listing[]>>(`/listings/by-ids?${qs}`);
    const rows = Array.isArray(raw.data) ? raw.data : [];

    // Re-ordered to the order asked for. The backend does return them in request
    // order today, but the sheet's stability must not depend on that staying
    // true — the caller's order is the map's, and any other order would reshuffle
    // the rows on every open.
    const byId = new Map<string, Listing>();
    for (const row of rows) if (row?.id) byId.set(row.id, row);
    return wanted.map((id) => byId.get(id)).filter((l): l is Listing => l != null);
  },

  create: async (payload: CreateListingPayload) => {
    const res = await api.post<ApiResponse<ListingCreatedResponse>>('/listings', payload);
    return res.data;
  },

  getPendingListings: async (): Promise<Listing[]> => {
    const raw = await api.get<ApiResponse<ListingsEnvelope>>('/admin/listings');
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
    // `latitude`/`longitude` are here so a seller can FIX a wrong pin after
    // publishing — dropping one shouldn't be a one-way door. The backend's
    // updateListingSchema already accepts both.
    // `regionSlug`/`neighborhood` ride along so the edit surface can correct a
    // wrong location, not just a wrong pin. The backend's updateListingSchema
    // accepts both and re-resolves the denormalized columns from the slug.
    payload: Partial<
      Pick<
        CreateListingPayload,
        | 'title' | 'description' | 'price' | 'currency' | 'latitude' | 'longitude'
        | 'regionSlug' | 'neighborhood'
      >
    >,
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
