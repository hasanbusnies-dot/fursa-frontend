import { api } from './api';
// `lib/map` is deliberately maplibre-free (see its header), so importing the
// Coords type here pulls in no map runtime.
import type { Coords } from '@/lib/map';

// ═══════════════════════════════════════════════════════════════════════════════
// Location catalog — the 4-level GOVERNORATE → DISTRICT → SUBDISTRICT → PLACE
// tree that drives the add-listing location cascade, the map recenter and
// (later) browse filters.
// Backend mounts these under /api/v1/locations and returns RAW ARRAYS/OBJECTS
// (not the { data } ApiResponse envelope), exactly like /catalog — so the `api`
// wrapper's passthrough json() is what we want.
//   GET /locations/regions?parent=<slug>  → children of a node (governorates if none)
//   GET /locations/regions?parent=…&grouped=true
//                                          → GROUPED discovery view (governorates)
//   GET /locations/regions/:slug           → one node
//   GET /locations/regions/:slug/path      → breadcrumb governorate → node
//   GET /locations/search?q=…&parent=…     → autocomplete, each hit carrying its path
// ═══════════════════════════════════════════════════════════════════════════════

export type RegionLevel = 'GOVERNORATE' | 'DISTRICT' | 'SUBDISTRICT' | 'PLACE';

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
  /** Present on `?parent=` responses. TRUE ⇒ this node has children. */
  hasChildren?: boolean;
  /**
   * MAY a listing's `region_id` point here? TRUE for PLACE + GOVERNORATE only.
   * A DISTRICT/SUBDISTRICT is drill-through scaffolding: offering one as a final
   * answer is what used to produce a create-listing 400, so the cascade never
   * finalizes on a node with `selectable: false`.
   */
  selectable?: boolean;
  /** Number of direct children — drives the adaptive skip without a probe fetch. */
  childCount?: number;
}

export interface RegionSearchHit extends Region {
  /** governorate → … → node. One pick can fill every level of the form. */
  path: RegionPathEntry[];
}

export interface RegionPathEntry {
  slug: string;
  nameAr: string;
  level: RegionLevel;
}

/**
 * One section of the GROUPED discovery view (`?parent=<gov>&grouped=true`).
 *
 * The backend decides the sections, their order, their Arabic labels and which
 * tree levels each one collapsed — the frontend renders what it is given. Keys
 * are `string`, deliberately NOT a `'cityNeighborhoods' | 'districts'` union: a
 * new group must appear with zero frontend changes, exactly like a new catalog
 * category does. Empty groups are omitted by the backend (ريف دمشق has no city
 * neighborhoods, so it returns «المناطق» alone).
 */
export interface RegionGroup {
  key: string;
  labelAr: string;
  /** Levels the backend folded away for this group — informational. */
  skippedLevels: RegionLevel[];
  items: Region[];
}

/** One rendered rung of the cascade, after every adaptive skip has been applied. */
export interface RegionStep {
  /** The node whose children these are — the ORIGINAL parent, pre-skip. */
  requestedSlug: string;
  /** The node actually rendered, after auto-descending dead single-option rungs. */
  parentSlug: string;
  groups: RegionGroup[];
  /** Nodes auto-descended through, shallowest first. Never rendered. */
  skipped: Region[];
  /** Total items across every group — the size the combobox will show. */
  total: number;
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
 * The 4-level tree cut every rendered list down: the old flattened lists ran to
 * 487 rows, while the biggest rung today is مركز حلب at 184, then مركز منبج at
 * 162. The binding constraint is the governorate's own «أحياء المدينة» group —
 * حلب 128, دمشق 103, حمص 47 — which is the browsable city-centre shortcut this
 * cascade exists to give sellers and must NOT fall into search-only mode, where
 * the combobox shows nothing until they type. 150 clears all three with headroom
 * while still routing the two 160+ rungs to the server, whose SQL ranking beats
 * naive substring filtering at that size.
 *
 * The threshold switches SEARCH STRATEGY, not whether the download happens: the
 * rung is fetched to be rendered either way, then cached for the session.
 * (`childCount` now rides on the payload, so a preventive variant is possible —
 * but with the max rung at 184 there is nothing left worth preventing.)
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
  subdistrict: 'ناحية',
  governorate: 'محافظة',
};

export function placeTypeLabel(t?: PlaceType | null): string {
  return (t && PLACE_TYPE_LABELS[t]) || '';
}

/** Field label for a rung holding rows of this level. */
export const REGION_LEVEL_LABELS: Record<RegionLevel, string> = {
  GOVERNORATE: 'المحافظة',
  DISTRICT: 'المنطقة',
  SUBDISTRICT: 'الناحية',
  PLACE: 'الحي / القرية',
};

