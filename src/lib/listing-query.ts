/**
 * The ONE place a browse filter state becomes API query params.
 *
 * WHY THIS EXISTS: `/listings` and `/category/[...slug]` each used to hand-write
 * the same ~25-line `getListings({...})` mapping. That was survivable while the
 * list was the only consumer — the two copies could drift and nobody would see
 * it. The map view breaks that: it asks a DIFFERENT endpoint
 * (`/listings/map-points`) for the SAME result set, and the whole feature rests
 * on the two answers matching. The backend guarantees its half by sharing one
 * where-clause builder between the two routes; this is the frontend's half. A
 * filter that only one caller mapped would silently show a map that disagrees
 * with the list under it — the exact bug that is hardest to notice and worst to
 * ship.
 *
 * So: filters in, `GetListingsParams` out, once. Callers add only what is
 * genuinely theirs (paging, and the per-surface extras below).
 *
 * Deliberately maplibre- and React-free, and a pure function: it can be called
 * from a page, a component, or a test without a DOM.
 */

import type { FilterValues } from '@/components/listings/FilterSidebar';
import type { GetListingsParams } from '@/services/listings.service';

/**
 * Per-surface additions that are NOT part of the shared filter state.
 *
 * Each of these exists on exactly one browse surface today, which is why they
 * are parameters rather than fields of `FilterValues`: `/listings` owns the text
 * search, the currency selector and the seller-scoped view; `/category` owns the
 * EV fuel-type override. Passing them explicitly keeps the shared mapping honest
 * about what is shared and what isn't.
 */
export interface ListingQueryExtras {
  /** Free-text / ad-number search — `/listings` only. */
  query?: string;
  /** Currency selector, read from the URL rather than `FilterValues.currency`. */
  currency?: string;
  sort?: string;
  /** Seller-scoped browse ("all ads by this store") — `/listings` only. */
  sellerId?: string;
  /**
   * Forces `fuelType` regardless of filter state. The `/category/.../electric`
   * page sends ELECTRIC unconditionally so the query stays correct even before
   * the backend seeds that category id.
   */
  fuelTypeOverride?: string;
}

/**
 * Filter state → API params. Paging is NOT set here: the list adds `page`/`limit`,
 * and the map deliberately has neither (it asks for the whole matched set).
 *
 * Empty strings collapse to `undefined` so the serializer can drop them, which is
 * what keeps an untouched filter out of the query string entirely.
 */
export function buildListingQuery(
  f: FilterValues,
  extras: ListingQueryExtras = {},
): GetListingsParams {
  return {
    query:        extras.query    || undefined,
    currency:     extras.currency || undefined,
    sort:         extras.sort     || undefined,
    sellerId:     extras.sellerId || undefined,

    categoryId:   f.categoryId || undefined,
    make:         f.make       || undefined,
    model:        f.model      || undefined,
    city:         f.city       || undefined,
    district:     f.district   || undefined,

    minPrice:     f.minPrice   ? Number(f.minPrice)   : undefined,
    maxPrice:     f.maxPrice   ? Number(f.maxPrice)   : undefined,
    minYear:      f.minYear    ? Number(f.minYear)    : undefined,
    maxYear:      f.maxYear    ? Number(f.maxYear)    : undefined,
    minMileage:   f.minMileage ? Number(f.minMileage) : undefined,
    maxMileage:   f.maxMileage ? Number(f.maxMileage) : undefined,
    // Electric-range. Previously sent by /category only — see the note below.
    minRange:     f.minRange   ? Number(f.minRange)   : undefined,
    maxRange:     f.maxRange   ? Number(f.maxRange)   : undefined,

    // Multi-selects travel as comma-joined lists, matching the backend's parser.
    fuelType:     extras.fuelTypeOverride ?? (f.fuelTypes.join(',') || undefined),
    transmission: f.transmissions.join(',') || undefined,
    condition:    f.conditions.join(',')    || undefined,
    drivetrain:   f.drivetrains.join(',')   || undefined,
    color:        f.colors.join(',')        || undefined,
    fromWho:      f.fromWhos.join(',')      || undefined,
    bodyType:     f.bodyType || undefined,

    // Tri-state booleans: '' means "not filtered", so it must stay undefined
    // rather than collapsing to false.
    warranty:     f.warranty    ? f.warranty    === 'true' : undefined,
    heavyDamage:  f.heavyDamage ? f.heavyDamage === 'true' : undefined,
    tradeIn:      f.tradeIn     ? f.tradeIn     === 'true' : undefined,
  };
}

/**
 * ONE deliberate behaviour change from unifying the two copies: `/listings` never
 * sent `minRange`/`maxRange`, while `/category` did. Since `FilterValues` declares
 * both and the backend accepts both, the shared mapping sends them from either
 * surface. In practice the electric-range inputs only render inside the vehicle
 * sidebar, so this changes nothing until someone hand-writes those params — at
 * which point `/listings` now honours them instead of silently dropping them.
 */
