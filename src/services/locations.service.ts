import { api } from './api';

// ═══════════════════════════════════════════════════════════════════════════════
// Location catalog — the GOVERNORATE → DISTRICT → PLACE tree that drives the
// add-listing location cascade, the map recenter and (later) browse filters.
// Backend mounts these under /api/v1/locations and returns RAW ARRAYS/OBJECTS
// (not the { data } ApiResponse envelope), exactly like /catalog — so the `api`
// wrapper's passthrough json() is what we want.
//   GET /locations/regions?parent=<slug>  → children of a node (governorates if none)
//   GET /locations/regions/:slug           → one node
//   GET /locations/regions/:slug/path      → breadcrumb governorate → node
//   GET /locations/search?q=…&parent=…     → autocomplete, each hit carrying its path
// ═══════════════════════════════════════════════════════════════════════════════

export type RegionLevel = 'GOVERNORATE' | 'DISTRICT' | 'PLACE';

/**
 * OSM's `place=*` tag, passed through verbatim by the backend. Kept as a widened
 * string because the catalog is OSM-derived reference data: a reseed can
 * introduce a tag we've never seen, and an exhaustive union would turn that into
 * a type error (or worse, a silently dropped row) instead of a new group member.
 * `PLACE_GROUPS` below decides what each value MEANS to the UI.
 */
export type PlaceType = string;

export interface Region {
  slug: string;
  level: RegionLevel;
  nameAr: string;
  nameEn: string | null;
  placeType: PlaceType | null;
  /** Centre point. Nullable in the type because the column is — every row is
   *  currently populated, but a hand-added region wouldn't have to be. */
  lat: number | null;
  lng: number | null;
  /** Denormalized listingCount — the backend's primary sort key. */
  count: number;
  parentSlug: string | null;
  /** Present on `?parent=` responses only. TRUE ⇒ this node contains places.
   *  This is the signal the adaptive cascade keys off; see `getGovernorateLevel`. */
  hasChildren?: boolean;
}

export interface RegionSearchHit extends Region {
  /** governorate → … → node. One pick can fill every level of the form. */
  path: { slug: string; nameAr: string; level: RegionLevel }[];
}

// ── Grouping ──────────────────────────────────────────────────────────────────
// The combobox shows two groups: urban first (that's the main market), rural
// below. The split is by OSM place tag, NOT by tree level — a Damascus
// neighborhood and an Aleppo village are both PLACE rows.
//
// NOTE both spellings of neighbo(u)rhood: the catalog carries the British
// `neighbourhood` (OSM's tag), while our own Arabic-facing code and the 3a-2
// curation notes say "neighborhood". Matching both costs nothing and stops a
// whole group from silently vanishing on a reseed.
const URBAN_PLACE_TYPES = new Set([
  'neighbourhood', 'neighborhood', 'quarter', 'suburb', 'borough',
]);

export type PlaceGroupKey = 'urban' | 'rural';

export const PLACE_GROUP_LABELS: Record<PlaceGroupKey, string> = {
  urban: 'الأحياء',
  rural: 'القرى والبلدات',
};

export function placeGroup(r: Pick<Region, 'placeType'>): PlaceGroupKey {
  return URBAN_PLACE_TYPES.has(r.placeType ?? '') ? 'urban' : 'rural';
}

/**
 * HYBRID LOADING THRESHOLD — above this many places in one list, typing queries
 * the server instead of filtering the fetched array.
 *
 * 150 is picked off the live distribution (62 lists, median 110, max 487), and
 * the binding constraint is Damascus: its single district flattens to 113
 * places, and it is the biggest market. Anything at or below ~113 would drop the
 * capital into search-only mode, where the combobox shows nothing until the
 * seller types — exactly the browsable grouped list this cascade exists to give
 * them. 150 clears it with headroom while still routing the 22 genuinely large
 * rural districts (256–487: al-Hasakah, Quamishli, Ain al-Arab, Menbij…) to the
 * server, whose SQL ranking beats naive substring filtering at that size anyway.
 *
 * HONEST LIMIT: the catalog API exposes `hasChildren` (a boolean) but no CHILD
 * COUNT, so the size is only knowable AFTER fetching. This threshold therefore
 * switches SEARCH STRATEGY, not whether the download happens — the list is
 * fetched once per district and cached for the session either way. Exposing
 * `_count.children` as a number on the `?parent=` payload (one line in the
 * backend's `shape()`) would make it preventive; see FOLLOWUPS.md.
 */
export const PLACE_FETCH_ALL_MAX = 150;

export type PlaceSearchMode = 'client' | 'server';

export function placeSearchMode(count: number): PlaceSearchMode {
  return count > PLACE_FETCH_ALL_MAX ? 'server' : 'client';
}

/** Short Arabic label for the place's kind — the muted hint beside each option. */
const PLACE_TYPE_LABELS: Record<string, string> = {
  city: 'مدينة',
  town: 'بلدة',
  village: 'قرية',
  hamlet: 'مزرعة',
  suburb: 'ضاحية',
  quarter: 'حارة',
  borough: 'حي',
  neighbourhood: 'حي',
  neighborhood: 'حي',
  district: 'منطقة',
  governorate: 'محافظة',
};

export function placeTypeLabel(t?: PlaceType | null): string {
  return (t && PLACE_TYPE_LABELS[t]) || '';
}

// ── Session cache ─────────────────────────────────────────────────────────────
// Same rationale as the category catalog: this is static reference data, the
// wizard re-mounts it on every step change, and the backend's locations limiter
// is 300/min per IP — shared across everyone behind one Syrian carrier NAT.
// Caching the PROMISE also de-dupes in flight. Failures evict so a single 429
// during startup can't pin an error for the whole session.
const childrenCache = new Map<string, Promise<Region[]>>();
const regionCache = new Map<string, Promise<Region | null>>();
const pathCache = new Map<string, Promise<RegionSearchHit['path']>>();