/**
 * MAY the cascade finalize on this node?
 *
 * The flag is authoritative and the backend sets it on every node. The fallback
 * mirrors the backend's own rule (PLACE + GOVERNORATE) so a payload that somehow
 * arrives without it degrades to the same answer instead of to `true` — the
 * direction that would re-open the bare-ناحية 400.
 */
export function isSelectable(r: Pick<Region, 'selectable' | 'level'>): boolean {
  return r.selectable ?? (r.level === 'PLACE' || r.level === 'GOVERNORATE');
}

/** Direct-child count, falling back to the older boolean when absent. */
export function childCountOf(r: Pick<Region, 'childCount' | 'hasChildren'>): number {
  if (typeof r.childCount === 'number') return r.childCount;
  return r.hasChildren ? 1 : 0;
}

export function hasChildren(r: Pick<Region, 'childCount' | 'hasChildren'>): boolean {
  return childCountOf(r) > 0;
}

/** Every item of a step, in group order. */
export function stepItems(step: RegionStep): Region[] {
  return step.groups.flatMap((g) => g.items);
}

// ── Session cache ─────────────────────────────────────────────────────────────
// Same rationale as the category catalog: this is static reference data, the
// wizard re-mounts it on every step change, and the backend's locations limiter
// is 300/min per IP — shared across everyone behind one Syrian carrier NAT.
// Caching the PROMISE also de-dupes in flight. Failures evict so a single 429
// during startup can't pin an error for the whole session.
const childrenCache = new Map<string, Promise<Region[]>>();
const groupedCache = new Map<string, Promise<RegionGroup[]>>();
const stepCache = new Map<string, Promise<RegionStep>>();
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
  groupedCache.clear();
  stepCache.clear();
  regionCache.clear();
  pathCache.clear();
}

/**
 * Cycle/runaway guard for the adaptive skip. The tree is 4 levels deep, so a
 * chain longer than this means the data is malformed, not deep — bail rather
 * than loop on it.
 */
const MAX_SKIP_DEPTH = 4;

/** Is this payload the grouped discovery view rather than a plain child array? */
function isGroupedPayload(d: unknown): d is RegionGroup[] {
  return (
    Array.isArray(d) &&
    d.length > 0 &&
    typeof d[0] === 'object' &&
    d[0] !== null &&
    Array.isArray((d[0] as RegionGroup).items)
  );
}

/**
 * Normalize either payload shape into groups.
 *
 * `grouped=true` is honoured for governorates and IGNORED for deeper parents,
 * which return a plain array — verified over HTTP (`?parent=menbij&grouped=true`
 * comes back as bare SUBDISTRICT rows). Asking for groups at every level and
 * normalizing here means the day the backend starts grouping a deeper rung, it
 * renders with zero frontend changes.
 */
