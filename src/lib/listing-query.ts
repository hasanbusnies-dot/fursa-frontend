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
 * The catalog attributes to send, with the one virtual-key mapping that cannot live
 * in `attr-params.ts` (which only sees the attributes bag, not the whole filter state).
 *
 * `minRange`/`maxRange` are the vehicle sidebar's «مدى السير (كم)» inputs. They were
 * sent as fixed params for months and silently dropped: THERE IS NO ELECTRIC-RANGE
 * COLUMN on the backend and there never was. The data is the catalog's `batteryRange`
 * RANGE filter stored in `listings.attributes`, seeded on the electric-car categories —
 * so the correct wire form is `attr_batteryRange_min`/`_max`.
 *
 * This is the ONE intentional attr_* param on a vehicle browse (§ the fixed-vs-catalog
 * split below); it is safe precisely because no fixed param competes with it.
 * A `batteryRange` already present in `attributes` wins — that is a category whose own
 * catalog defs put it there, which is the more specific source.
 */
function attributesFor(f: FilterValues): Record<string, unknown> | undefined {
  const attrs: Record<string, unknown> = { ...(f.attributes ?? {}) };

  if ((f.minRange || f.maxRange) && attrs.batteryRange === undefined) {
    attrs.batteryRange = {
      ...(f.minRange ? { min: f.minRange } : {}),
      ...(f.maxRange ? { max: f.maxRange } : {}),
    };
  }

  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

/**
 * Filter state → API params. Paging is NOT set here: the list adds `page`/`limit`,
 * and the map deliberately has neither (it asks for the whole matched set).
 *
 * Empty strings collapse to `undefined` so the serializer can drop them, which is
 * what keeps an untouched filter out of the query string entirely.
 *
 * ── FIXED PARAMS vs CATALOG ATTRIBUTES — a deliberate split, not an accident ──
 * Vehicles are the only tree where the same concept exists twice: `fuelType` is both a
 * fixed enum param (`GASOLINE`, a real column on vehicle_details) and a catalog SELECT
 * (`بنزين`, stored in attributes); `warranty` is both a fixed boolean and a catalog
 * «نعم»/«لا» string. The rule, decided with the founder:
 *
 *   the bespoke vehicle sidebar → FIXED params      (fuelTypes, transmissions, …)
 *   the generic CatalogFilterView → attr_*          (FilterValues.attributes)
 *
 * They cannot collide, structurally rather than by promise: only `CatalogFilterView`
 * ever writes `attributes`, and it never renders for a motor-vehicle category (see
 * `usesCatalogFilters` in FilterSidebar). The category page also resets filters to
 * EMPTY_FILTERS on every slug change, so attributes collected under real-estate cannot
 * ride along into a car browse and double-filter.
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

    // ── Catalog attribute filters ───────────────────────────────────────────
    // Only when a category is scoped: attr_* without one has no whitelist to
    // validate against, so the backend reports every key as `no_category` and
    // filters nothing. Sending them unscoped would just manufacture noise.
    attributes: f.categoryId ? attributesFor(f) : undefined,

    // FIXED multi-selects travel comma-joined — and that is now verified rather than
    // assumed. Until 2026-08-17 the backend's enum parser handled single and REPEATED
    // params only, so `?fuelType=GASOLINE,DIESEL` 400'd the whole request: ticking two
    // fuel types emptied the page while ticking one worked. The backend fix (24c9d30)
    // accepts all three spellings for these params and its R3 run proved comma-joined
    // returns byte-identically to repeated, so this stays as-is.
    //
    // Do NOT copy this to attr_* — those are repeated-only, because their values are
    // opaque catalog strings that may legitimately contain a comma. See attr-params.ts.
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
 * `minRange`/`maxRange` used to be forwarded here as fixed params. They are not any
 * more — not because the mapping was dropped, but because it never worked: the backend
 * has no electric-range column, so both were parsed away and discarded on arrival.
 * `attributesFor` above now sends them as `attr_batteryRange_min`/`_max`, which is
 * where that data actually lives.
 */