const ROOTS_KEY = ' roots'; // can't collide with a slug

function cached<T>(cache: Map<string, Promise<T>>, key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit;
  const p = fetcher().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, p);
  return p;
}

export function clearLocationCache(): void {
  childrenCache.clear();
  regionCache.clear();
  pathCache.clear();
}

/**
 * What the cascade should render for a governorate.
 *
 * `mode: 'places'` ⇒ show the place combobox directly (the district step would be
 * a dead single-option select). `mode: 'districts'` ⇒ show the district select
 * first, because places really are spread across several of them.
 */
export interface GovernorateShape {
  mode: 'places' | 'districts';
  /** Populated when mode === 'places'. */
  places: Region[];
  /** Populated when mode === 'districts' — only districts that CONTAIN places. */
  districts: Region[];
}

export const locationsService = {
  /**
   * The 14 governorates, in the backend's own order (listingCount → sortOrder →
   * population → name) — i.e. already market-sorted. Never re-sort client-side:
   * the ordering is a backend concern and it changes as listings accumulate.
   */
  getGovernorates: async (): Promise<Region[]> => {
    try {
      return await cached(childrenCache, ROOTS_KEY, () => api.get<Region[]>('/locations/regions'));
    } catch {
      return [];
    }
  },

  /** Direct children of a node. Returns [] on error so the cascade degrades to
   *  «أخرى» + free text rather than blocking the seller mid-wizard. */
  getChildren: async (parentSlug: string): Promise<Region[]> => {
    try {
      return await cached(childrenCache, parentSlug, () =>
        api.get<Region[]>(`/locations/regions?parent=${encodeURIComponent(parentSlug)}`),
      );
    } catch {
      return [];
    }
  },

  getRegion: async (slug: string): Promise<Region | null> => {
    try {
      return await cached(regionCache, slug, () =>
        api.get<Region>(`/locations/regions/${encodeURIComponent(slug)}`),
      );
    } catch {
      return null;
    }
  },

  /** Breadcrumb governorate → node. Used by the edit path to rebuild the cascade
   *  from a listing's stored region. */
  getPath: async (slug: string): Promise<RegionSearchHit['path']> => {
    try {
      return await cached(pathCache, slug, () =>
        api.get<RegionSearchHit['path']>(`/locations/regions/${encodeURIComponent(slug)}/path`),
      );
    } catch {
      return [];
    }
  },

  /**
   * Ancestor-scoped autocomplete. The reason this exists alongside the cascade:
   * al-Hasakah's largest district holds 487 places and 15 districts hold >200, so
   * drilling is unusable at the tail. Searching lets a seller type «المزة» and
   * land on it without knowing which district it sits under.
   *
   * The backend requires q.length >= 2 and returns [] below that, so callers can
   * pass raw input without guarding.
   */
  search: async (q: string, parentSlug?: string, limit = 30): Promise<RegionSearchHit[]> => {
    const query = q.trim();
    if (query.length < 2) return [];
    const qs = new URLSearchParams({ q: query, limit: String(limit) });
    if (parentSlug) qs.set('parent', parentSlug);
    // Deliberately uncached: the key space is unbounded (every keystroke) and the
    // component debounces + drops stale responses already.
    try {
      return await api.get<RegionSearchHit[]>(`/locations/search?${qs.toString()}`);
    } catch {
      return [];
    }
  },

  /**
   * ADAPTIVE CASCADE DEPTH — decides whether this governorate needs a district step.
   *
   * The tree is deliberately non-uniform: a village hangs off a DISTRICT, while a
   * curated city neighborhood hangs straight off its GOVERNORATE. So the depth a
   * seller should SEE depends on the governorate:
   *
   *   Damascus  → 1 district (دمشق) holding every place  → district step is a
   *               dead single-option select. Skip it, flatten to 2 steps.
   *   Aleppo    → 8 districts, 2,092 places between them → the district step is
   *               what makes the list navigable. Show it, 3 steps.
   *
   * Costs ONE request in the districts case and TWO in the places case. The
   * `hasChildren` flag rides on the `?parent=` payload already (the backend sets
   * it from `_count.children > 0`), so deciding needs no extra round trip.
   *
   * Districts with NO places are filtered out before counting — an empty district
   * must not push a governorate into a 3-step flow that then offers a dead end.
   */
  getGovernorateShape: async (govSlug: string): Promise<GovernorateShape> => {
    const children = await locationsService.getChildren(govSlug);

    // Curated neighborhoods (3a-2) hang directly off the governorate. None are
    // seeded today, but when they land they are exactly what the seller wants
    // first — so they short-circuit the district logic entirely.
    const directPlaces = children.filter((c) => c.level === 'PLACE');
    const districts = children.filter((c) => c.level === 'DISTRICT' && c.hasChildren !== false);

    if (directPlaces.length && !districts.length) {
      return { mode: 'places', places: directPlaces, districts: [] };
    }

    if (districts.length <= 1) {
      // Zero or one meaningful district ⇒ the seller never benefits from picking
      // it. Merge whatever it holds with any direct places and show one list.
      const inner = districts.length ? await locationsService.getChildren(districts[0].slug) : [];
      return {
        mode: 'places',
        places: [...directPlaces, ...inner.filter((r) => r.level === 'PLACE')],
        districts: [],
      };
    }

    return { mode: 'districts', places: directPlaces, districts };
  },
};