function toGroups(payload: Region[] | RegionGroup[]): RegionGroup[] {
  if (isGroupedPayload(payload)) {
    return payload
      .map((g) => ({
        key: g.key,
        labelAr: g.labelAr,
        skippedLevels: g.skippedLevels ?? [],
        items: g.items ?? [],
      }))
      .filter((g) => g.items.length > 0);
  }
  const items = payload as Region[];
  if (!items.length) return [];
  // A plain list renders as ONE unlabeled section — no header, no visual noise.
  return [{ key: '', labelAr: '', skippedLevels: [], items }];
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
   * the 4th level made every list short but the tree DEEPER, and a seller knows
   * their village's name far better than which ناحية it hangs off. Searching
   * lets them type «المزة» and land on it without drilling.
   *
   * Hits are NOT all finalizable — the endpoint returns DISTRICT/SUBDISTRICT
   * rows too (verified: «المز» under دمشق returns المزة, a SUBDISTRICT with
   * `selectable: false`). Callers must filter with `isSelectable`.
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
  /** Raw grouped discovery view for a node. Prefer `getStep`, which also skips. */
  getGroups: async (parentSlug: string): Promise<RegionGroup[]> => {
    try {
      return await cached(groupedCache, parentSlug, async () =>
        toGroups(
          await api.get<Region[] | RegionGroup[]>(
            `/locations/regions?parent=${encodeURIComponent(parentSlug)}&grouped=true`,
          ),
        ),
      );
    } catch {
      return [];
    }
  },

  /**
   * ONE RUNG OF THE CASCADE — children of `parentSlug`, with the ADAPTIVE SKIP
   * applied.
   *
   * THE RULE (implemented exactly): fetch the children. If the response is ONE
   * item AND that item is `selectable: false`, auto-descend into it and render
   * NO step for it. Otherwise render the step.
   *
   * Both halves matter:
   *  · ONE item — a rung offering a single choice asks the seller to confirm
   *    something they never chose. Damascus' lone district is exactly this.
   *  · NOT selectable — a single PLACE is still a real answer, so it must be
   *    rendered. Skipping it would finalize a pick the seller never made.
   *
   * The skip loops, so several dead rungs in a row collapse in one pass, and it
   * is what makes باب المقام reachable in 2 steps while a منبج village still
   * drills 4 — the depth follows the data instead of a hardcoded level count.
   */
  getStep: async (parentSlug: string): Promise<RegionStep> => {
    try {
      return await cached(stepCache, parentSlug, async () => {
        const skipped: Region[] = [];
        let slug = parentSlug;

        for (let depth = 0; depth <= MAX_SKIP_DEPTH; depth++) {
          const groups = await locationsService.getGroups(slug);
          const items = groups.flatMap((g) => g.items);

          const only = items.length === 1 ? items[0] : null;
          if (only && !isSelectable(only) && hasChildren(only)) {
            skipped.push(only);
            slug = only.slug;
            continue;
          }

          return {
            requestedSlug: parentSlug,
            parentSlug: slug,
            groups,
            skipped,
            total: items.length,
          };
        }

        // Malformed chain — surface the last rung rather than nothing.
        return { requestedSlug: parentSlug, parentSlug: slug, groups: [], skipped, total: 0 };
      });
    } catch {
      return { requestedSlug: parentSlug, parentSlug, groups: [], skipped: [], total: 0 };
    }
  },

  /**
   * Where the map should look for `region`.
   *
   * The catalog's Tier-3 rows carry NULL coordinates (باب المقام is one), so a
   * naive `{lat, lng}` read leaves the map wherever it happened to be. Walk up
   * the parent chain to the nearest ancestor that HAS a coordinate — for a city
   * neighborhood that is its ناحية centre, i.e. the right part of town.
   *
   * Returns the level the coordinate actually came from so the caller can pick
   * an honest zoom: framing a ناحية centroid at street zoom would present a
   * whole-district guess as a specific address.
   */
  resolveCenter: async (
    region: Pick<Region, 'lat' | 'lng' | 'level' | 'parentSlug'> | null,
  ): Promise<{ center: Coords; level: RegionLevel } | null> => {
    if (!region) return null;
    if (region.lat != null && region.lng != null) {
      return { center: { lat: region.lat, lng: region.lng }, level: region.level };
    }
    let slug = region.parentSlug;
    for (let hops = 0; slug && hops < MAX_SKIP_DEPTH; hops++) {
      const parent: Region | null = await locationsService.getRegion(slug);
      if (!parent) break;
      if (parent.lat != null && parent.lng != null) {
        return { center: { lat: parent.lat, lng: parent.lng }, level: parent.level };
      }
      slug = parent.parentSlug;
    }
    return null;
  },

  /**
   * Rebuild the RENDERED ladder for an already-chosen region — the edit page's
   * prefill, the wizard's back-navigation, and the landing after a search hit.
   *
   * It cannot walk `getPath` directly: the path is the RAW tree, while the
   * ladder is what the adaptive skip and the grouped view actually show. باب
   * المقام sits three levels down the path (حلب → جبل سمعان → مركز حلب) yet
   * appears in the governorate's own «أحياء المدينة» group, so a path-walk would
   * render three rungs where the seller sees one.
   *
   * So it descends with `getStep` — the same loader interactive use runs — and
   * at each rung asks: is the target ITSELF here? Select it and stop. Otherwise
   * pick whichever item is an ancestor of the target and go deeper. The ladder
   * it produces is therefore identical to the one the seller would have built by
   * hand, whatever the backend's grouping does next.
   */
  resolveCascade: async (
    regionSlug: string,
  ): Promise<{ path: RegionPathEntry[]; steps: { step: RegionStep; selected: string }[] }> => {
    const path = await locationsService.getPath(regionSlug);
    const gov = path.find((p) => p.level === 'GOVERNORATE') ?? null;
    if (!gov || gov.slug === regionSlug) return { path, steps: [] };

    const ancestors = new Set(path.map((p) => p.slug));
    const steps: { step: RegionStep; selected: string }[] = [];
    let parent = gov.slug;

    for (let depth = 0; depth < MAX_SKIP_DEPTH; depth++) {
      const step = await locationsService.getStep(parent);
      const items = stepItems(step);
      if (!items.length) break;

      const exact = items.find((i) => i.slug === regionSlug);
      if (exact) {
        steps.push({ step, selected: exact.slug });
        break;
      }
      // Not on this rung — descend through whichever item leads to it.
      const next = items.find((i) => ancestors.has(i.slug));
      if (!next) break; // stale slug, or a branch the grouped view no longer shows
      steps.push({ step, selected: next.slug });
      parent = next.slug;
    }

    return { path, steps };
  },
};
